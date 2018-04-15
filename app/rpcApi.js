var utils = require("./utils.js");
var env = require("./env.js");
var coins = require("./coins.js");




function getGenesisBlockHash() {
	return coins[env.coin].genesisBlockHash;
}

function getGenesisCoinbaseTransactionId() {
	return coins[env.coin].genesisCoinbaseTransactionId;
}

function getBlockchainInfo() {
	return new Promise(function(resolve, reject) {
		client.command('getblockchaininfo', function(err, result, resHeaders) {
			if (err) {
				console.log("Error 3207fh0f: " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

function getNetworkInfo() {
	return new Promise(function(resolve, reject) {
		client.command('getnetworkinfo', function(err, result, resHeaders) {
			if (err) {
				console.log("Error 239r7ger7gy: " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

function getNetTotals() {
	return new Promise(function(resolve, reject) {
		client.command('getnettotals', function(err, result, resHeaders) {
			if (err) {
				console.log("Error as07uthf40ghew: " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

function getMempoolInfo() {
	return new Promise(function(resolve, reject) {
		client.command('getmempoolinfo', function(err, result, resHeaders) {
			if (err) {
				console.log("Error 23407rhwe07fg: " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

function getUptimeSeconds() {
	return new Promise(function(resolve, reject) {
		client.command('uptime', function(err, result, resHeaders) {
			if (err) {
				console.log("Error 3218y6gr3986sdd: " + err);

				reject(err);

				return;
			}

			resolve(result);
		});
	});
}

function getMempoolStats() {
	return new Promise(function(resolve, reject) {
		client.command('getrawmempool', true, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 428thwre0ufg: " + err);

				reject(err);

				return;
			}

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

			compiledResult.totalfee_0_5 = 0;
			compiledResult.totalfee_6_10 = 0;
			compiledResult.totalfee_11_25 = 0;
			compiledResult.totalfee_26_50 = 0;
			compiledResult.totalfee_51_75 = 0;
			compiledResult.totalfee_76_100 = 0;
			compiledResult.totalfee_101_150 = 0;
			compiledResult.totalfee_151_max = 0;

			var totalFee = 0;
			for (var txid in result) {
				var txMempoolInfo = result[txid];
				totalFee += txMempoolInfo.modifiedfee;

				var feeRate = Math.round(txMempoolInfo.modifiedfee * 100000000 / txMempoolInfo.size);

				if (feeRate <= 5) {
					compiledResult.fee_0_5++;
					compiledResult.totalfee_0_5 += txMempoolInfo.modifiedfee;

				} else if (feeRate <= 10) {
					compiledResult.fee_6_10++;
					compiledResult.totalfee_6_10 += txMempoolInfo.modifiedfee;

				} else if (feeRate <= 25) {
					compiledResult.fee_11_25++;
					compiledResult.totalfee_11_25 += txMempoolInfo.modifiedfee;

				} else if (feeRate <= 50) {
					compiledResult.fee_26_50++;
					compiledResult.totalfee_26_50 += txMempoolInfo.modifiedfee;

				} else if (feeRate <= 75) {
					compiledResult.fee_51_75++;
					compiledResult.totalfee_51_75 += txMempoolInfo.modifiedfee;

				} else if (feeRate <= 100) {
					compiledResult.fee_76_100++;
					compiledResult.totalfee_76_100 += txMempoolInfo.modifiedfee;

				} else if (feeRate <= 150) {
					compiledResult.fee_101_150++;
					compiledResult.totalfee_101_150 += txMempoolInfo.modifiedfee;

				} else {
					compiledResult.fee_151_max++;
					compiledResult.totalfee_151_max += txMempoolInfo.modifiedfee;
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
		client.command('getblockhash', blockHeight, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 0928317yr3w: " + err);

				reject(err);

				return;
			}

			client.command('getblock', result, function(err2, result2, resHeaders2) {
				if (err2) {
					console.log("Error 320fh7e0hg: " + err2);

					reject(err2);

					return;
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
				parameters: [ blockHeights[i] ]
			});
		}

		client.command(batch, function(err, result, resHeaders) {
			var blockHashes = result.slice();
			if (blockHashes.length == batch.length) {
				var batch2 = [];
				for (var i = 0; i < blockHashes.length; i++) {
					batch2.push({
						method: 'getblock',
						parameters: [ blockHashes[i] ]
					});
				}

				client.command(batch2, function(err2, result2, resHeaders2) {
					if (err2) {
						console.log("Error 138ryweufdf: " + err2);
					}
					var blocks = result2.slice();
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
		client.command('getblock', blockHash, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 0u2fgewue: " + err);

				reject(err);

				return;
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
		if (txid == coins[env.coin].genesisCoinbaseTransactionId) {
			getBlockByHeight(0).then(function(blockZeroResult) {
				var result = coins[env.coin].genesisCoinbaseTransaction;
				result.confirmations = blockZeroResult.getblock.confirmations;

				resolve(result);
			});

			return;
		}

		client.command('getrawtransaction', txid, 1, function(err, result, resHeaders) {
			if (err) {
				console.log("Error 329813yre823: " + err);

				reject(err);

				return;
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

		if (txids.length == 1 && txids[0] == coins[env.coin].genesisCoinbaseTransactionId) {
			// copy the "confirmations" field from genesis block to the genesis-coinbase tx
			getBlockByHeight(0).then(function(blockZeroResult) {
				var result = coins[env.coin].genesisCoinbaseTransaction;
				result.confirmations = blockZeroResult.getblock.confirmations;

				resolve([result]);

			}).catch(function(err) {
				reject(err);

				return;
			});

			return;
		}

		var requests = [];
		for (var i = 0; i < txids.length; i++) {
			var txid = txids[i];
			if (txid) {
				requests.push({
					method: 'getrawtransaction',
					parameters: [ txid, 1]
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
	console.log("Starting " + batches.length + "batches");
	executeBatchesSequentiallyInternal(0, batches, 0, [], resultFunc);
}

function executeBatchesSequentiallyInternal(batchId, batches, currentIndex, accumulatedResults, resultFunc) {
	if (currentIndex == batches.length) {
		console.log("Finishing batch " + batchId + "...");

		resultFunc(accumulatedResults);
		return;
	}

	var batchId = utils.getRandomString(20, 'aA#');
	console.log("Executing batch #" + (currentIndex + 1) + " (of " + batches.length + ") with id " + batchId);

	client.command(batches[currentIndex], function(err, result, resHeaders) {
		if (err) {
			console.log("Error f83024hf4: " + err);
		}

		accumulatedResults.push(...result);
		executeBatchesSequentiallyInternal(batchId, batches, currentIndex + 1, accumulatedResults, resultFunc);
	});
}

function getBlockData(rpcClient, blockHash, txLimit, txOffset) {
	console.log("getBlockData: " + blockHash);

	return new Promise(function(resolve, reject) {
		client.command('getblock', blockHash, function(err2, result2, resHeaders2) {
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

				if (line.trim() == "Arguments:") {
					catchArgs = true;
				}
			});

			var args = [];
			var argX = null;
			// looking for line starting with "N. " where N is an integer (1-2 digits)
			argumentLines.forEach(function(line) {
				var regex = /^([0-9]+)\.\s*"?(\w+)"?\s*\((\w+),?\s*(\w+),?\s*(.+)?\s*\)\s*(.+)?$/;

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
						argX.description = match[6];
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

function getHistoricalData() {
	var sortedList = coins[env.coin].historicalData;
	sortedList.sort(function(a, b){
		return ((a.date > b.date) ? 1 : -1);
	});

	return sortedList;
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
	getTransactionInputs: getTransactionInputs,
	getBlockData: getBlockData,
	getRawTransaction: getRawTransaction,
	getRawTransactions: getRawTransactions,
	getMempoolStats: getMempoolStats,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getHistoricalData: getHistoricalData
};
