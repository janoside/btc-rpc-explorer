var debug = require("debug")("coreApi");

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



function tryCacheThenRpcApi(cache, cacheKey, cacheMaxAge, rpcApiFunction, cacheConditionFunction) {
	//debug("tryCache: " + cacheKey + ", " + cacheMaxAge);
	if (cacheConditionFunction == null) {
		cacheConditionFunction = function(obj) {
			return true;
		};
	}

	return new Promise(function(resolve, reject) {
		var result = cache.get(cacheKey);
		if (result) {
			resolve(result);

		} else {
			rpcApiFunction().then(function(result) {
				if (result != null && cacheConditionFunction(result)) {
					cache.set(cacheKey, result, cacheMaxAge);
				}

				resolve(result);
			});
		}
	});
}

function shouldCacheTransaction(tx) {
	return (tx.confirmations > 0);
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

function getMiningInfo() {
	return tryCacheThenRpcApi(miscCache, "getMiningInfo", 1000, rpcApi.getMiningInfo);
}

function getUptimeSeconds() {
	return tryCacheThenRpcApi(miscCache, "getUptimeSeconds", 1000, rpcApi.getUptimeSeconds);
}

function getChainTxStats(blockCount) {
	return tryCacheThenRpcApi(miscCache, "getChainTxStats-" + blockCount, 120000, function() {
		return rpcApi.getChainTxStats(blockCount);
	});
}

function getTxCountStats(dataPtCount, blockStart, blockEnd) {
	return new Promise(function(resolve, reject) {
		var dataPoints = dataPtCount;

		getBlockchainInfo().then(function(getblockchaininfo) {
			if (typeof blockStart === "string") {
				if (["genesis", "first", "zero"].includes(blockStart)) {
					blockStart = 0;
				}
			}

			if (typeof blockEnd === "string") {
				if (["latest", "tip", "newest"].includes(blockEnd)) {
					blockEnd = getblockchaininfo.blocks;
				}
			}

			if (blockStart > blockEnd) {
				reject(`Error 37rhw0e7ufdsgf: blockStart (${blockStart}) > blockEnd (${blockEnd})`);

				return;
			}

			if (blockStart < 0) {
				blockStart += getblockchaininfo.blocks;
			}

			if (blockEnd < 0) {
				blockEnd += getblockchaininfo.blocks;
			}

			var chainTxStatsIntervals = [];
			for (var i = 0; i < dataPoints; i++) {
				chainTxStatsIntervals.push(parseInt(Math.max(10, getblockchaininfo.blocks - blockStart - i * (blockEnd - blockStart) / (dataPoints - 1) - 1)));
			}

			var promises = [];
			for (var i = 0; i < chainTxStatsIntervals.length; i++) {
				promises.push(getChainTxStats(chainTxStatsIntervals[i]));
			}

			Promise.all(promises).then(function(results) {
				var txStats = {
					txCounts: [],
					txLabels: [],
					txRates: []
				};

				for (var i = results.length - 1; i >= 0; i--) {
					if (results[i].window_tx_count) {
						txStats.txCounts.push( {x:(getblockchaininfo.blocks - results[i].window_block_count), y: (results[i].txcount - results[i].window_tx_count)} );
						txStats.txRates.push( {x:(getblockchaininfo.blocks - results[i].window_block_count), y: (results[i].txrate)} );
						txStats.txLabels.push(i);
					}
				}
				
				resolve({txCountStats:txStats, getblockchaininfo:getblockchaininfo, totalTxCount:results[0].txcount});

			}).catch(function(err) {
				reject(err);
			});
		});
	});
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

function getMempoolDetails(start, count) {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getRawMempool", 1000, rpcApi.getRawMempool).then(function(result) {
			var txids = [];
			var txidIndex = 0;
			for (var txid in result) {
				if (txidIndex >= start && (txidIndex < (start + count)))  {
					txids.push(txid);
				}

				txidIndex++;
			}

			getRawTransactions(txids).then(function(transactions) {
				var maxInputsTracked = config.site.txMaxInput;
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
						txInputsByTransaction[tx.txid] = {};

						if (tx && tx.vin) {
							for (var i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
								if (vinTxById[tx.vin[i].txid]) {
									txInputsByTransaction[tx.txid][i] = vinTxById[tx.vin[i].txid];
								}
							}
						}
					});

					resolve({ txCount:txidIndex, transactions:transactions, txInputsByTransaction:txInputsByTransaction });
				});
			});
		});
	});
}

function getMempoolStats() {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getRawMempool", 5000, rpcApi.getRawMempool).then(function(result) {
			var maxFee = 0;
			var maxFeePerByte = 0;
			var maxAge = 0;
			var maxSize = 0;
			var ages = [];
			var sizes = [];
			for (var txid in result) {
				var txMempoolInfo = result[txid];
				var fee = txMempoolInfo.modifiedfee;
				var feePerByte = txMempoolInfo.modifiedfee / txMempoolInfo.size;
				var age = Date.now() / 1000 - txMempoolInfo.time;
				var size = txMempoolInfo.size;

				if (fee > maxFee) {
					maxFee = txMempoolInfo.modifiedfee;
				}

				if (feePerByte > maxFeePerByte) {
					maxFeePerByte = txMempoolInfo.modifiedfee / txMempoolInfo.size;
				}

				ages.push({age:age, txid:txid});
				sizes.push({size:size, txid:txid});

				if (age > maxAge) {
					maxAge = age;
				}

				if (size > maxSize) {
					maxSize = size;
				}
			}

			ages.sort(function(a, b) {
				if (a.age != b.age) {
					return b.age - a.age;

				} else {
					return a.txid.localeCompare(b.txid);
				}
			});

			sizes.sort(function(a, b) {
				if (a.size != b.size) {
					return b.size - a.size;

				} else {
					return a.txid.localeCompare(b.txid);
				}
			});

			maxSize = 2000;

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

			var ageBucketCount = 100;
			var ageBucketTxCounts = [];
			var ageBucketLabels = [];

			var sizeBucketCount = 100;
			var sizeBucketTxCounts = [];
			var sizeBucketLabels = [];

			for (var i = 0; i < ageBucketCount; i++) {
				ageBucketTxCounts.push(0);
				ageBucketLabels.push(parseInt(i * maxAge / ageBucketCount) + " - " + parseInt((i + 1) * maxAge / ageBucketCount));
			}

			for (var i = 0; i < sizeBucketCount; i++) {
				sizeBucketTxCounts.push(0);

				if (i == sizeBucketCount - 1) {
					sizeBucketLabels.push(parseInt(i * maxSize / sizeBucketCount) + "+");

				} else {
					sizeBucketLabels.push(parseInt(i * maxSize / sizeBucketCount) + " - " + parseInt((i + 1) * maxSize / sizeBucketCount));
				}
			}

			satoshiPerByteBucketLabels[bucketCount - 1] = (satoshiPerByteBucketMaxima[satoshiPerByteBucketMaxima.length - 1] + "+");

			var summary = {
				"count":0,
				"totalFees":0,
				"totalBytes":0,
				"satoshiPerByteBuckets":satoshiPerByteBuckets,
				"satoshiPerByteBucketLabels":satoshiPerByteBucketLabels,
				"ageBucketTxCounts":ageBucketTxCounts,
				"ageBucketLabels":ageBucketLabels,
				"sizeBucketTxCounts":sizeBucketTxCounts,
				"sizeBucketLabels":sizeBucketLabels
			};

			for (var txid in result) {
				var txMempoolInfo = result[txid];
				var fee = txMempoolInfo.modifiedfee;
				var feePerByte = txMempoolInfo.modifiedfee / txMempoolInfo.size;
				var satoshiPerByte = feePerByte * 100000000;
				var age = Date.now() / 1000 - txMempoolInfo.time;
				var size = txMempoolInfo.size;

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

				var ageBucketIndex = Math.min(ageBucketCount - 1, parseInt(age / (maxAge / ageBucketCount)));
				var sizeBucketIndex = Math.min(sizeBucketCount - 1, parseInt(size / (maxSize / sizeBucketCount)));

				ageBucketTxCounts[ageBucketIndex]++;
				sizeBucketTxCounts[sizeBucketIndex]++;
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

			/*debug(JSON.stringify(ageBuckets));
			debug(JSON.stringify(ageBucketLabels));
			debug(JSON.stringify(sizeBuckets));
			debug(JSON.stringify(sizeBucketLabels));*/

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
	var rpcApiFunction = function() {
		return rpcApi.getRawTransaction(txid);
	};

	return tryCacheThenRpcApi(txCache, "getRawTransaction-" + txid, 3600000, rpcApiFunction, shouldCacheTransaction);
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

							if (shouldCacheTransaction(queriedTx)) {
								txCache.set("getRawTransaction-" + queriedTx.txid, queriedTx, 3600000);
							}
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

function getRawTransactionsWithInputs(txids, maxInputs=-1) {
	return new Promise(function(resolve, reject) {
		getRawTransactions(txids).then(function(transactions) {
			var maxInputsTracked = config.site.txMaxInput;
			
			if (maxInputs <= 0) {
				maxInputsTracked = 1000000;

			} else if (maxInputs > 0) {
				maxInputsTracked = maxInputs;
			}

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
					txInputsByTransaction[tx.txid] = {};

					if (tx && tx.vin) {
						for (var i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
							if (vinTxById[tx.vin[i].txid]) {
								txInputsByTransaction[tx.txid][i] = vinTxById[tx.vin[i].txid];
							}
						}
					}
				});

				resolve({ transactions:transactions, txInputsByTransaction:txInputsByTransaction });
			});
		});
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
					block.totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(block.coinbaseTx, block.height);
					block.miner = utils.getMinerFromCoinbaseTx(block.coinbaseTx);
				}

				// if we're on page 2, we don't really want it anymore...
				if (txOffset > 0) {
					transactions.shift();
				}

				var maxInputsTracked = config.site.txMaxInput;
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
						txInputsByTransaction[tx.txid] = {};

						if (tx && tx.vin) {
							for (var i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
								if (vinTxById[tx.vin[i].txid]) {
									txInputsByTransaction[tx.txid][i] = vinTxById[tx.vin[i].txid];
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
	getMiningInfo: getMiningInfo,
	getBlockByHeight: getBlockByHeight,
	getBlocksByHeight: getBlocksByHeight,
	getBlockByHash: getBlockByHash,
	getBlockByHashWithTransactions: getBlockByHashWithTransactions,
	getRawTransaction: getRawTransaction,
	getRawTransactions: getRawTransactions,
	getRawTransactionsWithInputs: getRawTransactionsWithInputs,
	getMempoolStats: getMempoolStats,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress,
	logCacheSizes: logCacheSizes,
	getPeerSummary: getPeerSummary,
	getChainTxStats: getChainTxStats,
	getMempoolDetails: getMempoolDetails,
	getTxCountStats: getTxCountStats
};