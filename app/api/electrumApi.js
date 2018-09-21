var config = require("./../config.js");
var coins = require("../coins.js");
var utils = require("../utils.js");

var coinConfig = coins[config.coin];

const ElectrumClient = require('electrum-client');

var electrumClients = [];

function connectToServers() {
	for (var i = 0; i < config.electrumXServers.length; i++) {
		connectToServer(config.electrumXServers[i].host, config.electrumXServers[i].port);
	}
}

function connectToServer(host, port) {
	console.log("Connecting to ElectrumX Server: " + host + ":" + port);

	var electrumClient = new ElectrumClient(port, host, 'tls');
	electrumClient.connect().then(function() {
		electrumClient.server_version("btc-rpc-explorer-1.1", "1.2").then(function(res) {
			console.log("Connected to ElectrumX Server: " + host + ":" + port + ", versions: " + res);

			electrumClients.push(electrumClient);
		});
	});
}

function runOnServer(electrumClient, f) {
	return new Promise(function(resolve, reject) {
		f(electrumClient).then(function(result) {
			resolve({result:result, server:electrumClient.host});

		}).catch(function(err) {
			console.log("Error dif0e21qdh: " + JSON.stringify(err) + ", host=" + electrumClient.host + ", port=" + electrumClient.port);
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
	getAddressTxids: getAddressTxids,
	getAddressBalance: getAddressBalance
};