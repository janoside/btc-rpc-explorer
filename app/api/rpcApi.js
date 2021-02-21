var debug = require('debug');

var debugLog = debug("btcexp:rpc");

var async = require("async");
var semver = require("semver");

var utils = require("../utils.js");
var config = require("../config.js");
var coins = require("../coins.js");

var activeQueueTasks = 0;

var rpcQueue = async.queue(function(task, callback) {
	activeQueueTasks++;
	//debugLog("activeQueueTasks: " + activeQueueTasks);

	task.rpcCall(function() {
		callback();

		activeQueueTasks--;
		//debugLog("activeQueueTasks: " + activeQueueTasks);
	});

}, config.rpcConcurrency);

var minRpcVersions = {getblockstats:"0.17.0"};

global.rpcStats = {};



function getBlockchainInfo() {
	return new Promise((resolve, reject) => {
		getRpcData("getblockchaininfo").then((getblockchaininfo) => {
			// keep global.pruneHeight updated
			if (getblockchaininfo.pruned) {
				global.pruneHeight = getblockchaininfo.pruneheight;
			}

			resolve(getblockchaininfo);
			
		}).catch(reject);
	});
	
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

function getMiningInfo() {
	return getRpcData("getmininginfo");
}

function getIndexInfo() {
	return getRpcData("getindexinfo");
}

function getUptimeSeconds() {
	return getRpcData("uptime");
}

function getPeerInfo() {
	return getRpcData("getpeerinfo");
}

function getMempoolTxids() {
	return getRpcDataWithParams({method:"getrawmempool", parameters:[false]});
}

function getSmartFeeEstimate(mode="CONSERVATIVE", confTargetBlockCount) {
	return getRpcDataWithParams({method:"estimatesmartfee", parameters:[confTargetBlockCount, mode]});
}

function getNetworkHashrate(blockCount=144) {
	return getRpcDataWithParams({method:"getnetworkhashps", parameters:[blockCount]});
}

function getBlockStats(hash) {
	if (semver.gte(global.btcNodeSemver, minRpcVersions.getblockstats)) {
		if (hash == coinConfig.genesisBlockHashesByNetwork[global.activeBlockchain] && coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]) {
			return new Promise(function(resolve, reject) {
				resolve(coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]);
			});

		} else {
			return getRpcDataWithParams({method:"getblockstats", parameters:[hash]});
		}
	} else {
		// unsupported
		return unsupportedPromise(minRpcVersions.getblockstats);
	}
}

function getBlockStatsByHeight(height) {
	if (semver.gte(global.btcNodeSemver, minRpcVersions.getblockstats)) {
		if (height == 0 && coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]) {
			return new Promise(function(resolve, reject) {
				resolve(coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]);
			});
			
		} else {
			return getRpcDataWithParams({method:"getblockstats", parameters:[height]});
		}
	} else {
		// unsupported
		return unsupportedPromise(minRpcVersions.getblockstats);
	}
}

function getUtxoSetSummary() {
	return getRpcData("gettxoutsetinfo");
}

function getRawMempool() {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getrawmempool", parameters:[false]}).then(function(txids) {
			var promises = [];

			for (var i = 0; i < txids.length; i++) {
				var txid = txids[i];

				promises.push(getRawMempoolEntry(txid));
			}

			Promise.all(promises).then(function(results) {
				var finalResult = {};

				for (var i = 0; i < results.length; i++) {
					if (results[i] != null) {
						finalResult[results[i].txid] = results[i];
					}
				}

				resolve(finalResult);

			}).catch(function(err) {
				reject(err);
			});

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getRawMempoolEntry(txid) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolentry", parameters:[txid]}).then(function(result) {
			result.txid = txid;

			resolve(result);

		}).catch(function(err) {
			resolve(null);
		});
	});
}

function getChainTxStats(blockCount) {
	return getRpcDataWithParams({method:"getchaintxstats", parameters:[blockCount]});
}

function getBlockByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]}).then(function(blockhash) {
			getBlockByHash(blockhash).then(function(block) {
				resolve(block);

			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockHeaderByHash(blockhash) {
	return getRpcDataWithParams({method:"getblockheader", parameters:[blockhash]});
}

function getBlockHeaderByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]}).then(function(blockhash) {
			getBlockHeaderByHash(blockhash).then(function(blockHeader) {
				resolve(blockHeader);

			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockHashByHeight(blockHeight) {
	return getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]});
}

function getBlockByHash(blockHash) {
	debugLog("getBlockByHash: %s", blockHash);

	return getRpcDataWithParams({method:"getblock", parameters:[blockHash]})
		.then(function(block) {
			return getRawTransaction(block.tx[0], blockHash).then(function(tx) {
				block.coinbaseTx = tx;
				block.totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(tx, block.height);
				block.miner = utils.getMinerFromCoinbaseTx(tx);
				return block;
			})
		}).catch(function(err) {
				// the block is pruned, use `getblockheader` instead
				debugLog('getblock failed, falling back to getblockheader', blockHash, err);
				return getRpcDataWithParams({method:"getblockheader", parameters:[blockHash]})
					.then(function(block) { block.tx = []; return block });
		}).then(function(block) {
				block.subsidy = coinConfig.blockRewardFunction(block.height, global.activeBlockchain);
				return block;
		})
}

function getAddress(address) {
	return getRpcDataWithParams({method:"validateaddress", parameters:[address]});
}

function getRawTransaction(txid, blockhash) {
	debugLog("getRawTransaction: %s %s", txid, blockhash);

	return new Promise(function(resolve, reject) {
		if (coins[config.coin].genesisCoinbaseTransactionIdsByNetwork[global.activeBlockchain] && txid == coins[config.coin].genesisCoinbaseTransactionIdsByNetwork[global.activeBlockchain]) {
			// copy the "confirmations" field from genesis block to the genesis-coinbase tx
			getBlockchainInfo().then(function(blockchainInfoResult) {
				var result = coins[config.coin].genesisCoinbaseTransactionsByNetwork[global.activeBlockchain];
				result.confirmations = blockchainInfoResult.blocks;

				// hack: default regtest node returns "0" for number of blocks, despite including a genesis block;
				// to display this block without errors, tag it with 1 confirmation
				if (global.activeBlockchain == "regtest" && result.confirmations == 0) {
					result.confirmations = 1;
				}

				resolve(result);

			}).catch(function(err) {
				reject(err);
			});

		} else {
			var extra_params = blockhash ? [ blockhash ] : [];
			getRpcDataWithParams({method:"getrawtransaction", parameters:[txid, 1, ...extra_params]}).then(function(result) {
				if (result == null || result.code && result.code < 0) {
					reject(result);

					return;
				}

				resolve(result);

			}).catch(function(err) {
				if (!global.txindexAvailable && !blockhash) {
					noTxIndexTransactionLookup(txid).then(resolve, reject);
					
				} else {
					reject(err);
				}
			});
		}
	});
}

async function noTxIndexTransactionLookup(txid) {
	// Try looking up with an external Electrum server, using 'get_confirmed_blockhash'.
	// This is only available in Electrs and requires enabling BTCEXP_ELECTRUM_TXINDEX.
	if (config.addressApi == "electrumx" && config.electrumTxIndex) {
		try {
			var blockhash = await electrumAddressApi.lookupTxBlockHash(txid);
			return await getRawTransaction(txid, blockhash);
		} catch (err) {
			debugLog(`Electrs blockhash lookup failed for ${txid}:`, err);
		}
	}

	// Try looking up in wallet transactions
	for (var wallet of await listWallets()) {
		try { return await getWalletTransaction(wallet, txid); }
		catch (_) {}
	}

	// Try looking up in recent blocks
	var tip_height = await getRpcDataWithParams({method:"getblockcount", parameters:[]});
	for (var height=tip_height; height>Math.max(tip_height - config.noTxIndexSearchDepth, 0); height--) {
		var blockhash = await getRpcDataWithParams({method:"getblockhash", parameters:[height]});
		try { return await getRawTransaction(txid, blockhash); }
		catch (_) {}
	}

	throw new Error(`The requested tx ${txid} cannot be found in wallet transactions, mempool transactions, or recently confirmed transactions`)
}

function listWallets() {
	return getRpcDataWithParams({method:"listwallets", parameters:[]})
}

async function getWalletTransaction(wallet, txid) {
	global.rpcClient.wallet = wallet;
	try {
		return await getRpcDataWithParams({method:"gettransaction", parameters:[ txid, true, true ]})
			.then(wtx => ({ ...wtx, ...wtx.decoded, decoded: null }))
	} finally {
		global.rpcClient.wallet = null;
	}
}

function getUtxo(txid, outputIndex) {
	debugLog("getUtxo: %s (%d)", txid, outputIndex);

	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"gettxout", parameters:[txid, outputIndex]}).then(function(result) {
			if (result == null) {
				resolve("0");

				return;
			}

			if (result.code && result.code < 0) {
				reject(result);

				return;
			}

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getMempoolTxDetails(txid, includeAncDec=true) {
	debugLog("getMempoolTxDetails: %s", txid);

	var promises = [];

	var mempoolDetails = {};

	promises.push(new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolentry", parameters:[txid]}).then(function(result) {
			mempoolDetails.entry = result;

			resolve();

		}).catch(function(err) {
			reject(err);
		});
	}));

	if (includeAncDec) {
		promises.push(new Promise(function(resolve, reject) {
			getRpcDataWithParams({method:"getmempoolancestors", parameters:[txid]}).then(function(result) {
				mempoolDetails.ancestors = result;

				resolve();

			}).catch(function(err) {
				reject(err);
			});
		}));

		promises.push(new Promise(function(resolve, reject) {
			getRpcDataWithParams({method:"getmempooldescendants", parameters:[txid]}).then(function(result) {
				mempoolDetails.descendants = result;

				resolve();

			}).catch(function(err) {
				reject(err);
			});
		}));
	}

	return new Promise(function(resolve, reject) {
		Promise.all(promises).then(function() {
			resolve(mempoolDetails);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getTxOut(txid, vout) {
	return getRpcDataWithParams({method:"gettxout", parameters:[txid, vout]});
}

function getHelp() {
	return getRpcData("help");
}

function getRpcMethodHelp(methodName) {
	return getRpcDataWithParams({method:"help", parameters:[methodName]});
}



function getRpcData(cmd) {
	var startTime = new Date().getTime();

	return new Promise(function(resolve, reject) {
		debugLog(`RPC: ${cmd}`);

		rpcCall = function(callback) {
			var client = (cmd == "gettxoutsetinfo" ? global.rpcClientNoTimeout : global.rpcClient);

			client.command(cmd, function(err, result, resHeaders) {
				try {
					if (err) {
						logStats(cmd, false, new Date().getTime() - startTime, false);

						throw new Error(`RpcError: type=failure-01`);
					}

					if (Array.isArray(result) && result.length == 1) {
						var result0 = result[0];
						
						if (result0 && result0.name && result0.name == "RpcError") {
							logStats(cmd, false, new Date().getTime() - startTime, false);

							throw new Error(`RpcError: type=errorResponse-01`);
						}
					}

					if (result.name && result.name == "RpcError") {
						logStats(cmd, false, new Date().getTime() - startTime, false);

						throw new Error(`RpcError: type=errorResponse-02`);
					}

					resolve(result);

					logStats(cmd, false, new Date().getTime() - startTime, true);

					callback();

				} catch (e) {
					e.userData = {error:err, request:cmd, result:result};

					utils.logError("9u4278t5h7rfhgf", e, {error:err, request:cmd, result:result});

					reject(e);

					callback();
				}
			});
		};
		
		rpcQueue.push({rpcCall:rpcCall});
	});
}

function getRpcDataWithParams(request) {
	var startTime = new Date().getTime();

	return new Promise(function(resolve, reject) {
		debugLog(`RPC: ${JSON.stringify(request)}`);

		rpcCall = function(callback) {
			global.rpcClient.command([request], function(err, result, resHeaders) {
				try {
					if (err != null) {
						logStats(request.method, true, new Date().getTime() - startTime, false);

						throw new Error(`RpcError: type=failure-02`);
					}

					if (Array.isArray(result) && result.length == 1) {
						var result0 = result[0];

						if (result0 && result0.name && result0.name == "RpcError") {
							logStats(request.method, true, new Date().getTime() - startTime, false);

							throw new Error(`RpcError: type=errorResponse-03`);
						}
					}

					if (result.name && result.name == "RpcError") {
						logStats(request.method, true, new Date().getTime() - startTime, false);

						throw new Error(`RpcError: type=errorResponse-04`);
					}

					resolve(result[0]);

					logStats(request.method, true, new Date().getTime() - startTime, true);

					callback();

				} catch (e) {
					e.userData = {error:err, request:request, result:result};

					utils.logError("283h7ewsede", e, {error:err, request:request, result:result});

					reject(e);

					callback();
				}
			});
		};
		
		rpcQueue.push({rpcCall:rpcCall});
	});
}

function unsupportedPromise(minRpcVersionNeeded) {
	return new Promise(function(resolve, reject) {
		resolve({success:false, error:"Unsupported", minRpcVersionNeeded:minRpcVersionNeeded});
	});
}

function logStats(cmd, hasParams, dt, success) {
	if (!global.rpcStats[cmd]) {
		global.rpcStats[cmd] = {count:0, withParams:0, time:0, successes:0, failures:0};
	}

	global.rpcStats[cmd].count++;
	global.rpcStats[cmd].time += dt;

	if (hasParams) {
		global.rpcStats[cmd].withParams++;
	}

	if (success) {
		global.rpcStats[cmd].successes++;

	} else {
		global.rpcStats[cmd].failures++;
	}
}


module.exports = {
	getBlockchainInfo: getBlockchainInfo,
	getNetworkInfo: getNetworkInfo,
	getNetTotals: getNetTotals,
	getMempoolInfo: getMempoolInfo,
	getMempoolTxids: getMempoolTxids,
	getMiningInfo: getMiningInfo,
	getIndexInfo: getIndexInfo,
	getBlockByHeight: getBlockByHeight,
	getBlockByHash: getBlockByHash,
	getRawTransaction: getRawTransaction,
	getUtxo: getUtxo,
	getMempoolTxDetails: getMempoolTxDetails,
	getRawMempool: getRawMempool,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress,
	getPeerInfo: getPeerInfo,
	getChainTxStats: getChainTxStats,
	getSmartFeeEstimate: getSmartFeeEstimate,
	getUtxoSetSummary: getUtxoSetSummary,
	getNetworkHashrate: getNetworkHashrate,
	getBlockStats: getBlockStats,
	getBlockStatsByHeight: getBlockStatsByHeight,
	getBlockHeaderByHash: getBlockHeaderByHash,
	getBlockHeaderByHeight: getBlockHeaderByHeight,
	getBlockHashByHeight: getBlockHashByHeight,
	getTxOut: getTxOut,

	minRpcVersions: minRpcVersions
};