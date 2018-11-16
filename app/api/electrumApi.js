var config = require("./../config.js");
var coins = require("../coins.js");
var utils = require("../utils.js");

var coinConfig = coins[config.coin];

const ElectrumClient = require('electrum-client');

var electrumClients = [];

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
			console.log("Error 120387rygxx231gwe40: " + err);

			reject(err);
		});
	});
}

function reconnectToServers() {
	return new Promise(function(resolve, reject) {
		for (var i = 0; i < electrumClients.length; i++) {
			electrumClients[i].close();
		}

		electrumClients = [];

		console.log("Reconnecting ElectrumX sockets...");

		connectToServers().catch(function(err) {
			console.log("Error 317fh29y7fg3333: " + err);
			
		}).finally(function() {
			console.log("Done reconnecting ElectrumX sockets.");

			resolve();
		});
	});
}

function connectToServer(host, port, protocol) {
	return new Promise(function(resolve, reject) {
		console.log("Connecting to ElectrumX Server: " + host + ":" + port);

		// default protocol is 'tcp' if port is 50001, which is the default unencrypted port for electrumx
		var defaultProtocol = port === 50001 ? 'tcp' : 'tls';
		var electrumClient = new ElectrumClient(port, host, protocol || defaultProtocol);
		electrumClient.initElectrum({client:"btc-rpc-explorer-v1.1", version:"1.2"}).then(function(res) {
			console.log("Connected to ElectrumX Server: " + host + ":" + port + ", versions: " + res);

			electrumClients.push(electrumClient);

			resolve();

		}).catch(function(err) {
			console.log("Error 137rg023xx7gerfwdd: " + err + ", when trying to connect to ElectrumX server at " + host + ":" + port);

			reject(err);
		});
	});
	
}

function runOnServer(electrumClient, f) {
	return new Promise(function(resolve, reject) {
		f(electrumClient).then(function(result) {
			if (result.success) {
				resolve({result:result.response, server:electrumClient.host});

			} else {
				reject({error:result.error, server:electrumClient.host});
			}
		}).catch(function(err) {
			console.log("Error dif0e21qdh: " + err + ", host=" + electrumClient.host + ", port=" + electrumClient.port);

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

function getAddressTxids(addrScripthash) {
	return new Promise(function(resolve, reject) {
		runOnAllServers(function(electrumClient) {
			return electrumClient.blockchainScripthash_getHistory(addrScripthash);

		}).then(function(results) {
			if (addrScripthash == coinConfig.genesisCoinbaseOutputAddressScripthash) {
				for (var i = 0; i < results.length; i++) {
					results[i].result.unshift({tx_hash:coinConfig.genesisCoinbaseTransactionId, height:0});
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
			reject(err);
		});
	});
}

function getAddressBalance(addrScripthash) {
	return new Promise(function(resolve, reject) {
		runOnAllServers(function(electrumClient) {
			return electrumClient.blockchainScripthash_getBalance(addrScripthash);

		}).then(function(results) {
			if (addrScripthash == coinConfig.genesisCoinbaseOutputAddressScripthash) {
				for (var i = 0; i < results.length; i++) {
					var coinbaseBlockReward = coinConfig.blockRewardFunction(0);
					
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
			reject(err);
		});
	});
}

module.exports = {
	connectToServers: connectToServers,
	reconnectToServers: reconnectToServers,
	getAddressTxids: getAddressTxids,
	getAddressBalance: getAddressBalance
};