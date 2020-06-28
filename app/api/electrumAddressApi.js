var debug = require("debug");
var debugLog = debug("btcexp:electrumx");

var config = require("./../config.js");
var coins = require("../coins.js");
var utils = require("../utils.js");
var sha256 = require("crypto-js/sha256");
var hexEnc = require("crypto-js/enc-hex");
 
var coinConfig = coins[config.coin];

global.net = require('net');
global.tls = require('tls');

const ElectrumClient = require('rn-electrum-client');

var electrumClients = [];

global.electrumStats = {};


function connectToServers() {
	return new Promise(function(resolve, reject) {
		var promises = [];

		for (var i = 0; i < config.electrumXServers.length; i++) {
			var { host, port, protocol } = config.electrumXServers[i];
			promises.push(connectToServer(host, port, protocol));
		}

		Promise.all(promises).then(function() {
			resolve();

		}).catch(function(err) {
			utils.logError("120387rygxx231gwe40", err);

			reject(err);
		});
	});
}

function connectToServer(host, port, protocol) {
	return new Promise(function(resolve, reject) {
		debugLog("Connecting to ElectrumX Server: " + host + ":" + port);

		// default protocol is 'tcp' if port is 50001, which is the default unencrypted port for electrumx
		var defaultProtocol = port === 50001 ? 'tcp' : 'tls';

		var electrumClient = new ElectrumClient(port, host, protocol || defaultProtocol);
		electrumClient.initElectrum({client:"btc-rpc-explorer-v2", version:"1.4"}).then(function(res) {
			debugLog("Connected to ElectrumX Server: " + host + ":" + port + ", versions: " + JSON.stringify(res));

			electrumClients.push(electrumClient);

			resolve();

		}).catch(function(err) {
			utils.logError("137rg023xx7gerfwdd", err, {host:host, port:port, protocol:protocol});

			reject(err);
		});
	});
	
}

function runOnServer(electrumClient, f) {
	return new Promise(function(resolve, reject) {
		f(electrumClient).then(function(result) {
			resolve({result:result, server:electrumClient.host});
			
		}).catch(function(err) {
			utils.logError("dif0e21qdh", err, {host:electrumClient.host, port:electrumClient.port});

			reject(err);
		});
	});
}

function runOnAllServers(f) {
	return new Promise(function(resolve, reject) {
		var promises = [];

		for (var i = 0; i < electrumClients.length; i++) {
			promises.push(runOnServer(electrumClients[i], f));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(function(resolve, reject) {
		var addrScripthash = hexEnc.stringify(sha256(hexEnc.parse(scriptPubkey)));
		addrScripthash = addrScripthash.match(/.{2}/g).reverse().join("");

		var promises = [];

		var txidData = null;
		var balanceData = null;

		promises.push(new Promise(function(resolve2, reject2) {
			getAddressTxids(addrScripthash).then(function(result) {
				txidData = result.result;

				resolve2();

			}).catch(function(err) {
				err.userData = {address:address, sort:sort, limit:limit, offset:offset};

				utils.logError("2397wgs0sgse", err);

				reject2(err);
			});
		}));

		promises.push(new Promise(function(resolve2, reject2) {
			getAddressBalance(addrScripthash).then(function(result) {
				balanceData = result.result;

				resolve2();
				
			}).catch(function(err) {
				err.userData = {address:address, sort:sort, limit:limit, offset:offset};

				utils.logError("21307ws70sg", err);

				reject2(err);
			});
		}));

		Promise.all(promises.map(utils.reflectPromise)).then(function(results) {
			var addressDetails = {};

			if (txidData) {
				addressDetails.txCount = txidData.length;

				addressDetails.txids = [];
				addressDetails.blockHeightsByTxid = {};

				if (sort == "desc") {
					txidData.reverse();
				}

				for (var i = offset; i < Math.min(txidData.length, limit + offset); i++) {
					addressDetails.txids.push(txidData[i].tx_hash);
					addressDetails.blockHeightsByTxid[txidData[i].tx_hash] = txidData[i].height;
				}
			}

			if (balanceData) {
				addressDetails.balanceSat = balanceData.confirmed;
			}

			var errors = [];
			results.forEach(function(x) {
				if (x.status == "rejected") {
					errors.push(x);
				}
 			});

			resolve({addressDetails:addressDetails, errors:errors});
		});
	});
}

function getAddressTxids(addrScripthash) {
	return new Promise(function(resolve, reject) {
		var startTime = new Date().getTime();

		runOnAllServers(function(electrumClient) {
			return electrumClient.blockchainScripthash_getHistory(addrScripthash);

		}).then(function(results) {
			debugLog(`getAddressTxids=${utils.ellipsize(JSON.stringify(results), 200)}`);

			logStats("blockchainScripthash_getHistory", new Date().getTime() - startTime, true);

			if (addrScripthash == coinConfig.genesisCoinbaseOutputAddressScripthash) {
				for (var i = 0; i < results.length; i++) {
					results[i].result.unshift({tx_hash:coinConfig.genesisCoinbaseTransactionIdsByNetwork[global.activeBlockchain], height:0});
				}
			}

			var first = results[0];
			var done = false;

			for (var i = 1; i < results.length; i++) {
				if (results[i].length != first.length) {
					resolve({conflictedResults:results});

					done = true;
				}
			}

			if (!done) {
				resolve(results[0]);
			}
		}).catch(function(err) {
			logStats("blockchainScripthash_getHistory", new Date().getTime() - startTime, false);

			reject(err);
		});
	});
}

function getAddressBalance(addrScripthash) {
	return new Promise(function(resolve, reject) {
		var startTime = new Date().getTime();

		runOnAllServers(function(electrumClient) {
			return electrumClient.blockchainScripthash_getBalance(addrScripthash);

		}).then(function(results) {
			debugLog(`getAddressBalance=${JSON.stringify(results)}`);

			logStats("blockchainScripthash_getBalance", new Date().getTime() - startTime, true);

			if (addrScripthash == coinConfig.genesisCoinbaseOutputAddressScripthash) {
				for (var i = 0; i < results.length; i++) {
					var coinbaseBlockReward = coinConfig.blockRewardFunction(0, global.activeBlockchain);
					
					results[i].result.confirmed += (coinbaseBlockReward * coinConfig.baseCurrencyUnit.multiplier);
				}
			}

			var first = results[0];
			var done = false;

			for (var i = 1; i < results.length; i++) {
				if (results[i].confirmed != first.confirmed) {
					resolve({conflictedResults:results});

					done = true;
				}
			}

			if (!done) {
				resolve(results[0]);
			}
		}).catch(function(err) {
			logStats("blockchainScripthash_getBalance", new Date().getTime() - startTime, false);

			reject(err);
		});
	});
}

function logStats(cmd, dt, success) {
	if (!global.electrumStats[cmd]) {
		global.electrumStats[cmd] = {count:0, time:0, successes:0, failures:0};
	}

	global.electrumStats[cmd].count++;
	global.electrumStats[cmd].time += dt;

	if (success) {
		global.electrumStats[cmd].successes++;

	} else {
		global.electrumStats[cmd].failures++;
	}
}

module.exports = {
	connectToServers: connectToServers,
	getAddressDetails: getAddressDetails
};

