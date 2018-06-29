var LRU = require("lru-cache");

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
				console.log("qbs: " + queriedBlocks);
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

						combinedTxs.push(queriedTx);

						txCache.set("getRawTransaction-" + queriedTx.txid, queriedTx, 3600000);

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
	return tryCacheThenRpcApi(miscCache, "getBlockByHashWithTransactions-" + blockHash + "-" + txLimit + "-" + txOffset, 3600000, function() {
		return rpcApi.getBlockByHashWithTransactions(blockHash, txLimit, txOffset);
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