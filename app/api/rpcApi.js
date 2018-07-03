var utils = require("../utils.js");
var config = require("../config.js");
var coins = require("../coins.js");


function getBlockchainInfo() {
	return getRpcData("getblockchaininfo");
}

function getNetworkInfo() {
	return getRpcData("getnetworkinfo");
}

function getNetTotals() {
	return getRpcData("getnettotals");
}

function getMempoolInfo() {
	return getRpcData("getmempoolinfo");
}

function getUptimeSeconds() {
	return getRpcData("uptime");
}

function getRawMempool() {
	return getRpcDataWithParams("getrawmempool", true);
}

function getBlockByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getBlocksByHeight([blockHeight]).then(function(results) {
			if (results && results.length > 0) {
				resolve(results[0]);

			} else {
				resolve(null);
			}
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlocksByHeight(blockHeights) {
	console.log("getBlocksByHeight: " + blockHeights);

	return new Promise(function(resolve, reject) {
		var batch = [];
		for (var i = 0; i < blockHeights.length; i++) {
			batch.push({
				method: 'getblockhash',
				parameters: [ blockHeights[i] ]
			});
		}

		var blockHashes = [];
		client.command(batch).then((responses) => {
			responses.forEach((item) => {
				blockHashes.push(item);
			});

			if (blockHashes.length == batch.length) {
				getBlocksByHash(blockHashes).then(function(blocks) {
					resolve(blocks);
				});
			}
		});
	});
}

function getBlockByHash(blockHash) {
	return new Promise(function(resolve, reject) {
		getBlocksByHash([blockHash]).then(function(results) {
			if (results && results.length > 0) {
				resolve(results[0]);

			} else {
				resolve(null);
			}
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlocksByHash(blockHashes) {
	console.log("rpc.getBlocksByHash: " + blockHashes);

	return new Promise(function(resolve, reject) {
		var batch = [];
		for (var i = 0; i < blockHashes.length; i++) {
			batch.push({
				method: 'getblock',
				parameters: [ blockHashes[i] ]
			});
		}

		var blocks = [];
		client.command(batch).then((responses) => {
			responses.forEach((item) => {
				blocks.push(item);
			});

			var coinbaseTxids = [];
			for (var i = 0; i < blocks.length; i++) {
				coinbaseTxids.push(blocks[i].tx[0])
			}

			getRawTransactions(coinbaseTxids).then(function(coinbaseTxs) {
				for (var i = 0; i < blocks.length; i++) {
					blocks[i].coinbaseTx = coinbaseTxs[i];
					blocks[i].miner = utils.getMinerFromCoinbaseTx(coinbaseTxs[i]);
				}

				resolve(blocks);
			});
		});
	});
}

function getRawTransaction(txid) {
	return new Promise(function(resolve, reject) {
		getRawTransactions([txid]).then(function(results) {
			if (results && results.length > 0) {
				if (results[0].txid) {
					resolve(results[0]);

				} else {
					resolve(null);
				}
			} else {
				resolve(null);
			}
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getAddress(address) {
	return getRpcDataWithParams("validateaddress", address);
}

function getRawTransactions(txids) {
	console.log("getRawTransactions: " + txids);

	return new Promise(function(resolve, reject) {
		if (!txids || txids.length == 0) {
			resolve([]);

			return;
		}

		var requests = [];
		var promises = [];
		for (var i = 0; i < txids.length; i++) {
			var txid = txids[i];
			
			if (txid) {
				if (coins[config.coin].genesisCoinbaseTransactionId && txid == coins[config.coin].genesisCoinbaseTransactionId) {
					// copy the "confirmations" field from genesis block to the genesis-coinbase tx
					promises.push(new Promise(function(resolve2, reject2) {
						getBlockchainInfo().then(function(blockchainInfoResult) {
							var result = coins[config.coin].genesisCoinbaseTransaction;
							result.confirmations = blockchainInfoResult.blocks;

							resolve2([result]);

						}).catch(function(err) {
							reject2(err);
						});
					}));

				} else {
					requests.push({
						method: 'getrawtransaction',
						parameters: [ txid, 1 ]
					});
				}
			}
		}

		var requestBatches = utils.splitArrayIntoChunks(requests, 100);

		promises.push(new Promise(function(resolve2, reject2) {
			executeBatchesSequentially(requestBatches, function(results) {
				resolve2(results);
			});
		}));
		
		Promise.all(promises).then(function(results) {
			console.log(JSON.stringify(results));

			var finalResults = [];
			for (var i = 0; i < results.length; i++) {
				for (var j = 0; j < results[i].length; j++) {
					finalResults.push(results[i][j]);
				}
			}

			resolve(finalResults);
		});
	});
}

function getHelp() {
	return new Promise(function(resolve, reject) {
		client.command('help', function(err, result, resHeaders) {
			if (err) {
				console.log("Error 32907th429ghf: " + err);

				reject(err);

				return;
			}

			var lines = result.split("\n");
			var sections = [];

			lines.forEach(function(line) {
				if (line.startsWith("==")) {
					var sectionName = line.substring(2);
					sectionName = sectionName.substring(0, sectionName.length - 2).trim();

					sections.push({name:sectionName, methods:[]});

				} else if (line.trim().length > 0) {
					var methodName = line.trim();

					if (methodName.includes(" ")) {
						methodName = methodName.substring(0, methodName.indexOf(" "));
					}

					sections[sections.length - 1].methods.push({name:methodName, content:line.trim()});
				}
			});

			resolve(sections);
		});
	});
}

function getRpcMethodHelp(methodName) {
	return new Promise(function(resolve, reject) {
		client.command('help', methodName, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 237hwerf07wehg: " + err);

				reject(err);

				return;
			}

			var output = {};
			output.string = result;

			var str = result;

			var lines = str.split("\n");
			var argumentLines = [];
			var catchArgs = false;
			lines.forEach(function(line) {
				if (line.trim().length == 0) {
					catchArgs = false;
				}

				if (catchArgs) {
					argumentLines.push(line);
				}

				if (line.trim() == "Arguments:" || line.trim() == "Arguments") {
					catchArgs = true;
				}
			});

			var args = [];
			var argX = null;
			// looking for line starting with "N. " where N is an integer (1-2 digits)
			argumentLines.forEach(function(line) {
				var regex = /^([0-9]+)\.\s*"?(\w+)"?\s*\(([^,)]*),?\s*([^,)]*),?\s*([^,)]*),?\s*([^,)]*)?\s*\)\s*(.+)?$/;

				var match = regex.exec(line);

				if (match) {
					argX = {};
					argX.name = match[2];
					argX.detailsLines = [];

					argX.properties = [];

					if (match[3]) {
						argX.properties.push(match[3]);
					}

					if (match[4]) {
						argX.properties.push(match[4]);
					}

					if (match[5]) {
						argX.properties.push(match[5]);
					}

					if (match[6]) {
						argX.properties.push(match[6]);
					}

					if (match[7]) {
						argX.description = match[7];
					}

					args.push(argX);
				}

				if (!match && argX) {
					argX.detailsLines.push(line);
				}
			});

			output.args = args;

			resolve(output);
		});
	});
}



function getRpcData(cmd) {
	return new Promise(function(resolve, reject) {
		client.command(cmd, function(err, result, resHeaders) {
			if (err) {
				console.log("Error for RPC command '" + cmd + "': " + err);

				reject(err);

			} else {
				resolve(result);
			}
		});
	});
}

function getRpcDataWithParams(cmd, params) {
	return new Promise(function(resolve, reject) {
		client.command(cmd, params, function(err, result, resHeaders) {
			if (err) {
				console.log("Error for RPC command '" + cmd + "': " + err);

				reject(err);

			} else {
				resolve(result);
			}
		});
	});
}

function executeBatchesSequentially(batches, resultFunc) {
	var batchId = utils.getRandomString(20, 'aA#');

	console.log("Starting " + batches.length + "-item batch " + batchId + "...");

	executeBatchesSequentiallyInternal(batchId, batches, 0, [], resultFunc);
}

function executeBatchesSequentiallyInternal(batchId, batches, currentIndex, accumulatedResults, resultFunc) {
	if (currentIndex == batches.length) {
		console.log("Finishing batch " + batchId + "...");

		resultFunc(accumulatedResults);

		return;
	}

	console.log("Executing item #" + (currentIndex + 1) + " (of " + batches.length + ") for batch " + batchId);

	var count = batches[currentIndex].length;

	client.command(batches[currentIndex]).then(function(results) {
		results.forEach((item) => {
			accumulatedResults.push(item);

			count--;
		});

		if (count == 0) {
			executeBatchesSequentiallyInternal(batchId, batches, currentIndex + 1, accumulatedResults, resultFunc);
		}
	});
}


module.exports = {
	getBlockchainInfo: getBlockchainInfo,
	getNetworkInfo: getNetworkInfo,
	getNetTotals: getNetTotals,
	getMempoolInfo: getMempoolInfo,
	getBlockByHeight: getBlockByHeight,
	getBlocksByHeight: getBlocksByHeight,
	getBlockByHash: getBlockByHash,
	getRawTransaction: getRawTransaction,
	getRawTransactions: getRawTransactions,
	getRawMempool: getRawMempool,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress
};