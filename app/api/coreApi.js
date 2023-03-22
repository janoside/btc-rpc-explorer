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
//const rpcApi = require("./mockApi.js");


// this value should be incremented whenever data format changes, to avoid
// pulling old-format data from a persistent cache
const cacheKeyVersion = "v1";


const ONE_SEC = 1000;
const ONE_MIN = 60 * ONE_SEC;
const ONE_HR = 60 * ONE_MIN;
const FIFTEEN_MIN = 15 * ONE_MIN;
const ONE_DAY = 24 * ONE_HR;
const ONE_YR = 365 * ONE_DAY;
const SECONDS_PER_MIN = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MIN * 60;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * 24;







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
	const pruneCaches = () => {
		let totalSizeBefore = 0;
		global.lruCaches.forEach(x => (totalSizeBefore += x.size));

		global.lruCaches.forEach(x => x.purgeStale());

		let totalSizeAfter = 0;
		global.lruCaches.forEach(x => (totalSizeAfter += x.size));


		statTracker.trackEvent("caches.pruned-items", (totalSizeBefore - totalSizeAfter));
		
		statTracker.trackValue("caches.misc.size", global.miscLruCache.size);
		statTracker.trackValue("caches.misc.itemCount", global.miscLruCache.itemCount);

		statTracker.trackValue("caches.block.size", global.blockLruCache.size);
		statTracker.trackValue("caches.block.itemCount", global.blockLruCache.itemCount);

		statTracker.trackValue("caches.tx.size", global.txLruCache.size);
		statTracker.trackValue("caches.tx.itemCount", global.txLruCache.itemCount);

		statTracker.trackValue("caches.mining.size", global.miningSummaryLruCache.size);
		statTracker.trackValue("caches.mining.itemCount", global.miningSummaryLruCache.itemCount);


		debugLog(`Pruned caches: ${totalSizeBefore.toLocaleString()} -> ${totalSizeAfter.toLocaleString()}`);
	};

	setInterval(pruneCaches, 60000);
})();

if (!config.noInmemoryRpcCache) {
	global.cacheStats.memory = {
		try: 0,
		hit: 0,
		miss: 0
	};

	const onMemoryCacheEvent = function(cacheType, eventType, cacheKey) {
		global.cacheStats.memory[eventType]++;
		statTracker.trackEvent(`caches.memory.${eventType}`);
		//debugLog(`cache.${cacheType}.${eventType}: ${cacheKey}`);
	}

	miscCaches.push(cacheUtils.createMemoryLruCache("misc", global.miscLruCache, onMemoryCacheEvent));
	blockCaches.push(cacheUtils.createMemoryLruCache("block", global.blockLruCache, onMemoryCacheEvent));
	txCaches.push(cacheUtils.createMemoryLruCache("tx", global.txLruCache, onMemoryCacheEvent));
	miningSummaryCaches.push(cacheUtils.createMemoryLruCache("mining", global.miningSummaryLruCache, onMemoryCacheEvent));
}

if (redisCache.active) {
	global.cacheStats.redis = {
		try: 0,
		hit: 0,
		miss: 0,
		error: 0
	};

	const onRedisCacheEvent = function(cacheType, eventType, cacheKey) {
		global.cacheStats.redis[eventType]++;
		statTracker.trackEvent(`caches.redis.${eventType}`);
		//debugLog(`cache.${cacheType}.${eventType}: ${cacheKey}`);
	}

	// md5 of the active RPC credentials serves as part of the key; this enables
	// multiple instances of btc-rpc-explorer (eg mainnet + testnet) to share
	// a single redis instance peacefully
	const rpcHostPort = `${config.credentials.rpc.host}:${config.credentials.rpc.port}`;
	const rpcCredKeyComponent = md5(JSON.stringify(config.credentials.rpc)).substring(0, 8);
	
	const redisCacheObj = redisCache.createCache(`${cacheKeyVersion}-${rpcCredKeyComponent}`, onRedisCacheEvent);

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
		let cacheResult = null;

		let finallyFunc = function() {
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

			try {
				finallyFunc();

			} catch (e) {
				utils.logError("823hredhee", e);

				reject(e);
			}
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

function getDeploymentInfo() {
	return tryCacheThenRpcApi(miscCache, "getDeploymentInfo", 10 * ONE_SEC, rpcApi.getDeploymentInfo);
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

function getChainTxStats(blockCount, blockhashEnd) {
	return tryCacheThenRpcApi(miscCache, "getChainTxStats-" + blockCount + "-" + blockhashEnd, FIFTEEN_MIN, function() {
		return rpcApi.getChainTxStats(blockCount, blockhashEnd);
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


const utxoSetFileCache = utils.fileCache(config.filesystemCacheDir, `utxo-set`);

function getUtxoSetSummary(useCoinStatsIndexIfAvailable=true, useCacheIfAvailable=true) {
	return tryCacheThenRpcApi(miscCache, "getUtxoSetSummary", FIFTEEN_MIN, async () => {
		let utxoSetSummary = utxoSetFileCache.tryLoadJson();

		if (utxoSetSummary && useCacheIfAvailable) {
			return utxoSetSummary;

		} else {
			utxoSetSummary = await rpcApi.getUtxoSetSummary(useCoinStatsIndexIfAvailable);

			if (utxoSetSummary && utxoSetSummary.total_amount) {
				if (useCoinStatsIndexIfAvailable && global.getindexinfo && global.getindexinfo.coinstatsindex) {
					utxoSetSummary.usingCoinStatsIndex = true;

				} else {
					utxoSetSummary.usingCoinStatsIndex = false;
				}

				utxoSetSummary.lastUpdated = Date.now();

				try {
					utxoSetFileCache.writeJson(utxoSetSummary);
					
				} catch (e) {
					utils.logError("h32uheifehues", e);
				}

				return utxoSetSummary;

			} else {
				return null;
			}
		}
	});
}

async function getNextBlockEstimate() {
	const blockTemplate = await getBlockTemplate();

	let minFeeRate = 1000000;
	let maxFeeRate = 0;
	let minFeeTxid = null;
	let maxFeeTxid = null;
	let medianFeeRate = 0;

	let parentTxIndexes = new Set();
	let templateWeight = 0;
	blockTemplate.transactions.forEach(tx => {
		templateWeight += tx.weight;

		if (tx.depends && tx.depends.length > 0) {
			tx.depends.forEach(index => {
				parentTxIndexes.add(index);
			});
		}
	});

	let txIndex = 1;
	let feeRates = [];
	blockTemplate.transactions.forEach(tx => {
		let feeRate = tx.fee / tx.weight * 4;
		if (tx.depends && tx.depends.length > 0) {
			let totalFee = tx.fee;
			let totalWeight = tx.weight;

			tx.depends.forEach(index => {
				totalFee += blockTemplate.transactions[index - 1].fee;
				totalWeight += blockTemplate.transactions[index - 1].weight;
			});

			tx.avgFeeRate = totalFee / totalWeight * 4;
		}

		// txs that are ancestors should not be included in min/max
		// calculations since their native fee rate is different than
		// their effective fee rate (which takes descendant fee rates
		// into account)
		if (!parentTxIndexes.has(txIndex) && (!tx.depends || tx.depends.length == 0)) {
			feeRates.push(feeRate);

			if (feeRate < minFeeRate) {
				minFeeRate = feeRate;
				minFeeTxid = tx.txid;
			}

			if (feeRate > maxFeeRate) {
				maxFeeRate = feeRate;
				maxFeeTxid = tx.txid;
			}
		}

		txIndex++;
	});

	if (feeRates.length > 0) {
		medianFeeRate = feeRates[Math.floor(feeRates.length / 2)];
	}

	const feeRateGroups = [];
	let groupCount = 10;
	for (let i = 0; i < groupCount; i++) {
		feeRateGroups.push({
			minFeeRate: minFeeRate + i * (maxFeeRate - minFeeRate) / groupCount,
			maxFeeRate: minFeeRate + (i + 1) * (maxFeeRate - minFeeRate) / groupCount,
			totalWeight: 0,
			txidCount: 0,
			//txids: []
		});
	}

	let txIncluded = 0;
	blockTemplate.transactions.forEach(tx => {
		let feeRate = tx.avgFeeRate ? tx.avgFeeRate : (tx.fee / tx.weight * 4);

		for (let i = 0; i < feeRateGroups.length; i++) {
			if (feeRate >= feeRateGroups[i].minFeeRate) {
				if (feeRate < feeRateGroups[i].maxFeeRate) {
					feeRateGroups[i].totalWeight += tx.weight;
					feeRateGroups[i].txidCount++;
					
					//res.locals.nextBlockFeeRateGroups[i].txids.push(tx.txid);

					txIncluded++;

					break;
				}
			}
		}
	});

	feeRateGroups.forEach(group => {
		group.weightRatio = group.totalWeight / blockTemplate.weightlimit;
	});



	const subsidy = coinConfig.blockRewardFunction(blockTemplate.height, global.activeBlockchain);

	const totalFees = new Decimal(blockTemplate.coinbasevalue).dividedBy(SATS_PER_BTC).minus(new Decimal(subsidy));

	return {
		blockTemplate: blockTemplate,
		weight: templateWeight,
		feeRateGroups: feeRateGroups,
		totalFees: totalFees,
		minFeeRate: minFeeRate,
		maxFeeRate: maxFeeRate,
		medianFeeRate: medianFeeRate,
		minFeeTxid: minFeeTxid,
		maxFeeTxid: maxFeeTxid
	};
}

function getBlockTemplate() {
	return tryCacheThenRpcApi(miscCache, "getblocktemplate", 5 * ONE_SEC, rpcApi.getBlockTemplate);
}



const difficultyFileCache = utils.fileCache(config.filesystemCacheDir, `difficulty-by-blockheight`, 2);
global.difficultyByBlockheightCache = difficultyFileCache.tryLoadJson() || {};
global.difficultyByBlockheightCacheDirty = false;

(function () {
	const writeDifficultyCache = () => {
		if (global.difficultyByBlockheightCacheDirty) {
			difficultyFileCache.writeJson(global.difficultyByBlockheightCache);
		}
	};

	setInterval(writeDifficultyCache, 60000);
})();

async function getDifficultyByBlockHeights(blockHeights) {
	const results = {};
	const neededBlockHeights = [];

	for (let i = 0; i < blockHeights.length; i++) {
		let blockHeight = blockHeights[i];
		let blockHeightStr = `${blockHeight}`;

		if (global.difficultyByBlockheightCache[blockHeightStr]) {
			results[blockHeight] = global.difficultyByBlockheightCache[blockHeightStr];

		} else {
			neededBlockHeights.push(blockHeight);
		}
	}

	const blockHeaders = await getBlockHeadersByHeight(neededBlockHeights);

	blockHeaders.forEach(header => {
		global.difficultyByBlockheightCache[`${header.height}`] = {
			difficulty: header.difficulty,
			time: header.time
		};

		global.difficultyByBlockheightCacheDirty = true;

		results[header.height] = {
			difficulty: header.difficulty,
			time: header.time
		};
	});

	return results;
}

async function getTxStats(dataPtCount, blockStart, blockEnd) {
	let cacheKey = `txStats-${dataPtCount}-${blockStart}-${blockEnd}`;

	let cacheResult = await miscCache.get(cacheKey);
	if (cacheResult) {
		console.log("CACHE RESULT");
		return cacheResult;
	}

	let getblockchaininfo = await getBlockchainInfo();
	
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
		throw new Error(`Error 37rhw0e7ufdsgf: blockStart (${blockStart}) > blockEnd (${blockEnd})`);
	}

	if (blockStart < 0) {
		blockStart += getblockchaininfo.blocks;
	}

	if (blockEnd < 0) {
		blockEnd += getblockchaininfo.blocks;
	}

	const promises = [];

	const blockCount = Math.floor((blockEnd - blockStart) / dataPtCount) || 1;
	if (dataPtCount > (blockEnd - blockStart)) {
		dataPtCount = (blockEnd - blockStart);
	}
	
	for (let i = 0; i < dataPtCount; i++) {
		let blockHeightEnd = blockStart + (i + 1) * blockCount;
		
		promises.push((async () => {
			let blockhashEnd = await getBlockHashByHeight(blockHeightEnd);

			// Math.min below is to handle the edge case where we're starting from genesis block, which doesn't behave the same as others
			return await rpcApi.getChainTxStats(Math.min(blockCount, blockHeightEnd - 1), blockhashEnd);

		})());
	}

	const results = await Promise.all(promises);

	//console.log(results);

	if (results.length == 0 || (results[0].name == "RpcError" && results[0].code == -8)) {
		// recently started node - no meaningful data to return
		return null;
	}

	let summary = {
		txCounts: [],
		txLabels: [],
		txRates: [],
		timespans: [],
		blocksPerPoint: blockCount
	};

	let totalTimespan = 0;
	for (let i = results.length - 1; i >= 0; i--) {
		if (results[i].window_tx_count) {
			summary.txCounts.push( {x:(blockStart + i * blockCount), y: results[i].window_tx_count} );
			summary.txRates.push( {x:(blockStart + i * blockCount), y: results[i].txrate} );
			summary.timespans.push( {x:(blockStart + i * blockCount), y: results[i].window_interval});
			summary.txLabels.push(i);

			totalTimespan += results[i].window_interval;
		}
	}

	summary.avgTimespan = (totalTimespan / results.length);

	miscCache.set(cacheKey, summary, 60 * ONE_MIN);

	//console.log(summary);
	
	return summary;
}

function getSmartFeeEstimates(mode, confTargetBlockCounts) {
	return new Promise(function(resolve, reject) {
		let promises = [];
		for (let i = 0; i < confTargetBlockCounts.length; i++) {
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
			let result = {};
			result.getpeerinfo = getpeerinfo;

			let versionSummaryMap = {};
			for (let i = 0; i < getpeerinfo.length; i++) {
				let x = getpeerinfo[i];

				if (versionSummaryMap[x.subver] == null) {
					versionSummaryMap[x.subver] = 0;
				}

				versionSummaryMap[x.subver]++;
			}

			let versionSummary = [];
			for (let prop in versionSummaryMap) {
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

			let serviceNamesAvailable = false;

			let servicesSummaryMap = {};
			for (let i = 0; i < getpeerinfo.length; i++) {
				let x = getpeerinfo[i];

				if (x.servicesnames) {
					serviceNamesAvailable = true;

					x.servicesnames.forEach(name => {
						if (servicesSummaryMap[name] == null) {
							servicesSummaryMap[name] = 0;
						}

						servicesSummaryMap[name]++;
					});

				} else {
					if (servicesSummaryMap[x.services] == null) {
						servicesSummaryMap[x.services] = 0;
					}

					servicesSummaryMap[x.services]++;
				}
			}

			let servicesSummary = [];
			for (let prop in servicesSummaryMap) {
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
				let connectionTypeSummaryMap = {};
				for (let i = 0; i < getpeerinfo.length; i++) {
					let x = getpeerinfo[i];

					if (connectionTypeSummaryMap[x.connection_type] == null) {
						connectionTypeSummaryMap[x.connection_type] = 0;
					}

					connectionTypeSummaryMap[x.connection_type]++;
				}

				let connectionTypeSummary = [];
				for (let prop in connectionTypeSummaryMap) {
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
				let networkTypeSummaryMap = {};
				for (let i = 0; i < getpeerinfo.length; i++) {
					let x = getpeerinfo[i];

					if (networkTypeSummaryMap[x.network] == null) {
						networkTypeSummaryMap[x.network] = 0;
					}

					networkTypeSummaryMap[x.network]++;
				}

				let networkTypeSummary = [];
				for (let prop in networkTypeSummaryMap) {
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
			result.serviceNamesAvailable = serviceNamesAvailable;

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getMempoolTxids(limit, offset) {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getMempoolTxids", ONE_SEC, rpcApi.getAllMempoolTxids).then(function(resultTxids) {
			let txids = [];

			for (let i = offset; (i < resultTxids.length && i < (offset + limit)); i++) {
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
		let promises = [];
		for (let i = 0; i < blockHeights.length; i++) {
			promises.push(getBlockByHeight(blockHeights[i]));
		}

		Promise.all(promises).then(function(results) {
			resolve(results);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockHeaderByHash(hash) {
	return tryCacheThenRpcApi(blockCache, "getBlockHeaderByHash-" + hash, FIFTEEN_MIN, function() {
		return rpcApi.getBlockHeaderByHash(hash);
	});
}

function getBlockHeaderByHeight(blockHeight) {
	return tryCacheThenRpcApi(blockCache, "getBlockHeaderByHeight-" + blockHeight, FIFTEEN_MIN, function() {
		return rpcApi.getBlockHeaderByHeight(blockHeight);
	});
}

function getBlockHeadersByHeight(blockHeights) {
	return new Promise(function(resolve, reject) {
		let promises = [];
		for (let i = 0; i < blockHeights.length; i++) {
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
		let promises = [];
		for (let i = 0; i < blockHeights.length; i++) {
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
		let promises = [];
		for (let i = 0; i < blockHashes.length; i++) {
			promises.push(getBlockByHash(blockHashes[i]));
		}

		Promise.all(promises).then(function(results) {
			let result = {};

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
	let rpcApiFunction = function() {
		return rpcApi.getRawTransaction(txid, blockhash);
	};

	return tryCacheThenRpcApi(txCache, "getRawTransaction-" + txid, FIFTEEN_MIN, rpcApiFunction, shouldCacheTransaction);
}

/*
	This function pulls raw tx data and then summarizes the outputs. It's used in memory-constrained situations.
*/
function getSummarizedTransactionOutput(txid, voutIndex) {
	let rpcApiFunction = function() {
		return new Promise(function(resolve, reject) {
			rpcApi.getRawTransaction(txid).then(function(rawTx) {
				let vout = rawTx.vout[voutIndex];
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

async function getTxUtxos(tx) {
	const promises = [];

	for (let i = 0; i < tx.vout.length; i++) {
		promises.push(getUtxo(tx.txid, i));
	}

	return Promise.all(promises);
}

function getUtxo(txid, outputIndex) {
	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "utxo-" + txid + "-" + outputIndex, FIFTEEN_MIN, function() {
			return rpcApi.getUtxo(txid, outputIndex);

		}).then(function(result) {
			// to avoid cache misses, rpcApi.getUtxo returns "0" instead of null
			if (typeof result == "string" && result == "0") {
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
		let promises = [];
		for (let i = 0; i < txids.length; i++) {
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
		let blockheight = blockHeightsByTxid[txid];
		let blockhash = blockheight ? await getBlockByHeight(blockheight) : null;
		
		return getRawTransaction(txid, blockhash);
	}))
}

function buildBlockAnalysisData(blockHeight, blockHash, txids, txIndex, results, callback) {
	if (txIndex >= txids.length) {
		callback();

		return;
	}

	let txid = txids[txIndex];

	getRawTransactionsWithInputs([txid], -1, blockHash).then(function(txData) {
		results.push(summarizeBlockAnalysisData(blockHeight, txData.transactions[0], txData.txInputsByTransaction[txid]));
		
		buildBlockAnalysisData(blockHeight, blockHash, txids, txIndex + 1, results, callback);
	});
}

function summarizeBlockAnalysisData(blockHeight, tx, inputs) {
	let txSummary = {};

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
	txSummary.totalDaysDestroyed = new Decimal(0);

	if (txSummary.coinbase) {
		let subsidy = global.coinConfig.blockRewardFunction(blockHeight, global.activeBlockchain);

		txSummary.totalInput = txSummary.totalInput.plus(new Decimal(subsidy));

		txSummary.vin.push({
			coinbase: true,
			value: subsidy
		});

	} else {
		for (let i = 0; i < tx.vin.length; i++) {
			let vin = tx.vin[i];
			
			let txSummaryVin = {
				txid: tx.vin[i].txid,
				vout: tx.vin[i].vout,
				sequence: tx.vin[i].sequence
			};

			if (inputs) {
				let inputVout = inputs[i];

				txSummary.totalInput = txSummary.totalInput.plus(new Decimal(inputVout.value));

				let timeDestroyed = tx.time - inputVout.utxoTime;
				let daysDestroyed = timeDestroyed / SECONDS_PER_DAY;

				txSummary.totalDaysDestroyed = txSummary.totalDaysDestroyed.plus(new Decimal(inputVout.value).times(daysDestroyed));

				//console.log(`tx:id=${tx.txid}, tx.time=${tx.time}, inputVout.time=${inputVout.time}, input=${i}, TD=${timeDestroyed}, DD=${daysDestroyed}`);
				//console.log(`inputVout: ${JSON.stringify(inputVout)}`);

				txSummaryVin.value = inputVout.value;
				txSummaryVin.type = inputVout.scriptPubKey.type;
				txSummaryVin.reqSigs = inputVout.scriptPubKey.reqSigs;
				txSummaryVin.addressCount = utils.getVoutAddresses(inputVout).length;
			}

			txSummary.vin.push(txSummaryVin);
		}
	}


	txSummary.vout = [];
	txSummary.totalOutput = new Decimal(0);

	for (let i = 0; i < tx.vout.length; i++) {
		txSummary.totalOutput = txSummary.totalOutput.plus(new Decimal(tx.vout[i].value));

		txSummary.vout.push({
			value: tx.vout[i].value,
			type: tx.vout[i].scriptPubKey.type,
			reqSigs: tx.vout[i].scriptPubKey.reqSigs,
			addressCount: utils.getVoutAddresses(tx.vout[i]).length
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
			let maxInputsTracked = config.site.txMaxInput;
			
			if (maxInputs <= 0) {
				maxInputsTracked = 1000000;

			} else if (maxInputs > 0) {
				maxInputsTracked = maxInputs;
			}

			let vinIds = [];
			for (let i = 0; i < transactions.length; i++) {
				let transaction = transactions[i];

				if (transaction && transaction.vin) {
					for (let j = 0; j < Math.min(maxInputsTracked, transaction.vin.length); j++) {
						if (transaction.vin[j].txid) {
							vinIds.push({txid:transaction.vin[j].txid, voutIndex:transaction.vin[j].vout});
						}
					}
				}
			}

			let promises = [];

			for (let i = 0; i < vinIds.length; i++) {
				let vinId = vinIds[i];

				promises.push(getSummarizedTransactionOutput(vinId.txid, vinId.voutIndex));
			}

			Promise.all(promises).then(function(promiseResults) {
				let summarizedTxOutputs = {};
				
				for (let i = 0; i < promiseResults.length; i++) {
					let summarizedTxOutput = promiseResults[i];

					summarizedTxOutputs[`${summarizedTxOutput.txid}:${summarizedTxOutput.n}`] = summarizedTxOutput;
				}

				let txInputsByTransaction = {};

				transactions.forEach(function(tx) {
					txInputsByTransaction[tx.txid] = {};

					if (tx && tx.vin) {
						for (let i = 0; i < Math.min(maxInputsTracked, tx.vin.length); i++) {
							let summarizedTxOutput = summarizedTxOutputs[`${tx.vin[i].txid}:${tx.vin[i].vout}`];
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
			let txids = [];
			
			// to get miner info, always include the coinbase tx in the list
			if (txOffset > 0) {
				txids.push(block.tx[0]);
			}

			for (let i = txOffset; i < Math.min(txOffset + txLimit, block.tx.length); i++) {
				txids.push(block.tx[i]);
			}

			getRawTransactionsWithInputs(txids, config.site.txMaxInput, blockHash).then(function(txsResult) {
				if (txsResult.transactions && txsResult.transactions.length > 0) {
					block.coinbaseTx = txsResult.transactions[0];
					block.totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(block.coinbaseTx, block.height);
					block.miner = utils.identifyMiner(block.coinbaseTx, block.height);
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
				if (statusFunc) {
					statusFunc({count: 3 * blockCount + 1, done: doneCount});
				}
			};

			const summariesByHeight = {};
			const minerInfoByName = {};
			

			for (let i = startBlock; i <= endBlock; i++) {
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

							const minerInfo = utils.identifyMiner(coinbaseTx, height);
							const totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(coinbaseTx, height);
							const subsidy = coinConfig.blockRewardFunction(height, global.activeBlockchain);

							let minerName = "Unknown";
							if (minerInfo) {
								if (minerInfo.type == "address-only") {
									minerName = "address-only:" + minerInfo.name;

								} else {
									minerName = minerInfo.name;
								}
							}

							minerInfoByName[minerName] = minerInfo;

							let heightSummary = {
								mn: minerName,
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
			
			
			let summary = {
				miners:{},
				minerNamesSortedByBlockCount: [],
				overall:{
					blockCount: 0, totalFees: new Decimal(0), totalSubsidy: new Decimal(0), totalTransactions: 0, totalWeight: 0, subsidyCount: 0
				}
			};

			for (let height = startBlock; height <= endBlock; height++) {
				const blockSummary = summariesByHeight[height];
				const miner = blockSummary.mn;

				if (!summary.miners[miner]) {
					summary.minerNamesSortedByBlockCount.push(miner);

					summary.miners[miner] = {
						name: miner, details: minerInfoByName[miner], blocks: [], totalFees: new Decimal(0), totalSubsidy: new Decimal(0), totalTransactions: 0, totalWeight: 0, subsidyCount: 0
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
			if (statusFunc) {
				statusFunc({count: 3 * blockCount + 1, done: 3 * blockCount + 1});
			}


			resolve(summary);

		} catch (err) {
			utils.logError("208yrwregud9e3", err);

			reject(err);
		}
	});
}



let mempoolTxSummaryCache = {};
let mempoolCacheKeyForTxid = (txid) => {
	return txid.substring(0, 10);
};

function getCachedMempoolTxSummaries() {
	return new Promise(async (resolve, reject) => {
		try {
			const allTxids = await utils.timePromise("coreApi_mempool_summary_getAllMempoolTxids", getAllMempoolTxids);
			
			//const txids = allTxids.slice(0, 50); // for debugging
			const txids = allTxids;

			const txidCount = txids.length;
			
			const results = [];
			const txidKeysForCachePurge = {};

			for (let i = 0; i < txids.length; i++) {
				const txid = txids[i];
				const key = mempoolCacheKeyForTxid(txid);
				txidKeysForCachePurge[key] = 1;

				if (mempoolTxSummaryCache[key]) {
					const itemSummary = Object.assign({}, mempoolTxSummaryCache[key]);
					itemSummary.key = key;

					results.push(itemSummary);

				} else {
					// nothing
				}
			}


			// cleanup cache, but we don't need to wait for it to finish before resolving
			new Promise((resolve, reject) => {
				// purge items from cache that are no longer present in mempool
				let keysToDelete = [];
				
				for (let key in mempoolTxSummaryCache) {
					if (!txidKeysForCachePurge[key]) {
						keysToDelete.push(key);
					}
				}

				keysToDelete.forEach(x => { delete mempoolTxSummaryCache[x] });
			});
			

			resolve(results);

		} catch (err) {
			utils.logError("asodfuhou33", err);

			reject(err);
		}
	});
}


const mempoolTxFileCache = utils.fileCache(config.filesystemCacheDir, `mempool-tx-summaries`, 2);

function getMempoolTxSummaries(allTxids, statusId, statusFunc) {
	return new Promise(async (resolve, reject) => {
		try {
			mempoolTxSummaryCache = (mempoolTxFileCache.tryLoadJson() || {});
			

			//const txids = allTxids.slice(0, 50); // for debugging
			const txids = allTxids;

			const txidCount = txids.length;
			let doneCount = 0;

			const statusUpdate = () => { statusFunc({count: txidCount, done: doneCount}); };

			const promises = [];
			const results = [];
			const txidKeysForCachePurge = {};

			const btcToSat = (btcFloat) => {
				return parseInt(new Decimal(btcFloat).times(SATS_PER_BTC).toDP(0));
			};

			for (let i = 0; i < txids.length; i++) {
				const txid = txids[i];
				const key = mempoolCacheKeyForTxid(txid);
				txidKeysForCachePurge[key] = 1;

				if (mempoolTxSummaryCache[key]) {
					const itemSummary = Object.assign({}, mempoolTxSummaryCache[key]);
					itemSummary.key = key;

					results.push(itemSummary);

					doneCount++;
					statusUpdate();

				} else {
					promises.push(new Promise(async (resolve, reject) => {
						try {
							const item = await getMempoolTxDetails(txid, false);
							const itemSummary = {
								f: btcToSat(item.entry.fees.modified),
								
								af: btcToSat(item.entry.fees.ancestor),
								asz: item.entry.ancestorsize,

								a: item.entry.depends.map(x => mempoolCacheKeyForTxid(x)),

								t: item.entry.time,
								w: item.entry.weight ? item.entry.weight : item.entry.size * 4,
							};

							mempoolTxSummaryCache[key] = itemSummary;

							const itemSummaryWithKey = Object.assign({}, itemSummary);
							itemSummaryWithKey.key = key;

							results.push(itemSummaryWithKey);

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
			let keysToDelete = [];
			for (let key in mempoolTxSummaryCache) {
				if (!txidKeysForCachePurge[key]) {
					keysToDelete.push(key);
				}
			}

			keysToDelete.forEach(x => { delete mempoolTxSummaryCache[x] });

			mempoolTxSummaryCache.lastUpdated = new Date();

			try {
				mempoolTxFileCache.writeJson(mempoolTxSummaryCache);
				
			} catch (e) {
				utils.logError("h32uheifehues", e);
			}

			resolve(results);

		} catch (err) {
			utils.logError("asodfuhou33", err);

			reject(err);
		}
	});
}

function buildMempoolSummary(statusId, ageBuckets, sizeBuckets, statusFunc) {
	return new Promise(async (resolve, reject) => {
		try {
			const allTxids = await utils.timePromise("coreApi_mempool_summary_getAllMempoolTxids", getAllMempoolTxids);

			const txSummaries = await getMempoolTxSummaries(allTxids, statusId, statusFunc);

			const txids = allTxids;

			
			let maxFee = 0;
			let maxFeePerByte = 0;
			let maxAge = 0;
			let maxSize = 0;
			let ages = [];
			let sizes = [];
			let topfees = [];

			for (let i = 0; i < txSummaries.length; i++) {
				let summary = txSummaries[i];

				let fee = summary.f;
				let size = summary.w / 4; // TOOD: hack
				let feePerByte = summary.f / summary.w;
				let age = Date.now() / 1000 - summary.t;

				if (fee > maxFee) {
					maxFee = fee;
				}

				if (feePerByte > maxFeePerByte) {
					maxFeePerByte = feePerByte;
				}

				if (age > maxAge) {
					maxAge = age;
				}

				if (size > maxSize) {
					maxSize = size;
				}

				ages.push({age:age, txidKey:summary.key});
				sizes.push({size:size, txidKey:summary.key});
				topfees.push({feePerByte:feePerByte, txidKey:summary.key});
			}

			ages.sort(function(a, b) {
				if (a.age != b.age) {
					return b.age - a.age;

				} else {
					return a.txidKey.localeCompare(b.txidKey);
				}
			});

			sizes.sort(function(a, b) {
				if (a.size != b.size) {
					return b.size - a.size;

				} else {
					return a.txidKey.localeCompare(b.txidKey);
				}
			});

			topfees.sort(function(a, b) {
				if (a.feePerByte != b.feePerByte) {
					return b.feePerByte - a.feePerByte;

				} else {
					return a.txidKey.localeCompare(b.txidKey);
				}
			});

			//maxSize = 2000;

			const feeBucketMaxCount = 250;
			const feeSatoshiBuckets = [];
			for (let i = 0; i < feeBucketMaxCount; i++) {
				feeSatoshiBuckets.push(i);
			}

			let satoshiPerByteBucketMaxima = feeSatoshiBuckets;

			let bucketCount = satoshiPerByteBucketMaxima.length + 1;

			let satoshiPerByteBuckets = [];
			let satoshiPerByteBucketLabels = [];

			//satoshiPerByteBucketLabels[0] = ("[0 - " + satoshiPerByteBucketMaxima[0] + ")");
			for (let i = 1; i < bucketCount; i++) {
				satoshiPerByteBuckets.push({
					count: 0,
					totalFees: new Decimal(0),
					totalBytes: 0,
					totalWeight: 0,
					minFeeRate: satoshiPerByteBucketMaxima[i - 1],
					maxFeeRate: satoshiPerByteBucketMaxima[i]
				});

				if (i > 0 && i < bucketCount - 1) {
					satoshiPerByteBucketLabels.push("[" + satoshiPerByteBucketMaxima[i - 1] + " - " + satoshiPerByteBucketMaxima[i] + ")");
				}
			}

			let ageBucketCount = sizeBuckets;
			let ageBucketTxCounts = [];
			let ageBucketLabels = [];

			let sizeBucketCount = sizeBuckets;
			let sizeBucketTxCounts = [];
			let sizeBucketLabels = [];

			let topfeeBucketCount = sizeBuckets;
			let topfeeBucketTxCounts = [];
			let topfeeBucketLabels = [];

			for (let i = 0; i < ageBucketCount; i++) {
				let rangeMin = i * maxAge / ageBucketCount;
				let rangeMax = (i + 1) * maxAge / ageBucketCount;

				ageBucketTxCounts.push(0);

				if (maxAge > 60 * 60 * 24) {
					let rangeMinutesMin = new Decimal(rangeMin / 60 / 60 / 24).toFixed(1);
					let rangeMinutesMax = new Decimal(rangeMax / 60 / 60 / 24).toFixed(1);

					ageBucketLabels.push(rangeMinutesMax + "d");

				} else if (maxAge > 60 * 60) {
					let rangeMinutesMin = new Decimal(rangeMin / 60 / 60).toFixed(1);
					let rangeMinutesMax = new Decimal(rangeMax / 60 / 60).toFixed(1);

					ageBucketLabels.push(rangeMinutesMax + "m");

				} else if (maxAge > 60 * 10) {
					let rangeMinutesMin = new Decimal(rangeMin / 60).toFixed(1);
					let rangeMinutesMax = new Decimal(rangeMax / 60).toFixed(1);

					ageBucketLabels.push(rangeMinutesMax + "m");

				} else {
					ageBucketLabels.push(parseInt(rangeMax) + "s");
				}
			}

			for (let i = 0; i < sizeBucketCount; i++) {
				sizeBucketTxCounts.push(0);

				if (i == sizeBucketCount - 1) {
					sizeBucketLabels.push(parseInt(i * maxSize / sizeBucketCount) + "+");

				} else if (i == 0) {
					sizeBucketLabels.push(parseInt(i * maxSize / sizeBucketCount) + " - " + parseInt((i + 1) * maxSize / sizeBucketCount));

				} else {
					sizeBucketLabels.push(parseInt((i + 1) * maxSize / sizeBucketCount));
				}
			}

			satoshiPerByteBucketLabels[bucketCount - 1] = (satoshiPerByteBucketMaxima[satoshiPerByteBucketMaxima.length - 1] + "+");

			const oldestLargestCount = 20;

			let summary = {
				"count": 0,
				"totalFees": new Decimal(0),
				"totalBytes": 0,
				"totalWeight": 0,
				"satoshiPerByteBuckets": satoshiPerByteBuckets,
				"satoshiPerByteBucketLabels": satoshiPerByteBucketLabels,
				"ageBucketTxCounts": ageBucketTxCounts,
				"ageBucketLabels": ageBucketLabels,
				"sizeBucketTxCounts": sizeBucketTxCounts,
				"sizeBucketLabels": sizeBucketLabels,
				"oldestTxs": ages.slice(0, oldestLargestCount),
				"largestTxs": sizes.slice(0, oldestLargestCount),
				"highestFeeTxs": topfees.slice(0, oldestLargestCount)
			};


			for (let i = 0; i < oldestLargestCount; i++) {
				let oldTx = summary.oldestTxs[i];
				let largeTx = summary.largestTxs[i];
				let topfeeTx = summary.highestFeeTxs[i];

				for (let j = 0; j < txSummaries.length; j++) {
					if (oldTx && txids[j].startsWith(oldTx.txidKey)) {
						oldTx.txid = txids[j];

						break;
					}
				}

				for (let j = 0; j < txids.length; j++) {
					if (largeTx && txids[j].startsWith(largeTx.txidKey)) {
						largeTx.txid = txids[j];

						break;
					}
				}

				for (let j = 0; j < txSummaries.length; j++) {
					if (topfeeTx && txids[j].startsWith(topfeeTx.txidKey)) {
						topfeeTx.txid = txids[j];

						break;
					}
				}
			}

			for (let x = 0; x < txSummaries.length; x++) {
				let txMempoolInfo = txSummaries[x];
				let fee = txMempoolInfo.f;
				let size = txMempoolInfo.w / 4;
				let weight = txMempoolInfo.w;
				let feePerByte = new Decimal(txMempoolInfo.f).dividedBy(SATS_PER_BTC).toNumber() / weight;
				let satoshiPerByte = feePerByte * SATS_PER_BTC;
				let age = Date.now() / 1000 - txMempoolInfo.t;

				let addedToBucket = false;
				for (let i = 0; i < satoshiPerByteBuckets.length; i++) {
					if (satoshiPerByteBuckets[i].maxFeeRate > satoshiPerByte) {
						satoshiPerByteBuckets[i]["count"]++;
						satoshiPerByteBuckets[i]["totalFees"] = satoshiPerByteBuckets[i]["totalFees"].plus(new Decimal(fee).dividedBy(SATS_PER_BTC));
						satoshiPerByteBuckets[i]["totalBytes"] += size;
						satoshiPerByteBuckets[i]["totalWeight"] += weight;

						addedToBucket = true;

						break;
					}
				}

				if (!addedToBucket) {
					satoshiPerByteBuckets[bucketCount - 2]["count"]++;
					satoshiPerByteBuckets[bucketCount - 2]["totalFees"] = satoshiPerByteBuckets[bucketCount - 2]["totalFees"].plus(new Decimal(fee).dividedBy(SATS_PER_BTC));
					satoshiPerByteBuckets[bucketCount - 2]["totalBytes"] += size;
					satoshiPerByteBuckets[bucketCount - 2]["totalWeight"] += weight;
				}

				summary["count"]++;
				summary["totalFees"] = summary.totalFees.plus(new Decimal(fee).dividedBy(SATS_PER_BTC));
				summary["totalBytes"] += size;
				summary["totalWeight"] += weight;

				let ageBucketIndex = Math.min(ageBucketCount - 1, parseInt(age / (maxAge / ageBucketCount)));
				let sizeBucketIndex = Math.min(sizeBucketCount - 1, parseInt(size / (maxSize / sizeBucketCount)));

				ageBucketTxCounts[ageBucketIndex]++;
				sizeBucketTxCounts[sizeBucketIndex]++;
			}

			let topTargetPercent = 0.25;
			let totWeight = 0;
			let topIndex = -1;
			for (let i = satoshiPerByteBuckets.length - 1; i >= 0; i--) {
				totWeight += satoshiPerByteBuckets[i].totalWeight;

				if (totWeight / summary.totalWeight * 100 > topTargetPercent) {
					topIndex = i;

					break;
				}
			}

			summary.satoshiPerByteBucketLabels = summary.satoshiPerByteBucketLabels.slice(0, topIndex);

			if (topIndex < feeBucketMaxCount) {
				summary.satoshiPerByteBucketLabels.push(topIndex + "+");
			}

			
			if (topIndex < satoshiPerByteBuckets.length) {
				satoshiPerByteBuckets[topIndex].buckets = 0;

				// merge the top buckets into one
				for (let i = topIndex + 1; i < satoshiPerByteBuckets.length; i++) {
					satoshiPerByteBuckets[topIndex].count += satoshiPerByteBuckets[i].count;
					satoshiPerByteBuckets[topIndex].totalFees = satoshiPerByteBuckets[topIndex].totalFees.plus(satoshiPerByteBuckets[i].totalFees);
					satoshiPerByteBuckets[topIndex].totalBytes += satoshiPerByteBuckets[i].totalBytes;
					satoshiPerByteBuckets[topIndex].totalWeight += satoshiPerByteBuckets[i].totalWeight;
					satoshiPerByteBuckets[topIndex].buckets++;
				}

				satoshiPerByteBuckets = satoshiPerByteBuckets.slice(0, topIndex + 1);
				satoshiPerByteBucketMaxima = satoshiPerByteBucketMaxima.slice(0, topIndex + 1);
			}

			summary["averageFee"] = summary["totalFees"] / summary["count"];
			summary["averageFeePerByte"] = summary["totalFees"] / summary["totalBytes"];

			summary["satoshiPerByteBucketMaxima"] = satoshiPerByteBucketMaxima;
			summary.satoshiPerByteBuckets = satoshiPerByteBuckets;
			summary["satoshiPerByteBucketCounts"] = [];
			summary["satoshiPerByteBucketTotalFees"] = [];

			for (let i = 0; i < satoshiPerByteBuckets.length; i++) {
				summary["satoshiPerByteBucketCounts"].push(summary["satoshiPerByteBuckets"][i]["count"]);
				summary["satoshiPerByteBucketTotalFees"].push(summary["satoshiPerByteBuckets"][i]["totalFees"]);
			}


			// we're done, make sure statusFunc knows it
			statusFunc({count: txSummaries.length, done: txSummaries.length});


			resolve(summary);

		} catch (err) {
			utils.logError("23947ryfuedge", err);

			reject(err);
		}
	});
}

function buildPredictedBlocks(statusId, statusFunc) {
	return new Promise(async (resolve, reject) => {
		try {
			const allTxids = await utils.timePromise("coreApi_mempool_summary_getAllMempoolTxids", getAllMempoolTxids);

			const txSummaries = await getMempoolTxSummaries(allTxids, statusId, statusFunc);

			const blockTemplate = {
				weight: 0,
				totalFees: new Decimal(0),
				vB: 0,
				txCount:0,
				minFeeRate: 1000000,
				maxFeeRate: -1,
				feeRates: [],
				weightByFeeRate: {},
				txids: []
			};

			const blocks = [];
			
			txSummaries.sort((a, b) => {
				let aFeeRate = (a.af) / (a.asz * 4);
				let bFeeRate = (b.af) / (b.asz * 4);

				if (aFeeRate > bFeeRate) {
					return -1;

				} else if (aFeeRate < bFeeRate) {
					return 1;

				} else {
					return a.key.localeCompare(b.key);
				}
			});

			const txSummariesByKey = {};

			for (let i = 0; i < txSummaries.length; i++) {
				let tx = txSummaries[i];
				let feeRate = 4 * (tx.f + tx.af) / (tx.w + tx.asz * 4);
				//console.log("fr: " + feeRate);

				txSummariesByKey[tx.key] = tx;
			}

			//res.locals.topTxs = txSummaries.slice(0, 20);

			let loopCounter = 0;

			const unAddedTxIndexes = [];
			const addedTxids = {};
			
			for (let i = 0; i < txSummaries.length; i++) {
				unAddedTxIndexes.push(i);
			}
			
			while (unAddedTxIndexes.length > 0 && blocks.length < 20) {
				//console.log("txids: " + addedTxids.length);

				let currentBlock = {
					weight: 0,
					totalFees: new Decimal(0),
					vB: 0,
					txCount:0,
					minFeeRate: 1000000,
					maxFeeRate: -1,
					feeRates: [],
					weightByFeeRate: {},
					txids: new Set(),
					txs: []
				};

				let indexesToRemove = [];

				for (let i = 0; i < unAddedTxIndexes.length; i++) {
					loopCounter++;
					if (loopCounter % 1000 == 0) {
						console.log("lop: " + loopCounter);
					}

					const tx = txSummaries[unAddedTxIndexes[i]];

					// this tx has already been added somewhere, possibly by a descendant with a
					// higher fee so we flag for removal and move on
					if (addedTxids[tx.key]) {
						indexesToRemove.push(i);

						continue;
					}

					let weightWithAncestors = (tx.asz * 4);
					
					// TODO?? check if any of our ancestors have already been added to a block
					// and if so, exclude their data from being included along with us
					

					tx.frw = (tx.af) / tx.asz; // ancestor fee and size include current tx
					
					if (currentBlock.weight + coinConfig.minTxWeight > coinConfig.maxBlockWeight) {
						// no more transactions can possibly be added, break to save time
						break;
					}

					if ((currentBlock.weight + weightWithAncestors) <= coinConfig.maxBlockWeight) {
						//console.log("adding tx: " + JSON.stringify(tx));

						let startSize = currentBlock.txids.size;
						
						currentBlock.txids.add(tx.key);
						tx.a.forEach(ancesTxidKey => currentBlock.txids.add(ancesTxidKey));

						let sizeChange = currentBlock.txids.size - startSize;
						if (sizeChange != (1 + tx.a.length)) {
							console.log("DUPLICATEEEE");
						}

						currentBlock.weight += weightWithAncestors;
						currentBlock.totalFees = currentBlock.totalFees.plus(new Decimal(tx.f)).plus(new Decimal(tx.af));
						currentBlock.vB += weightWithAncestors / 4;

						let feeRate = tx.frw;

						if (feeRate > currentBlock.maxFeeRate) {
							currentBlock.maxFeeRate = feeRate;
							currentBlock.maxFeeRateTx = tx.key;
						}

						if (feeRate < currentBlock.minFeeRate) {
							currentBlock.minFeeRate = feeRate;
							currentBlock.minFeeRateTx = tx.key;
						}

						let feeRateGroup = feeRate;
						
						if (feeRateGroup > 100) {
							feeRateGroup = Math.floor(feeRateGroup / 20) * 20;
						}
						
						if (feeRateGroup > 20) {
							feeRateGroup = Math.floor(feeRateGroup / 10) * 10;
						}

						if (feeRateGroup > 5) {
							feeRateGroup = Math.floor(feeRateGroup / 5) * 5;

						} else {
							console.log(JSON.stringify(tx));
						}

						feeRateGroup = Math.floor(feeRateGroup);
						
						if (!currentBlock.feeRates.includes(feeRateGroup)) {
							currentBlock.feeRates.push(feeRateGroup);
							currentBlock.weightByFeeRate[feeRateGroup] = 0;
						}

						currentBlock.weightByFeeRate[feeRateGroup] += weightWithAncestors;

						addedTxids[tx.key] = true;
						tx.a.forEach(ancesTxidKey => addedTxids[ancesTxidKey] = true);

						//currentBlock.txids.push(tx.key);

						indexesToRemove.push(i);



						if (currentBlock.txs.length < 100) {
							currentBlock.txs.push({txid:tx.key, feeRate:feeRate});

							tx.a.forEach(ancesTxidKey => {
								let ancesTx = txSummariesByKey[ancesTxidKey];

								if (ancesTx) {
									ancesTx.childOf = tx.key;
									currentBlock.txs.push({txid:ancesTx.key, childOf:tx.key});

								} else {
									console.log("WTF");
								}

								
							});
						}
					}
				}

				for (let i = indexesToRemove.length - 1; i >= 0; i--) {
					unAddedTxIndexes.splice(indexesToRemove[i], 1);
				}

				// we went through all txs and no more fit in the current block
				// so let's finish this one up and add it to the list
				currentBlock.txCount = currentBlock.txids.size;
				currentBlock.avgFee = currentBlock.totalFees.dividedBy(currentBlock.txCount).toDP(8);
				currentBlock.avgFeeRate = currentBlock.totalFees.dividedBy(currentBlock.vB).times(100000000).toDP(1);

				blocks.push(currentBlock);

				// ...and start a new block
				//currentBlock = Object.assign({}, blockTemplate);
				
				console.log("block finished: " + JSON.stringify(currentBlock));
			}

			console.log("loops: " + loopCounter);

			//console.log("all blocks: " + JSON.stringify(blocks, null, 4));
			
			// we're done, make sure statusFunc knows it
			statusFunc({count: txSummaries.length, done: txSummaries.length});


			resolve(blocks);

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
			let lines = helpContent.split("\n");
			let sections = [];

			lines.forEach(function(line) {
				if (line.startsWith("==")) {
					let sectionName = line.substring(2);
					sectionName = sectionName.substring(0, sectionName.length - 2).trim();

					sections.push({name:sectionName, methods:[]});

				} else if (line.trim().length > 0) {
					let methodName = line.trim();

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
	let rpcApiFunction = function() {
		return rpcApi.getRpcMethodHelp(methodName);
	};

	return new Promise(function(resolve, reject) {
		tryCacheThenRpcApi(miscCache, "getHelp-" + methodName, ONE_DAY, rpcApiFunction).then(function(helpContent) {
			let output = {};
			output.string = helpContent;

			let str = helpContent;

			let lines = str.split("\n");
			let argumentLines = [];
			let catchArgs = false;
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

			let args = [];
			let argX = null;
			// looking for line starting with "N. " where N is an integer (1-2 digits)
			argumentLines.forEach(function(line) {
				let regex = /^([0-9]+)\.\s*"?(\w+)"?\s*\(([^,)]*),?\s*([^,)]*),?\s*([^,)]*),?\s*([^,)]*)?\s*\)\s*(.+)?$/;

				let match = regex.exec(line);

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
	let itemCounts = [ miscCache.itemCount, blockCache.itemCount, txCache.itemCount ];
	
	let stream = fs.createWriteStream("memoryUsage.csv", {flags:'a'});
	stream.write("itemCounts: " + JSON.stringify(itemCounts) + "\n");
	stream.end();
}

module.exports = {
	getGenesisBlockHash: getGenesisBlockHash,
	getGenesisCoinbaseTransactionId: getGenesisCoinbaseTransactionId,
	getBlockchainInfo: getBlockchainInfo,
	getDeploymentInfo: getDeploymentInfo,
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
	getTxStats: getTxStats,
	getSmartFeeEstimates: getSmartFeeEstimates,
	getSmartFeeEstimate: getSmartFeeEstimate,
	getUtxoSetSummary: getUtxoSetSummary,
	getNetworkHashrate: getNetworkHashrate,
	getBlockStats: getBlockStats,
	getBlockStatsByHeight: getBlockStatsByHeight,
	getBlocksStatsByHeight: getBlocksStatsByHeight,
	buildBlockAnalysisData: buildBlockAnalysisData,
	getBlockHeaderByHash: getBlockHeaderByHash,
	getBlockHeaderByHeight: getBlockHeaderByHeight,
	getBlockHeadersByHeight: getBlockHeadersByHeight,
	getTxOut: getTxOut,
	buildMempoolSummary: buildMempoolSummary,
	buildPredictedBlocks: buildPredictedBlocks,
	buildMiningSummary: buildMiningSummary,
	getCachedMempoolTxSummaries: getCachedMempoolTxSummaries,
	getMempoolTxSummaries: getMempoolTxSummaries,
	getBlockTemplate: getBlockTemplate,
	getNextBlockEstimate: getNextBlockEstimate,
	getDifficultyByBlockHeights: getDifficultyByBlockHeights
};
