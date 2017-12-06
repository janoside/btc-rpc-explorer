var utils = require("./utils.js");

var genesisCoinbaseTransactionTxid = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";
var genesisCoinbaseTransaction = {
	"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0804ffff001d02fd04ffffffff0100f2052a01000000434104f5eeb2b10c944c6b9fbcfff94c35bdeecd93df977882babc7f3a2cf7f5c81d3b09a68db7f0e04f21de5d4230e75e6dbe7ad16eefe0d4325a62067dc6f369446aac00000000",
	"txid": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
	"hash": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
	"size": 204,
	"vsize": 204,
	"version": 1,
	"confirmations":475000,
	"vin": [
		{
			"coinbase": "04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73",
			"sequence": 4294967295
		}
	],
	"vout": [
		{
			"value": 50,
			"n": 0,
			"scriptPubKey": {
				"asm": "04f5eeb2b10c944c6b9fbcfff94c35bdeecd93df977882babc7f3a2cf7f5c81d3b09a68db7f0e04f21de5d4230e75e6dbe7ad16eefe0d4325a62067dc6f369446a OP_CHECKSIG",
				"hex": "4104f5eeb2b10c944c6b9fbcfff94c35bdeecd93df977882babc7f3a2cf7f5c81d3b09a68db7f0e04f21de5d4230e75e6dbe7ad16eefe0d4325a62067dc6f369446aac",
				"reqSigs": 1,
				"type": "pubkey",
				"addresses": [
					"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
				]
			}
		}
	],
	"blockhash": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
	"time": 1230988505,
	"blocktime": 1230988505
};

function getInfo() {
	return new Promise(function(resolve, reject) {
		client.cmd('getinfo', function(err, result, resHeaders) {
			if (err) {
				return console.log("Error 3207fh0f: " + err);
			}

			resolve(result);
		});
	});
}

function getMempoolInfo() {
	return new Promise(function(resolve, reject) {
		client.cmd('getmempoolinfo', function(err, result, resHeaders) {
			if (err) {
				return console.log("Error 23407rhwe07fg: " + err);
			}

			resolve(result);
		});
	});
}

function getMempoolStats() {
	return new Promise(function(resolve, reject) {
		client.cmd('getrawmempool', true, function(err, result, resHeaders) {
			if (err) {
				return console.log("Error 428thwre0ufg: " + err);
			}

			console.log("abc: " + JSON.stringify(result).substring(0, 100));

			var compiledResult = {};
			compiledResult.count = 0;
			compiledResult.fee_0_5 = 0;
			compiledResult.fee_6_10 = 0;
			compiledResult.fee_11_25 = 0;
			compiledResult.fee_26_50 = 0;
			compiledResult.fee_51_75 = 0;
			compiledResult.fee_76_100 = 0;
			compiledResult.fee_101_150 = 0;
			compiledResult.fee_151_max = 0;

			var totalFee = 0;
			for (var txid in result) {
				var txMempoolInfo = result[txid];
				totalFee += txMempoolInfo.modifiedfee;
				var feeRate = Math.round(txMempoolInfo.modifiedfee * 100000000 / txMempoolInfo.size);

				if (feeRate <= 5) {
					compiledResult.fee_0_5++;

				} else if (feeRate <= 10) {
					compiledResult.fee_6_10++;

				} else if (feeRate <= 25) {
					compiledResult.fee_11_25++;

				} else if (feeRate <= 50) {
					compiledResult.fee_26_50++;

				} else if (feeRate <= 75) {
					compiledResult.fee_51_75++;

				} else if (feeRate <= 100) {
					compiledResult.fee_76_100++;

				} else if (feeRate <= 150) {
					compiledResult.fee_101_150++;

				} else {
					compiledResult.fee_151_max++;
				}

				compiledResult.count++;
			}

			compiledResult.totalFee = totalFee;

			resolve(compiledResult);
		});
	});
}

function getBlockByHeight(blockHeight) {
	console.log("getBlockByHeight: " + blockHeight);

	return new Promise(function(resolve, reject) {
		var client = global.client;
		
		client.cmd('getblockhash', blockHeight, function(err, result, resHeaders) {
			if (err) {
				return console.log("Error 0928317yr3w: " + err);
			}

			client.cmd('getblock', result, function(err2, result2, resHeaders2) {
				if (err2) {
					return console.log("Error 320fh7e0hg: " + err2);
				}

				resolve({ success:true, getblockhash:result, getblock:result2 });
			});
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
				params: [ blockHeights[i] ]
			});
		}

		var blockHashes = [];
		client.cmd(batch, function(err, result, resHeaders) {
			blockHashes.push(result);

			if (blockHashes.length == batch.length) {
				var batch2 = [];
				for (var i = 0; i < blockHashes.length; i++) {
					batch2.push({
						method: 'getblock',
						params: [ blockHashes[i] ]
					});
				}

				var blocks = [];
				client.cmd(batch2, function(err2, result2, resHeaders2) {
					if (err2) {
						console.log("Error 138ryweufdf: " + err2);
					}

					blocks.push(result2);
					if (blocks.length == batch2.length) {
						resolve(blocks);
					}
				});
			}
		});
	});
}

function getBlockByHash(blockHash) {
	console.log("getBlockByHash: " + blockHash);

	return new Promise(function(resolve, reject) {
		var client = global.client;
		
		client.cmd('getblock', blockHash, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 0u2fgewue: " + err);
			}

			resolve(result);
		});
	});
}

function getTransactionInputs(rpcClient, transaction, inputLimit=0) {
	console.log("getTransactionInputs: " + transaction.txid);

	return new Promise(function(resolve, reject) {
		var txids = [];
		for (var i = 0; i < transaction.vin.length; i++) {
			if (i < inputLimit || inputLimit == 0) {
			txids.push(transaction.vin[i].txid);
		}
		}

		getRawTransactions(txids).then(function(inputTransactions) {
			resolve({ txid:transaction.txid, inputTransactions:inputTransactions });
		});
	});
}

function getRawTransaction(txid) {
	return new Promise(function(resolve, reject) {
		if (txid == genesisCoinbaseTransactionTxid) {
			getBlockByHeight(0).then(function(blockZeroResult) {
				var result = genesisCoinbaseTransaction;
				result.confirmations = blockZeroResult.getblock.confirmations;

				resolve(result);
			});
			
			return;
		}

		client.cmd('getrawtransaction', txid, 1, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 329813yre823: " + err);
			}

			resolve(result);
		});
	});
}

function getRawTransactions(txids) {
	console.log("getRawTransactions: " + txids);

	return new Promise(function(resolve, reject) {
		if (!txids || txids.length == 0) {
			resolve([]);

			return;
		}

		if (txids.length == 1 && txids[0] == "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b") {
			// copy the "confirmations" field from genesis block to the genesis-coinbase tx
			getBlockByHeight(0).then(function(blockZeroResult) {
				var result = genesisCoinbaseTransaction;
				result.confirmations = blockZeroResult.getblock.confirmations;

				resolve([result]);
			});

			return;
		}

		var requests = [];
		for (var i = 0; i < txids.length; i++) {
			var txid = txids[i];
			
			if (txid) {
				requests.push({
					method: 'getrawtransaction',
					params: [ txid, 1 ]
				});
			}
		}

		var requestBatches = utils.splitArrayIntoChunks(requests, 20);

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

	client.cmd(batches[currentIndex], function(err, result, resHeaders) {
		if (err) {
			console.log("Error f83024hf4: " + err);
		}

		accumulatedResults.push(result);

		count--;

		if (count == 0) {
			executeBatchesSequentiallyInternal(batchId, batches, currentIndex + 1, accumulatedResults, resultFunc);
		}
	});
}

function getBlockData(rpcClient, blockHash, txLimit, txOffset) {
	console.log("getBlockData: " + blockHash);

	return new Promise(function(resolve, reject) {
		client.cmd('getblock', blockHash, function(err2, result2, resHeaders2) {
			if (err2) {
				console.log("Error 3017hfwe0f: " + err2);

				reject(err2);

				return;
			}

			var txids = [];
			for (var i = txOffset; i < Math.min(txOffset + txLimit, result2.tx.length); i++) {
				txids.push(result2.tx[i]);
			}

			getRawTransactions(txids).then(function(transactions) {
				var txInputsByTransaction = {};

				var promises = [];
				for (var i = 0; i < transactions.length; i++) {
					var transaction = transactions[i];

					if (transaction) {
						promises.push(getTransactionInputs(client, transaction, 10));
					}
				}

				Promise.all(promises).then(function() {
					var results = arguments[0];
					for (var i = 0; i < results.length; i++) {
						var resultX = results[i];

						txInputsByTransaction[resultX.txid] = resultX.inputTransactions;
					}

					resolve({ getblock:result2, transactions:transactions, txInputsByTransaction:txInputsByTransaction });
				});
			});
		});
	});
}

module.exports = {
	getInfo: getInfo,
	getMempoolInfo: getMempoolInfo,
	getBlockByHeight: getBlockByHeight,
	getBlocksByHeight: getBlocksByHeight,
	getBlockByHash: getBlockByHash,
	getTransactionInputs: getTransactionInputs,
	getBlockData: getBlockData,
	getRawTransaction: getRawTransaction,
	getRawTransactions: getRawTransactions,
	getMempoolStats: getMempoolStats
};