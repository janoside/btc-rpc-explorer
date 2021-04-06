"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:core");

const fs = require('fs');

const utils = require("../utils.js");
const redisCache = require("../redisCache.js");
const cacheUtils = require("../cacheUtils.js");
const config = require("../config.js");
const coins = require("../coins.js");
const Decimal = require("decimal.js");
const md5 = require("md5");
const statTracker = require("../statTracker.js");
const async = require("async");

// choose one of the below: RPC to a node, or mock data while testing
const rpcApi = require("./rpcApi.js");
//var rpcApi = require("./mockApi.js");


// this value should be incremented whenever data format changes, to avoid
// pulling old-format data from a persistent cache
const cacheKeyVersion = "v1";


const ONE_SEC = 1000;
const ONE_MIN = 60 * ONE_SEC;
const ONE_HR = 60 * ONE_MIN;
const FIFTEEN_MIN = 15 * ONE_MIN;
const ONE_DAY = 24 * ONE_HR;
const ONE_YR = 365 * ONE_DAY;








const miscCaches = [];
const blockCaches = [];
const txCaches = [];
const miningSummaryCaches = [];

global.miscLruCache = cacheUtils.lruCache(config.slowDeviceMode ? 200 : 1000);
global.blockLruCache = cacheUtils.lruCache(config.slowDeviceMode ? 200 : 1000);
global.txLruCache = cacheUtils.lruCache(config.slowDeviceMode ? 200 : 1000);
global.miningSummaryLruCache = cacheUtils.lruCache(config.slowDeviceMode ? 500 : 4500);

global.lruCaches = [ global.miscLruCache, global.blockLruCache, global.txLruCache, global.miningSummaryLruCache ];

(function () {
	let pruneCaches = function() {
		let totalLengthBefore = 0;
		global.lruCaches.forEach(x => (totalLengthBefore += x.length));

		global.lruCaches.forEach(x => x.prune());

		let totalLengthAfter = 0;
		global.lruCaches.forEach(x => (totalLengthAfter += x.length));


		statTracker.trackEvent("caches.pruned-items", (totalLengthBefore - totalLengthAfter));
		
		statTracker.trackValue("caches.misc.length", global.miscLruCache.length);
		statTracker.trackValue("caches.misc.itemCount", global.miscLruCache.itemCount);

		statTracker.trackValue("caches.block.length", global.blockLruCache.length);
		statTracker.trackValue("caches.block.itemCount", global.blockLruCache.itemCount);

		statTracker.trackValue("caches.tx.length", global.txLruCache.length);
		statTracker.trackValue("caches.tx.itemCount", global.txLruCache.itemCount);

		statTracker.trackValue("caches.mining.length", global.miningSummaryLruCache.length);
		statTracker.trackValue("caches.mining.itemCount", global.miningSummaryLruCache.itemCount);


		debugLog(`Pruned caches: ${totalLengthBefore.toLocaleString()} -> ${totalLengthAfter.toLocaleString()}`);
	};

	setInterval(pruneCaches, 60000);
})();

if (!config.noInmemoryRpcCache) {
	global.cacheStats.memory = {
		try: 0,
		hit: 0,
		miss: 0
	};

	var onMemoryCacheEvent = function(cacheType, eventType, cacheKey) {
		global.cacheStats.memory[eventType]++;
		statTracker.trackEvent(`caches.memory.${eventType}`);
		//debugLog(`cache.${cacheType}.${eventType}: ${cacheKey}`);
	}

	miscCaches.push(cacheUtils.createMemoryLruCache(global.miscLruCache, onMemoryCacheEvent));
	blockCaches.push(cacheUtils.createMemoryLruCache(global.blockLruCache, onMemoryCacheEvent));
	txCaches.push(cacheUtils.createMemoryLruCache(global.txLruCache, onMemoryCacheEvent));
	miningSummaryCaches.push(cacheUtils.createMemoryLruCache(global.miningSummaryLruCache, onMemoryCacheEvent));
}

if (redisCache.active) {
	global.cacheStats.redis = {
		try: 0,
		hit: 0,
		miss: 0,
		error: 0
	};

	var onRedisCacheEvent = function(cacheType, eventType, cacheKey) {
		global.cacheStats.redis[eventType]++;
		statTracker.trackEvent(`caches.redis.${eventType}`);
		//debugLog(`cache.${cacheType}.${eventType}: ${cacheKey}`);
	}

	// md5 of the active RPC credentials serves as part of the key; this enables
	// multiple instances of btc-rpc-explorer (eg mainnet + testnet) to share
	// a single redis instance peacefully
	var rpcHostPort = `${config.credentials.rpc.host}:${config.credentials.rpc.port}`;
	var rpcCredKeyComponent = md5(JSON.stringify(config.credentials.rpc)).substring(0, 8);
	
	var redisCacheObj = redisCache.createCache(`${cacheKeyVersion}-${rpcCredKeyComponent}`, onRedisCacheEvent);

	miscCaches.push(redisCacheObj);
	blockCaches.push(redisCacheObj);
	txCaches.push(redisCacheObj);
	miningSummaryCaches.push(redisCacheObj);
}

const miscCache = cacheUtils.createTieredCache(miscCaches);
const blockCache = cacheUtils.createTieredCache(blockCaches);
const txCache = cacheUtils.createTieredCache(txCaches);
const miningSummaryCache = cacheUtils.createTieredCache(miningSummaryCaches);




function getGenesisBlockHash() {
	return coins[config.coin].genesisBlockHashesByNetwork[global.activeBlockchain];
}

function getGenesisCoinbaseTransactionId() {
	return coins[config.coin].genesisCoinbaseTransactionIdsByNetwork[global.activeBlockchain];
}



function tryCacheThenRpcApi(cache, cacheKey, cacheMaxAge, rpcApiFunction, cacheConditionFunction) {
	//debugLog("tryCache: " + versionedCacheKey + ", " + cacheMaxAge);
	
	if (cacheConditionFunction == null) {
		cacheConditionFunction = function(obj) {
			return true;
		};
	}

	return new Promise(function(resolve, reject) {
		var cacheResult = null;

		var finallyFunc = function() {
			if (cacheResult != null) {
				resolve(cacheResult);

			} else {
				rpcApiFunction().then(function(rpcResult) {
					if (rpcResult != null && cacheConditionFunction(rpcResult)) {
						cache.set(cacheKey, rpcResult, cacheMaxAge);
					}

					resolve(rpcResult);

				}).catch(function(err) {
					reject(err);
				});
			}
		};

		cache.get(cacheKey).then(function(result) {
			cacheResult = result;

			finallyFunc();
			
		}).catch(function(err) {
			utils.logError("nds9fc2eg621tf3", err, {cacheKey:cacheKey});

			finallyFunc();
		});
	});
}

function shouldCacheTransaction(tx) {
	if (!tx.confirmations) {
		return false;
	}
	
	if (tx.confirmations < 1) {
		return false;
	}

	if (tx.vin != null && tx.vin.length > 5) {
		return false;
	}

	if (tx.vout != null && tx.vout.length > 5) {
		return false;
	}

	return true;
}



function getBlockchainInfo() {
	return tryCacheThenRpcApi(miscCache, "getBlockchainInfo", 10 * ONE_SEC, rpcApi.getBlockchainInfo);
}

function getNetworkInfo() {
	return tryCacheThenRpcApi(miscCache, "getNetworkInfo", 10 * ONE_SEC, rpcApi.getNetworkInfo);
}

function getNetTotals() {
	return tryCacheThenRpcApi(miscCache, "getNetTotals", 10 * ONE_SEC, rpcApi.getNetTotals);
}

function getMempoolInfo() {
	return tryCacheThenRpcApi(miscCache, "getMempoolInfo", 5 * ONE_SEC, rpcApi.getMempoolInfo);
}

function getIndexInfo() {
	return tryCacheThenRpcApi(miscCache, "getIndexInfo", 10 * ONE_SEC, rpcApi.getIndexInfo);
}

function getAllMempoolTxids() {
	// no caching, that would be dumb
	return rpcApi.getAllMempoolTxids();
}

function getMiningInfo() {
	return tryCacheThenRpcApi(miscCache, "getMiningInfo", 30 * ONE_SEC, rpcApi.getMiningInfo);
}

function getUptimeSeconds() {
	return tryCacheThenRpcApi(miscCache, "getUptimeSeconds", ONE_SEC, rpcApi.getUptimeSeconds);
}

function getChainTxStats(blockCount) {
	return tryCacheThenRpcApi(miscCache, "getChainTxStats-" + blockCount, FIFTEEN_MIN, function() {
		return rpcApi.getChainTxStats(blockCount);
	});
}

function getNetworkHashrate(blockCount) {
	return tryCacheThenRpcApi(miscCache, "getNetworkHashrate-" + blockCount, FIFTEEN_MIN, function() {
		return rpcApi.getNetworkHashrate(blockCount);
	});
}

function getBlockStats(hash) {
	return tryCacheThenRpcApi(miscCache, "getBlockStats-" + hash, FIFTEEN_MIN, function() {
		return rpcApi.getBlockStats(hash);
	});
}

function getBlockStatsByHeight(height) {
	return tryCacheThenRpcApi(miscCache, "getBlockStatsByHeight-" + height, FIFTEEN_MIN, function() {
		return rpcApi.getBlockStatsByHeight(height);
	});
}

function getUtxoSetSummary() {
	return tryCacheThenRpcApi(miscCache, "getUtxoSetSummary", FIFTEEN_MIN, rpcApi.getUtxoSetSummary);
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
				if (results[0].name == "RpcError" && results[0].code == -8) {
					// recently started node - no meaningful data to return
					resolve(null);

					return;
				}

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

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getSmartFeeEstimates(mode, confTargetBlockCounts) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		for (var i = 0; i < confTargetBlockCounts.length; i++) {
			promises.push(getSmartFeeEstimate(mode, confTargetBlockCounts[i]));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getSmartFeeEstimate(mode, confTargetBlockCount) {
	return tryCacheThenRpcApi(miscCache, "getSmartFeeEstimate-" + mode + "-" + confTargetBlockCount, 5 * ONE_MIN, function() {
		return rpcApi.getSmartFeeEstimate(mode, confTargetBlockCount);
	});
}

function getPeerSummary() {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getpeerinfo", ONE_SEC, rpcApi.getPeerInfo).then(function(getpeerinfo) {
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



			if (getpeerinfo.length > 0 && getpeerinfo[0].connection_type) {
				var connectionTypeSummaryMap = {};
				for (var i = 0; i < getpeerinfo.length; i++) {
					var x = getpeerinfo[i];

					if (connectionTypeSummaryMap[x.connection_type] == null) {
						connectionTypeSummaryMap[x.connection_type] = 0;
					}

					connectionTypeSummaryMap[x.connection_type]++;
				}

				var connectionTypeSummary = [];
				for (var prop in connectionTypeSummaryMap) {
					if (connectionTypeSummaryMap.hasOwnProperty(prop)) {
						connectionTypeSummary.push([prop, connectionTypeSummaryMap[prop]]);
					}
				}

				connectionTypeSummary.sort(function(a, b) {
					if (b[1] > a[1]) {
						return 1;

					} else if (b[1] < a[1]) {
						return -1;

					} else {
						return a[0].localeCompare(b[0]);
					}
				});

				result.connectionTypeSummary = connectionTypeSummary;
			}


			if (getpeerinfo.length > 0 && getpeerinfo[0].network) {
				var networkTypeSummaryMap = {};
				for (var i = 0; i < getpeerinfo.length; i++) {
					var x = getpeerinfo[i];

					if (networkTypeSummaryMap[x.network] == null) {
						networkTypeSummaryMap[x.network] = 0;
					}

					networkTypeSummaryMap[x.network]++;
				}

				var networkTypeSummary = [];
				for (var prop in networkTypeSummaryMap) {
					if (networkTypeSummaryMap.hasOwnProperty(prop)) {
						networkTypeSummary.push([prop, networkTypeSummaryMap[prop]]);
					}
				}

				networkTypeSummary.sort(function(a, b) {
					if (b[1] > a[1]) {
						return 1;

					} else if (b[1] < a[1]) {
						return -1;

					} else {
						return a[0].localeCompare(b[0]);
					}
				});

				result.networkTypeSummary = networkTypeSummary;
			}
			



			result.versionSummary = versionSummary;
			result.servicesSummary = servicesSummary;

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getMempoolTxids(limit, offset) {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getMempoolTxids", ONE_SEC, rpcApi.getAllMempoolTxids).then(function(resultTxids) {
			var txids = [];

			for (var i = offset; (i < resultTxids.length && i < (offset + limit)); i++) {
				txids.push(resultTxids[i]);
			}

			resolve({ txCount:resultTxids.length, txids:txids });

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockByHeight(blockHeight) {
	return tryCacheThenRpcApi(blockCache, "getBlockByHeight-" + blockHeight, FIFTEEN_MIN, function() {
		return rpcApi.getBlockByHeight(blockHeight);
	});
}

function getBlockHashByHeight(blockHeight) {
	return tryCacheThenRpcApi(blockCache, "getBlockHashByHeight-" + blockHeight, ONE_HR, function() {
		return rpcApi.getBlockHashByHeight(blockHeight);
	});
}

function getBlocksByHeight(blockHeights) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		for (var i = 0; i < blockHeights.length; i++) {
			promises.push(getBlockByHeight(blockHeights[i]));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockHeaderByHeight(blockHeight) {
	return tryCacheThenRpcApi(blockCache, "getBlockHeaderByHeight-" + blockHeight, FIFTEEN_MIN, function() {
		return rpcApi.getBlockHeaderByHeight(blockHeight);
	});
}

function getBlockHeadersByHeight(blockHeights) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		for (var i = 0; i < blockHeights.length; i++) {
			promises.push(getBlockHeaderByHeight(blockHeights[i]));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlocksStatsByHeight(blockHeights) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		for (var i = 0; i < blockHeights.length; i++) {
			promises.push(getBlockStatsByHeight(blockHeights[i]));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockByHash(blockHash) {
	return tryCacheThenRpcApi(blockCache, "getBlockByHash-" + blockHash, FIFTEEN_MIN, function() {
		return rpcApi.getBlockByHash(blockHash);
	});
}

function getBlocksByHash(blockHashes) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		for (var i = 0; i < blockHashes.length; i++) {
			promises.push(getBlockByHash(blockHashes[i]));
		}

		Promise.all(promises).then(function(results) {
			var result = {};

			results.forEach(function(item) {
				result[item.hash] = item;
			});

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getRawTransaction(txid, blockhash) {
	var rpcApiFunction = function() {
		return rpcApi.getRawTransaction(txid, blockhash);
	};

	return tryCacheThenRpcApi(txCache, "getRawTransaction-" + txid, FIFTEEN_MIN, rpcApiFunction, shouldCacheTransaction);
}

/*
	This function pulls raw tx data and then summarizes the outputs. It's used in memory-constrained situations.
*/
function getSummarizedTransactionOutput(txid, voutIndex) {
	var rpcApiFunction = function() {
		return new Promise(function(resolve, reject) {
			rpcApi.getRawTransaction(txid).then(function(rawTx) {
				var vout = rawTx.vout[voutIndex];
				if (vout.scriptPubKey) {
					if (vout.scriptPubKey.asm) {
						delete vout.scriptPubKey.asm;
					}

					if (vout.scriptPubKey.hex) {
						delete vout.scriptPubKey.hex;
					}
				}

				vout.txid = txid;
				vout.utxoTime = rawTx.time;

				if (rawTx.vin.length == 1 && rawTx.vin[0].coinbase) {
					vout.coinbaseSpend = true;
				}

				resolve(vout);

			}).catch(function(err) {
				reject(err);
			});
		});
	};

	return tryCacheThenRpcApi(txCache, `txoSummary-${txid}-${voutIndex}`, FIFTEEN_MIN, rpcApiFunction, function() { return true; });
}

function getTxUtxos(tx) {
	return new Promise(function(resolve, reject) {
		var promises = [];

		for (var i = 0; i < tx.vout.length; i++) {
			promises.push(getUtxo(tx.txid, i));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getUtxo(txid, outputIndex) {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "utxo-" + txid + "-" + outputIndex, FIFTEEN_MIN, function() {
			return rpcApi.getUtxo(txid, outputIndex);

		}).then(function(result) {
			// to avoid cache misses, rpcApi.getUtxo returns "0" instead of null
			if (result == "0") {
				resolve(null);

				return;
			}

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getMempoolTxDetails(txid, includeAncDec) {
	return tryCacheThenRpcApi(miscCache, "mempoolTxDetails-" + txid + "-" + includeAncDec, FIFTEEN_MIN, function() {
		return rpcApi.getMempoolTxDetails(txid, includeAncDec);
	});
}

function getAddress(address) {
	return tryCacheThenRpcApi(miscCache, "getAddress-" + address, FIFTEEN_MIN, function() {
		return rpcApi.getAddress(address);
	});
}

function getRawTransactions(txids, blockhash) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		for (var i = 0; i < txids.length; i++) {
			promises.push(getRawTransaction(txids[i], blockhash));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

async function getRawTransactionsByHeights(txids, blockHeightsByTxid) {
	return Promise.all(txids.map(async txid => {
		var blockheight = blockHeightsByTxid[txid];
		var blockhash = blockheight ? await getBlockByHeight(blockheight) : null;
		return getRawTransaction(txid, blockhash);
	}))
}

function buildBlockAnalysisData(blockHeight, blockHash, txids, txIndex, results, callback) {
	if (txIndex >= txids.length) {
		callback();

		return;
	}

	var txid = txids[txIndex];

	getRawTransactionsWithInputs([txid], -1, blockHash).then(function(txData) {
		results.push(summarizeBlockAnalysisData(blockHeight, txData.transactions[0], txData.txInputsByTransaction[txid]));
		
		buildBlockAnalysisData(blockHeight, blockHash, txids, txIndex + 1, results, callback);
	});
}

function summarizeBlockAnalysisData(blockHeight, tx, inputs) {
	var txSummary = {};

	txSummary.txid = tx.txid;
	txSummary.version = tx.version;
	txSummary.size = tx.size;

	if (tx.vsize) {
		txSummary.vsize = tx.vsize;
	}

	if (tx.weight) {
		txSummary.weight = tx.weight;
	}

	if (tx.vin[0].coinbase) {
		txSummary.coinbase = true;
	}

	txSummary.vin = [];
	txSummary.totalInput = new Decimal(0);

	if (txSummary.coinbase) {
		var subsidy = global.coinConfig.blockRewardFunction(blockHeight, global.activeBlockchain);

		txSummary.totalInput = txSummary.totalInput.plus(new Decimal(subsidy));

		txSummary.vin.push({
			coinbase: true,
			value: subsidy
		});

	} else {
		for (var i = 0; i < tx.vin.length; i++) {
			var vin = tx.vin[i];
			
			var txSummaryVin = {
				txid: tx.vin[i].txid,
				vout: tx.vin[i].vout,
				sequence: tx.vin[i].sequence
			};

			if (inputs) {
				var inputVout = inputs[i];

				txSummary.totalInput = txSummary.totalInput.plus(new Decimal(inputVout.value));

				txSummaryVin.value = inputVout.value;
				txSummaryVin.type = inputVout.scriptPubKey.type;
				txSummaryVin.reqSigs = inputVout.scriptPubKey.reqSigs;
				txSummaryVin.addressCount = (inputVout.scriptPubKey.addresses ? inputVout.scriptPubKey.addresses.length : 0);
			}

			txSummary.vin.push(txSummaryVin);
		}
	}


	txSummary.vout = [];
	txSummary.totalOutput = new Decimal(0);

	for (var i = 0; i < tx.vout.length; i++) {
		txSummary.totalOutput = txSummary.totalOutput.plus(new Decimal(tx.vout[i].value));

		txSummary.vout.push({
			value: tx.vout[i].value,
			type: tx.vout[i].scriptPubKey.type,
			reqSigs: tx.vout[i].scriptPubKey.reqSigs,
			addressCount: tx.vout[i].scriptPubKey.addresses ? tx.vout[i].scriptPubKey.addresses.length : 0
		});
	}

	if (txSummary.coinbase) {
		txSummary.totalFee = new Decimal(0);
		
	} else {
		txSummary.totalFee = txSummary.totalInput.minus(txSummary.totalOutput);
	}

	return txSummary;
}

function getRawTransactionsWithInputs(txids, maxInputs=-1, blockhash) {
	// Get just the transactions without their prevouts when txindex is disabled
	if (!global.txindexAvailable) {
		return getRawTransactions(txids, blockhash)
			.then(transactions => ({ transactions, txInputsByTransaction: {} }))
	}

	return new Promise(function(resolve, reject) {
		getRawTransactions(txids, blockhash).then(function(transactions) {
			var maxInputsTracked = config.site.txMaxInput;
			
			if (maxInputs <= 0) {
				maxInputsTracked = 1000000;

			} else if (maxInputs > 0) {
				maxInputsTracked = maxInputs;
			}

			var vinIds = [];
			for (var i = 0; i < transactions.length; i++) {
				var transaction = transactions[i];

				if (transaction && transaction.vin) {
					for (var j = 0; j < Math.min(maxInputsTracked, transaction.vin.length); j++) {
						if (transaction.vin[j].txid) {
							vinIds.push({txid:transaction.vin[j].txid, voutIndex:transaction.vin[j].vout});
						}
					}
				}
			}

			var promises = [];

			for (var i = 0; i < vinIds.length; i++) {
				var vinId = vinIds[i];

				promises.push(getSummarizedTransactionOutput(vinId.txid, vinId.voutIndex));
			}

			Promise.all(promises).then(function(promiseResults) {
				var summarizedTxOutputs = {};
				for (var i = 0; i < promiseResults.length; i++) {
					var summarizedTxOutput = promiseResults[i];

					summarizedTxOutputs[`${summarizedTxOutput.txid}:${summarizedTxOutput.n}`] = summarizedTxOutput;
				}

				var txInputsByTransaction = {};

				transactions.forEach(function(tx) {
					txInputsByTransaction[tx.txid] = {};

					if (tx && tx.vin) {
						for (var i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
							var summarizedTxOutput = summarizedTxOutputs[`${tx.vin[i].txid}:${tx.vin[i].vout}`];
							if (summarizedTxOutput) {
								txInputsByTransaction[tx.txid][i] = summarizedTxOutput;
							}
						}
					}
				});

				resolve({ transactions:transactions, txInputsByTransaction:txInputsByTransaction });
			}).catch(reject);
		}).catch(reject);
	});
}

function getBlockByHashWithTransactions(blockHash, txLimit, txOffset) {
	return new Promise(function(resolve, reject) {
		getBlockByHash(blockHash).then(function(block) {
			var txids = [];
			
			// to get miner info, always include the coinbase tx in the list
			if (txOffset > 0) {
				txids.push(block.tx[0]);
			}

			for (var i = txOffset; i < Math.min(txOffset + txLimit, block.tx.length); i++) {
				txids.push(block.tx[i]);
			}

			getRawTransactionsWithInputs(txids, config.site.txMaxInput, blockHash).then(function(txsResult) {
				if (txsResult.transactions && txsResult.transactions.length > 0) {
					block.coinbaseTx = txsResult.transactions[0];
					block.totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(block.coinbaseTx, block.height);
					block.miner = utils.getMinerFromCoinbaseTx(block.coinbaseTx);
				}

				// if we're on page 2+, drop the coinbase tx that was added in order to get miner info
				if (txOffset > 0) {
					txsResult.transactions.shift();
				}

				resolve({ getblock:block, transactions:txsResult.transactions, txInputsByTransaction:txsResult.txInputsByTransaction });
				
			}).catch(function(err) {
				if (!global.txindexAvailable || global.prunedBlockchain) {
					// likely due to pruning or no txindex, report the error but continue with an empty transaction list
					resolve({ getblock:block, transactions:[], txInputsByTransaction:{} });

				} else {
					reject(err);
				}

			});
		}).catch(reject);
	});
}




let activeMiningQueueTasks = 0;
const miningPromiseQueue = async.queue((task, callback) => {
	activeMiningQueueTasks++;

	task.run(() => {
		callback();

		activeMiningQueueTasks--;
	});

}, 30);

function buildMiningSummary(statusId, startBlock, endBlock, statusFunc) {
	return new Promise(async (resolve, reject) => {
		try {
			const blockCount = (endBlock - startBlock + 1);
			let doneCount = 0;

			const markItemsDone = (count) => {
				doneCount += count;
				statusFunc({count: 3 * blockCount + 1, done: doneCount});
			};

			const summariesByHeight = {};
			

			for (var i = startBlock; i <= endBlock; i++) {
				const height = i;
				const cacheKey = `${height}`;

				let cachedSummary = await miningSummaryCache.get(cacheKey);
				
				if (cachedSummary) {
					summariesByHeight[height] = cachedSummary;

					markItemsDone(3);

				} else {
					miningPromiseQueue.push({run:async (callback) => {
						let itemsDone = 0;

						try {
							const blockHash = await getBlockHashByHeight(height);

							itemsDone++;
							markItemsDone(1);

							const block = await getBlockByHash(blockHash);

							itemsDone++;
							markItemsDone(1);


							const coinbaseTx = await getRawTransaction(block.tx[0]);

							const minerInfo = utils.getMinerFromCoinbaseTx(coinbaseTx);
							const totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(coinbaseTx, height);
							const subsidy = coinConfig.blockRewardFunction(height, global.activeBlockchain);

							let heightSummary = {
								mn: (minerInfo ? minerInfo.name : "Unknown"),
								tx: block.tx.length,
								f: totalFees,
								s: subsidy,
								w: block.weight
							};
							
							miningSummaryCache.set(cacheKey, heightSummary);

							summariesByHeight[height] = heightSummary;

							itemsDone++;
							markItemsDone(1);
							
							callback();

						} catch (e) {
							utils.logError("430835hre", e);


							markItemsDone(3 - itemsDone);

							// resolve anyway
							callback();
						}
					}});
				}
			}


			if (!miningPromiseQueue.idle()) {
				await miningPromiseQueue.drain();
			}
			
			
			var summary = {
				miners:{},
				minerNamesSortedByBlockCount: [],
				overall:{
					blockCount: 0, totalFees: new Decimal(0), totalSubsidy: new Decimal(0), totalTransactions: 0, totalWeight: 0, subsidyCount: 0
				}
			};

			for (var height = startBlock; height <= endBlock; height++) {
				const blockSummary = summariesByHeight[height];
				const miner = blockSummary.mn;

				if (!summary.miners[miner]) {
					summary.minerNamesSortedByBlockCount.push(miner);

					summary.miners[miner] = {
						name: miner, blocks: [], totalFees: new Decimal(0), totalSubsidy: new Decimal(0), totalTransactions: 0, totalWeight: 0, subsidyCount: 0
					};
				}

				summary.miners[miner].blocks.push(height);
				summary.miners[miner].totalFees = summary.miners[miner].totalFees.plus(blockSummary.f);
				summary.miners[miner].totalSubsidy = summary.miners[miner].totalSubsidy.plus(blockSummary.s);
				summary.miners[miner].totalTransactions += blockSummary.tx;
				summary.miners[miner].totalWeight += blockSummary.w;
				summary.miners[miner].subsidyCount++;

				summary.overall.blockCount++;
				summary.overall.totalFees = summary.overall.totalFees.plus(blockSummary.f);
				summary.overall.totalSubsidy = summary.overall.totalSubsidy.plus(blockSummary.s);
				summary.overall.totalTransactions += blockSummary.tx;
				summary.overall.totalWeight += blockSummary.w;
				summary.overall.subsidyCount++;
			}

			summary.minerNamesSortedByBlockCount.sort(function(a, b) {
				return ((summary.miners[a].blocks.length > summary.miners[b].blocks.length) ? -1 : 1);
			});


			// we're done, send final status update
			statusFunc({count: 3 * blockCount + 1, done: 3 * blockCount + 1});


			resolve(summary);

		} catch (err) {
			utils.logError("208yrwregud9e3", err);

			reject(err);
		}
	});
}



const mempoolTxSummaryCache = {};

function buildMempoolSummary(statusId, ageBuckets, sizeBuckets, statusFunc) {
	return new Promise(async (resolve, reject) => {
		try {
			const txids = await utils.timePromise("promises.mempool-summary.getAllMempoolTxids", getAllMempoolTxids());

			const txidCount = txids.length;
			var doneCount = 0;

			const statusUpdate = () => { statusFunc({count: txidCount, done: doneCount}); };

			const promises = [];
			const results = [];
			const txidKeysForCachePurge = {};

			

			for (var i = 0; i < txids.length; i++) {
				const txid = txids[i];
				const key = txid.substring(0, 6);
				txidKeysForCachePurge[key] = 1;

				if (mempoolTxSummaryCache[key]) {
					results.push(mempoolTxSummaryCache[key]);

					doneCount++;
					statusUpdate();

				} else {
					promises.push(new Promise(async (resolve, reject) => {
						try {
							const item = await getMempoolTxDetails(txid, false);
							const itemSummary = {
								f: item.entry.fees.modified,
								sz: item.entry.vsize ? item.entry.vsize : item.entry.size,
								af: item.entry.fees.ancestor,
								df: item.entry.fees.descendant,
								dsz: item.entry.descendantsize,
								t: item.entry.time,
								w: item.entry.weight ? item.entry.weight : item.entry.size * 4
							};

							mempoolTxSummaryCache[key] = itemSummary;

							results.push(mempoolTxSummaryCache[key]);

							doneCount++;
							statusUpdate();
							
							resolve();

						} catch (e) {
							utils.logError("31297rg34edwe", e);


							doneCount++;
							statusUpdate();

							// resolve anyway
							resolve();
						}
					}));
				}
			}


			await Promise.all(promises);

			
			// purge items from cache that are no longer present in mempool
			var keysToDelete = [];
			for (var key in mempoolTxSummaryCache) {
				if (!txidKeysForCachePurge[key]) {
					keysToDelete.push(key);
				}
			}

			keysToDelete.forEach(x => { delete mempoolTxSummaryCache[x] });


			var summary = [];

			var maxFee = 0;
			var maxFeePerByte = 0;
			var maxAge = 0;
			var maxSize = 0;
			var ages = [];
			var sizes = [];

			for (var i = 0; i < results.length; i++) {
				var txMempoolInfo = results[i];

				var fee = txMempoolInfo.f;
				var size = txMempoolInfo.sz;
				var feePerByte = txMempoolInfo.f / size;
				var age = Date.now() / 1000 - txMempoolInfo.t;

				if (fee > maxFee) {
					maxFee = fee;
				}

				if (feePerByte > maxFeePerByte) {
					maxFeePerByte = feePerByte;
				}

				ages.push({age:age, txid:"abc"});
				sizes.push({size:size, txid:"abc"});

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

			const satoshiPerByteBucketMaxima = coinConfig.feeSatoshiPerByteBucketMaxima;

			var bucketCount = satoshiPerByteBucketMaxima.length + 1;

			var satoshiPerByteBuckets = [];
			var satoshiPerByteBucketLabels = [];

			satoshiPerByteBucketLabels[0] = ("[0 - " + satoshiPerByteBucketMaxima[0] + ")");
			for (var i = 0; i < bucketCount; i++) {
				satoshiPerByteBuckets[i] = {
					count: 0,
					totalFees: 0,
					totalBytes: 0,
					totalWeight: 0,
					minFeeRate: satoshiPerByteBucketMaxima[i - 1],
					maxFeeRate: satoshiPerByteBucketMaxima[i]
				};

				if (i > 0 && i < bucketCount - 1) {
					satoshiPerByteBucketLabels[i] = ("[" + satoshiPerByteBucketMaxima[i - 1] + " - " + satoshiPerByteBucketMaxima[i] + ")");
				}
			}

			var ageBucketCount = ageBuckets;
			var ageBucketTxCounts = [];
			var ageBucketLabels = [];

			var sizeBucketCount = sizeBuckets;
			var sizeBucketTxCounts = [];
			var sizeBucketLabels = [];

			for (var i = 0; i < ageBucketCount; i++) {
				var rangeMin = i * maxAge / ageBucketCount;
				var rangeMax = (i + 1) * maxAge / ageBucketCount;

				ageBucketTxCounts.push(0);

				if (maxAge > 600) {
					var rangeMinutesMin = new Decimal(rangeMin / 60).toFixed(1);
					var rangeMinutesMax = new Decimal(rangeMax / 60).toFixed(1);

					ageBucketLabels.push(rangeMinutesMin + " - " + rangeMinutesMax + " min");

				} else {
					ageBucketLabels.push(parseInt(rangeMin) + " - " + parseInt(rangeMax) + " sec");
				}
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
				"count": 0,
				"totalFees": 0,
				"totalBytes": 0,
				"totalWeight": 0,
				"satoshiPerByteBuckets": satoshiPerByteBuckets,
				"satoshiPerByteBucketLabels": satoshiPerByteBucketLabels,
				"ageBucketTxCounts": ageBucketTxCounts,
				"ageBucketLabels": ageBucketLabels,
				"sizeBucketTxCounts": sizeBucketTxCounts,
				"sizeBucketLabels": sizeBucketLabels
			};

			for (var x = 0; x < results.length; x++) {
				var txMempoolInfo = results[x];
				var fee = txMempoolInfo.f;
				var size = txMempoolInfo.sz;
				var weight = txMempoolInfo.w;
				var feePerByte = txMempoolInfo.f / size;
				var satoshiPerByte = feePerByte * 100000000; // TODO: magic number - replace with coinConfig.baseCurrencyUnit.multiplier
				var age = Date.now() / 1000 - txMempoolInfo.t;

				var addedToBucket = false;
				for (var i = 0; i < satoshiPerByteBucketMaxima.length; i++) {
					if (satoshiPerByteBucketMaxima[i] > satoshiPerByte) {
						satoshiPerByteBuckets[i]["count"]++;
						satoshiPerByteBuckets[i]["totalFees"] += fee;
						satoshiPerByteBuckets[i]["totalBytes"] += size;
						satoshiPerByteBuckets[i]["totalWeight"] += weight;

						addedToBucket = true;

						break;
					}
				}

				if (!addedToBucket) {
					satoshiPerByteBuckets[bucketCount - 1]["count"]++;
					satoshiPerByteBuckets[bucketCount - 1]["totalFees"] += fee;
					satoshiPerByteBuckets[bucketCount - 1]["totalBytes"] += size;
					satoshiPerByteBuckets[bucketCount - 1]["totalWeight"] += weight;
				}

				summary["count"]++;
				summary["totalFees"] += fee;
				summary["totalBytes"] += size;
				summary["totalWeight"] += weight;

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


			// we're done, send final status update
			doneCount = txidCount;
			statusUpdate();


			resolve(summary);

		} catch (err) {
			utils.logError("23947ryfuedge", err);

			reject(err);
		}
	});
}

function getTxOut(txid, vout) {
	return rpcApi.getTxOut(txid, vout)
}

function getHelp() {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getHelp", ONE_DAY, rpcApi.getHelp).then(function(helpContent) {
			var lines = helpContent.split("\n");
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

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getRpcMethodHelp(methodName) {
	var rpcApiFunction = function() {
		return rpcApi.getRpcMethodHelp(methodName);
	};

	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getHelp-" + methodName, ONE_DAY, rpcApiFunction).then(function(helpContent) {
			var output = {};
			output.string = helpContent;

			var str = helpContent;

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

		}).catch(function(err) {
			reject(err);
		});
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
	getAllMempoolTxids: getAllMempoolTxids,
	getMiningInfo: getMiningInfo,
	getIndexInfo: getIndexInfo,
	getBlockByHeight: getBlockByHeight,
	getBlockHashByHeight: getBlockHashByHeight,
	getBlocksByHeight: getBlocksByHeight,
	getBlockByHash: getBlockByHash,
	getBlocksByHash: getBlocksByHash,
	getBlockByHashWithTransactions: getBlockByHashWithTransactions,
	getRawTransaction: getRawTransaction,
	getRawTransactions: getRawTransactions,
	getRawTransactionsWithInputs: getRawTransactionsWithInputs,
	getRawTransactionsByHeights: getRawTransactionsByHeights,
	getTxUtxos: getTxUtxos,
	getMempoolTxDetails: getMempoolTxDetails,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress,
	logCacheSizes: logCacheSizes,
	getPeerSummary: getPeerSummary,
	getChainTxStats: getChainTxStats,
	getMempoolTxids: getMempoolTxids,
	getTxCountStats: getTxCountStats,
	getSmartFeeEstimates: getSmartFeeEstimates,
	getSmartFeeEstimate: getSmartFeeEstimate,
	getUtxoSetSummary: getUtxoSetSummary,
	getNetworkHashrate: getNetworkHashrate,
	getBlockStats: getBlockStats,
	getBlockStatsByHeight: getBlockStatsByHeight,
	getBlocksStatsByHeight: getBlocksStatsByHeight,
	buildBlockAnalysisData: buildBlockAnalysisData,
	getBlockHeaderByHeight: getBlockHeaderByHeight,
	getBlockHeadersByHeight: getBlockHeadersByHeight,
	getTxOut: getTxOut,
	buildMempoolSummary: buildMempoolSummary,
	buildMiningSummary: buildMiningSummary
};
