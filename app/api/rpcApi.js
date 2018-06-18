var utils = require("../utils.js");
var config = require("../config.js");
var coins = require("../coins.js");




function getGenesisBlockHash() {
	return coins[config.coin].genesisBlockHash;
}

function getGenesisCoinbaseTransactionId() {
	return coins[config.coin].genesisCoinbaseTransactionId;
}

function getRpcData(cmd) {
	return new Promise(function(resolve, reject) {
		client.command(cmd, function(err, result, resHeaders) {
			if (err) {
				console.log("Error for RPC command '" + cmd + "': " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

function getRpcDataWithParams(cmd, params) {
	return new Promise(function(resolve, reject) {
		client.command(cmd, params, function(err, result, resHeaders) {
			if (err) {
				console.log("Error for RPC command '" + cmd + "': " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

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

function getMempoolStats() {
	return new Promise(function(resolve, reject) {
		client.command('getrawmempool', true, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 428thwre0ufg: " + err);

				reject(err);

				return;
			}

			var maxFee = 0;
			var maxFeePerByte = 0;
			for (var txid in result) {
				var txMempoolInfo = result[txid];
				var fee = txMempoolInfo.modifiedfee;
				var feePerByte = txMempoolInfo.modifiedfee / txMempoolInfo.size;

				if (fee > maxFee) {
					maxFee = txMempoolInfo.modifiedfee;
				}

				if (feePerByte > maxFeePerByte) {
					maxFeePerByte = txMempoolInfo.modifiedfee / txMempoolInfo.size;
				}
			}

			var satoshiPerByteBucketMaxima = coins[config.coin].feeSatoshiPerByteBucketMaxima;
			var bucketCount = satoshiPerByteBucketMaxima.length + 1;

			var satoshiPerByteBuckets = [];
			var satoshiPerByteBucketLabels = [];

			satoshiPerByteBucketLabels[0] = ("[0 - " + satoshiPerByteBucketMaxima[0] + ")");
			for (var i = 0; i < bucketCount; i++) {
				satoshiPerByteBuckets[i] = {"count":0, "totalFees":0, "totalBytes":0};

				if (i > 0 && i < bucketCount - 1) {
					satoshiPerByteBucketLabels[i] = ("[" + satoshiPerByteBucketMaxima[i - 1] + " - " + satoshiPerByteBucketMaxima[i] + ")");
				}
			}

			satoshiPerByteBucketLabels[bucketCount - 1] = (satoshiPerByteBucketMaxima[satoshiPerByteBucketMaxima.length - 1] + "+");

			var summary = {
				"count":0,
				"totalFees":0,
				"totalBytes":0,
				"satoshiPerByteBuckets":satoshiPerByteBuckets,
				"satoshiPerByteBucketLabels":satoshiPerByteBucketLabels
			};

			for (var txid in result) {
				var txMempoolInfo = result[txid];
				var fee = txMempoolInfo.modifiedfee;
				var feePerByte = txMempoolInfo.modifiedfee / txMempoolInfo.size;
				var satoshiPerByte = feePerByte * 100000000;

				var addedToBucket = false;
				for (var i = 0; i < satoshiPerByteBucketMaxima.length; i++) {
					if (satoshiPerByteBucketMaxima[i] > satoshiPerByte) {
						satoshiPerByteBuckets[i]["count"]++;
						satoshiPerByteBuckets[i]["totalFees"] += fee;
						satoshiPerByteBuckets[i]["totalBytes"] += txMempoolInfo.size;

						addedToBucket = true;

						break;
					}
				}

				if (!addedToBucket) {
					satoshiPerByteBuckets[bucketCount - 1]["count"]++;
					satoshiPerByteBuckets[bucketCount - 1]["totalFees"] += fee;
					satoshiPerByteBuckets[bucketCount - 1]["totalBytes"] += txMempoolInfo.size;
				}

				summary["count"]++;
				summary["totalFees"] += txMempoolInfo.modifiedfee;
				summary["totalBytes"] += txMempoolInfo.size;
			}

			summary["averageFee"] = summary["totalFees"] / summary["count"];
			summary["averageFeePerByte"] = summary["totalFees"] / summary["totalBytes"];

			summary["satoshiPerByteBucketMaxima"] = satoshiPerByteBucketMaxima;
			summary["satoshiPerByteBucketCounts"] = [];
			summary["satoshiPerByteBucketTotalFees"] = [];

			for (var i = 0; i < bucketCount; i++) {
				summary["satoshiPerByteBucketCounts"].push(summary["satoshiPerByteBuckets"][i]["count"]);
				summary["satoshiPerByteBucketTotalFees"].push(summary["satoshiPerByteBuckets"][i]["totalFees"]);
			}

			resolve(summary);
		});
	});
}

function getBlockByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getBlocksByHeight([blockHeight]).then(function(results) {
			if (results && results.length > 0) {
				resolve({ success:true, getblock:results[0] });

			} else {
				resolve({ success:false });
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
					blocks[i].miner = getMinerFromCoinbaseTx(coinbaseTxs[i]);
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
				resolve(results[0]);

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

		if (coins[config.coin].genesisCoinbaseTransactionId) {
			if (txids.length == 1 && txids[0] == coins[config.coin].genesisCoinbaseTransactionId) {
				// copy the "confirmations" field from genesis block to the genesis-coinbase tx
				getBlockByHeight(0).then(function(blockZeroResult) {
					var result = coins[config.coin].genesisCoinbaseTransaction;
					result.confirmations = blockZeroResult.getblock.confirmations;

					resolve([result]);

				}).catch(function(err) {
					reject(err);

					return;
				});

				return;
			}
		}

		var requests = [];
		for (var i = 0; i < txids.length; i++) {
			var txid = txids[i];
			
			if (txid) {
				requests.push({
					method: 'getrawtransaction',
					parameters: [ txid, 1 ]
				});
			}
		}

		var requestBatches = utils.splitArrayIntoChunks(requests, 100);

		executeBatchesSequentially(requestBatches, function(results) {
			resolve(results);
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

function getMinerFromCoinbaseTx(tx) {
	if (global.miningPoolsConfig) {
		for (var coinbaseTag in global.miningPoolsConfig.coinbase_tags) {
			if (global.miningPoolsConfig.coinbase_tags.hasOwnProperty(coinbaseTag)) {
				if (utils.hex2ascii(tx.vin[0].coinbase).indexOf(coinbaseTag) != -1) {
					return global.miningPoolsConfig.coinbase_tags[coinbaseTag];
				}
			}
		}

		for (var payoutAddress in global.miningPoolsConfig.payout_addresses) {
			if (global.miningPoolsConfig.payout_addresses.hasOwnProperty(payoutAddress)) {
				return global.miningPoolsConfig.payout_addresses[payoutAddress];
			}
		}
	}

	return null;
}

function getBlockByHashWithTransactions(blockHash, txLimit, txOffset) {
	console.log("getBlockByHashWithTransactions: " + blockHash);

	return new Promise(function(resolve, reject) {
		client.command('getblock', blockHash, function(errGetblock, resultGetblock, resHeadersGetblock) {
			if (errGetblock) {
				console.log("Error 3017hfwe0f: " + errGetblock);

				reject(errGetblock);

				return;
			}

			var txids = [];

			// make sure we have the coinbase transaction since it can indicate
			// "block" info that we might want to display (miner)
			if (txOffset > 0) {
				txids.push(resultGetblock.tx[0]);
			}

			for (var i = txOffset; i < Math.min(txOffset + txLimit, resultGetblock.tx.length); i++) {
				txids.push(resultGetblock.tx[i]);
			}

			var maxInputsTracked = 10;
			getRawTransactions(txids).then(function(transactions) {
				var txInputsByTransaction = {};

				// even if we're on "page 2" of transactions we pull the coinbase
				// tx first so that we can store it
				resultGetblock.coinbaseTx = transactions[0];
				resultGetblock.miner = getMinerFromCoinbaseTx(transactions[0]);

				// if we're on page 2, we don't really want it anymore...
				if (txOffset > 0) {
					transactions.shift();
				}

				var vinTxids = [];
				var promises = [];
				for (var i = 0; i < transactions.length; i++) {
					var transaction = transactions[i];

					if (transaction) {
						//console.log("xyz: " + JSON.stringify(transaction.vin));

						for (var j = 0; j < Math.min(maxInputsTracked, transaction.vin.length); j++) {
							if (transaction.vin[j].txid) {
								vinTxids.push(transaction.vin[j].txid);
							}
						}
					}
				}

				getRawTransactions(vinTxids).then(function(vinTransactions) {
					var vinTxById = {};

					vinTransactions.forEach(function(tx) {
						vinTxById[tx.txid] = tx;
					});

					transactions.forEach(function(tx) {
						txInputsByTransaction[tx.txid] = [];

						for (var i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
							if (vinTxById[tx.vin[i].txid]) {
								txInputsByTransaction[tx.txid].push(vinTxById[tx.vin[i].txid]);
							}
						}

						resolve({ getblock:resultGetblock, transactions:transactions, txInputsByTransaction:txInputsByTransaction });
					});
				});
			});
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

module.exports = {
	getGenesisBlockHash: getGenesisBlockHash,
	getGenesisCoinbaseTransactionId: getGenesisCoinbaseTransactionId,
	getBlockchainInfo: getBlockchainInfo,
	getNetworkInfo: getNetworkInfo,
	getNetTotals: getNetTotals,
	getMempoolInfo: getMempoolInfo,
	getBlockByHeight: getBlockByHeight,
	getBlocksByHeight: getBlocksByHeight,
	getBlockByHash: getBlockByHash,
	getBlockByHashWithTransactions: getBlockByHashWithTransactions,
	getRawTransaction: getRawTransaction,
	getRawTransactions: getRawTransactions,
	getMempoolStats: getMempoolStats,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress
};