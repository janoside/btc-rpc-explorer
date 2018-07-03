var LRU = require("lru-cache");
var fs = require('fs');

var utils = require("../utils.js");
var config = require("../config.js");
var coins = require("../coins.js");

// choose one of the below: RPC to a node, or mock data while testing
var rpcApi = require("./rpcApi.js");
//var rpcApi = require("./mockApi.js");

var miscCache = LRU(50);
var blockCache = LRU(50);
var txCache = LRU(200);



function getGenesisBlockHash() {
	return coins[config.coin].genesisBlockHash;
}

function getGenesisCoinbaseTransactionId() {
	return coins[config.coin].genesisCoinbaseTransactionId;
}



function tryCacheThenRpcApi(cache, cacheKey, cacheMaxAge, rpcApiFunction) {
	console.log("tryCache: " + cacheKey + ", " + cacheMaxAge);

	return new Promise(function(resolve, reject) {
		var result = cache.get(cacheKey);
		if (result) {
			resolve(result);

		} else {
			rpcApiFunction().then(function(result) {
				if (result) {
					cache.set(cacheKey, result, cacheMaxAge);

					resolve(result);

				} else {
					resolve(result);
				}
			});
		}
	});
}



function getBlockchainInfo() {
	return tryCacheThenRpcApi(miscCache, "getBlockchainInfo", 10000, rpcApi.getBlockchainInfo);
}

function getNetworkInfo() {
	return tryCacheThenRpcApi(miscCache, "getNetworkInfo", 10000, rpcApi.getNetworkInfo);
}

function getNetTotals() {
	return tryCacheThenRpcApi(miscCache, "getNetTotals", 10000, rpcApi.getNetTotals);
}

function getMempoolInfo() {
	return tryCacheThenRpcApi(miscCache, "getMempoolInfo", 1000, rpcApi.getMempoolInfo);
}

function getUptimeSeconds() {
	return tryCacheThenRpcApi(miscCache, "getUptimeSeconds", 1000, rpcApi.getUptimeSeconds);
}

function getPeerSummary() {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getpeerinfo", 1000, rpcApi.getPeerInfo).then(function(getpeerinfo) {
			var result = {};
			result.getpeerinfo = getpeerinfo;

			var versionSummaryMap = {};
			for (var i = 0; i < getpeerinfo.length; i++) {
				var x = getpeerinfo[i];

				if (versionSummaryMap[x.subver] == null) {
					versionSummaryMap[x.subver] = 0;
				}

				versionSummaryMap[x.subver]++;
			}

			var versionSummary = [];
			for (var prop in versionSummaryMap) {
				if (versionSummaryMap.hasOwnProperty(prop)) {
					versionSummary.push([prop, versionSummaryMap[prop]]);
				}
			}

			versionSummary.sort(function(a, b) {
				if (b[1] > a[1]) {
					return 1;

				} else if (b[1] < a[1]) {
					return -1;

				} else {
					return a[0].localeCompare(b[0]);
				}
			});



			var servicesSummaryMap = {};
			for (var i = 0; i < getpeerinfo.length; i++) {
				var x = getpeerinfo[i];

				if (servicesSummaryMap[x.services] == null) {
					servicesSummaryMap[x.services] = 0;
				}

				servicesSummaryMap[x.services]++;
			}

			var servicesSummary = [];
			for (var prop in servicesSummaryMap) {
				if (servicesSummaryMap.hasOwnProperty(prop)) {
					servicesSummary.push([prop, servicesSummaryMap[prop]]);
				}
			}

			servicesSummary.sort(function(a, b) {
				if (b[1] > a[1]) {
					return 1;

				} else if (b[1] < a[1]) {
					return -1;

				} else {
					return a[0].localeCompare(b[0]);
				}
			});



			result.versionSummary = versionSummary;
			result.servicesSummary = servicesSummary;

			resolve(result);
		});
	});
}

function getMempoolStats() {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getRawMempool", 5000, rpcApi.getRawMempool).then(function(result) {
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
	return tryCacheThenRpcApi(blockCache, "getBlockByHeight-" + blockHeight, 3600000, function() {
		return rpcApi.getBlockByHeight(blockHeight);
	});
}

function getBlocksByHeight(blockHeights) {
	var blockHeightsNotInCache = [];
	var blocksByIndex = {};

	for (var i = 0; i < blockHeights.length; i++) {
		var blockI = blockCache.get("getBlockByHeight-" + blockHeights[i]);
		if (blockI == null) {
			blockHeightsNotInCache.push(blockHeights[i]);

		} else {
			blocksByIndex[i] = blockI;
		}
	}

	return new Promise(function(resolve, reject) {
		var combinedBlocks = [];
		if (blockHeightsNotInCache.length > 0) {
			rpcApi.getBlocksByHeight(blockHeightsNotInCache).then(function(queriedBlocks) {
				var queriedBlocksCurrentIndex = 0;
				for (var i = 0; i < blockHeights.length; i++) {
					if (blocksByIndex.hasOwnProperty(i)) {
						combinedBlocks.push(blocksByIndex[i]);

					} else {
						var queriedBlock = queriedBlocks[queriedBlocksCurrentIndex];
						console.log("queriedBlock: " + queriedBlock);

						combinedBlocks.push(queriedBlock);

						blockCache.set("getBlockByHeight-" + queriedBlock.height, queriedBlock, 3600000);

						queriedBlocksCurrentIndex++;
					}
				}

				resolve(combinedBlocks);
			}).catch(function(err) {
				console.log("Error 39g2rfyewgf: " + err);
			});
		} else {
			for (var i = 0; i < blockHeights.length; i++) {
				combinedBlocks.push(blocksByIndex[i]);
			}

			resolve(combinedBlocks);
		}
	});
}

function getBlockByHash(blockHash) {
	return tryCacheThenRpcApi(blockCache, "getBlockByHash-" + blockHash, 3600000, function() {
		return rpcApi.getBlockByHash(blockHash);
	});
}

function getBlocksByHash(blockHashes) {
	var blockHashesNotInCache = [];
	var blocksByIndex = {};

	for (var i = 0; i < blockHashes.length; i++) {
		var blockI = blockCache.get("getBlockByHash-" + blockHashes[i]);
		if (blockI == null) {
			blockHashesNotInCache.push(blockHashes[i]);

		} else {
			blocksByIndex[i] = blockI;
		}
	}

	return new Promise(function(resolve, reject) {
		var combinedBlocks = [];
		if (blockHashesNotInCache.length > 0) {
			rpcApi.getBlocksByHash(blockHashesNotInCache).then(function(queriedBlocks) {
				var queriedBlocksCurrentIndex = 0;
				for (var i = 0; i < blockHashes.length; i++) {
					if (blocksByIndex.hasOwnProperty(i)) {
						combinedBlocks.push(blocksByIndex[i]);

					} else {
						var queriedBlock = queriedBlocks[queriedBlocksCurrentIndex];

						combinedBlocks.push(queriedBlock);

						blockCache.set("getBlockByHash-" + queriedBlock.hash, queriedBlock, 3600000);

						queriedBlocksCurrentIndex++;
					}
				}

				resolve(combinedBlocks);
			});
		} else {
			for (var i = 0; i < blockHeights.length; i++) {
				combinedBlocks.push(blocksByIndex[i]);
			}

			resolve(combinedBlocks);
		}
	});
}

function getRawTransaction(txid) {
	return tryCacheThenRpcApi(txCache, "getRawTransaction-" + txid, 3600000, function() {
		return rpcApi.getRawTransaction(txid);
	});
}

function getAddress(address) {
	return tryCacheThenRpcApi(miscCache, "getAddress-" + address, 3600000, function() {
		return rpcApi.getAddress(address);
	});
}

function getRawTransactions(txids) {
	var txidsNotInCache = [];
	var txsByIndex = {};

	for (var i = 0; i < txids.length; i++) {
		var txI = txCache.get("getRawTransaction-" + txids[i]);
		if (txI == null) {
			txidsNotInCache.push(txids[i]);

		} else {
			txsByIndex[i] = txI;
		}
	}

	return new Promise(function(resolve, reject) {
		var combinedTxs = [];
		if (txidsNotInCache.length > 0) {
			rpcApi.getRawTransactions(txidsNotInCache).then(function(queriedTxs) {
				var queriedTxsCurrentIndex = 0;
				for (var i = 0; i < txids.length; i++) {
					if (txsByIndex.hasOwnProperty(i)) {
						combinedTxs.push(txsByIndex[i]);

					} else {
						var queriedTx = queriedTxs[queriedTxsCurrentIndex];
						if (queriedTx != null) {
							combinedTxs.push(queriedTx);

							txCache.set("getRawTransaction-" + queriedTx.txid, queriedTx, 3600000);
						}

						queriedTxsCurrentIndex++;
					}
				}

				resolve(combinedTxs);
			});
		} else {
			for (var i = 0; i < txids.length; i++) {
				combinedTxs.push(txsByIndex[i]);
			}

			resolve(combinedTxs);
		}
	});
}

function getBlockByHashWithTransactions(blockHash, txLimit, txOffset) {
	return new Promise(function(resolve, reject) {
		getBlockByHash(blockHash).then(function(block) {
			var txids = [];
			
			if (txOffset > 0) {
				txids.push(block.tx[0]);
			}

			for (var i = txOffset; i < (txOffset + txLimit); i++) {
				txids.push(block.tx[i]);
			}

			getRawTransactions(txids).then(function(transactions) {
				if (transactions.length == txids.length) {
					block.coinbaseTx = transactions[0];
					block.miner = utils.getMinerFromCoinbaseTx(block.coinbaseTx);
				}

				// if we're on page 2, we don't really want it anymore...
				if (txOffset > 0) {
					transactions.shift();
				}

				var maxInputsTracked = 10;
				var vinTxids = [];
				for (var i = 0; i < transactions.length; i++) {
					var transaction = transactions[i];

					if (transaction && transaction.vin) {
						for (var j = 0; j < Math.min(maxInputsTracked, transaction.vin.length); j++) {
							if (transaction.vin[j].txid) {
								vinTxids.push(transaction.vin[j].txid);
							}
						}
					}
				}

				var txInputsByTransaction = {};
				getRawTransactions(vinTxids).then(function(vinTransactions) {
					var vinTxById = {};

					vinTransactions.forEach(function(tx) {
						vinTxById[tx.txid] = tx;
					});

					transactions.forEach(function(tx) {
						txInputsByTransaction[tx.txid] = [];

						if (tx && tx.vin) {
							for (var i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
								if (vinTxById[tx.vin[i].txid]) {
									txInputsByTransaction[tx.txid].push(vinTxById[tx.vin[i].txid]);
								}
							}
						}

						resolve({ getblock:block, transactions:transactions, txInputsByTransaction:txInputsByTransaction });
					});
				});
			});
		});
	});
}

function getHelp() {
	return tryCacheThenRpcApi(miscCache, "getHelp", 3600000, function() {
		return rpcApi.getHelp();
	});
}

function getRpcMethodHelp(methodName) {
	return tryCacheThenRpcApi(miscCache, "getHelp-" + methodName, 3600000, function() {
		return rpcApi.getRpcMethodHelp(methodName);
	});
}

function logCacheSizes() {
	var itemCounts = [ miscCache.itemCount, blockCache.itemCount, txCache.itemCount ];
	
	var stream = fs.createWriteStream("memoryUsage.csv", {flags:'a'});
	stream.write("itemCounts: " + JSON.stringify(itemCounts) + "\n");
	stream.end();
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
	getAddress: getAddress,
	logCacheSizes: logCacheSizes,
	getPeerSummary: getPeerSummary
};