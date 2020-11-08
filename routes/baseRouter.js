var debug = require("debug");
var debugLog = debug("btcexp:router");

var express = require('express');
var csurf = require('csurf');
var router = express.Router();
var util = require('util');
var moment = require('moment');
var bitcoinCore = require("bitcoin-core");
var qrcode = require('qrcode');
var bitcoinjs = require('bitcoinjs-lib');
var sha256 = require("crypto-js/sha256");
var hexEnc = require("crypto-js/enc-hex");
var Decimal = require("decimal.js");
var marked = require("marked");
var semver = require("semver");

var utils = require('./../app/utils.js');
var coins = require("./../app/coins.js");
var config = require("./../app/config.js");
var coreApi = require("./../app/api/coreApi.js");
var addressApi = require("./../app/api/addressApi.js");
var rpcApi = require("./../app/api/rpcApi.js");
var auth = require('./../app/auth.js');

const v8 = require('v8');

const forceCsrf = csurf({ ignoreMethods: [] });

const routerExport = app => {

router.get("/", function(req, res, next) {
	if (req.session.host == null || req.session.host.trim() == "") {
		if (req.cookies['rpc-host']) {
			res.locals.host = req.cookies['rpc-host'];
		}

		if (req.cookies['rpc-port']) {
			res.locals.port = req.cookies['rpc-port'];
		}

		if (req.cookies['rpc-username']) {
			res.locals.username = req.cookies['rpc-username'];
		}

		res.render("connect");
		res.end();

		return;
	}

	res.locals.homepage = true;
	
	// don't need timestamp on homepage "blocks-list", this flag disables
	res.locals.hideTimestampColumn = true;


	// variables used by blocks-list.pug
	res.locals.offset = 0;
	res.locals.sort = "desc";

	var feeConfTargets = [1, 6, 144, 1008];
	res.locals.feeConfTargets = feeConfTargets;


	var promises = [];

	// promiseResults[0]
	promises.push(coreApi.getMempoolInfo());

	// promiseResults[1]
	promises.push(coreApi.getMiningInfo());

	// promiseResults[2]
	promises.push(coreApi.getSmartFeeEstimates("CONSERVATIVE", feeConfTargets));

	// promiseResults[3] and [4]
	promises.push(coreApi.getNetworkHashrate(144));
	promises.push(coreApi.getNetworkHashrate(1008));


	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.getblockchaininfo = getblockchaininfo;

		res.locals.difficultyPeriod = parseInt(Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount));
		

		var blockHeights = [];
		if (getblockchaininfo.blocks) {
			// +1 to page size here so we have the next block to calculate T.T.M.
			for (var i = 0; i < (config.site.homepage.recentBlocksCount + 1); i++) {
				blockHeights.push(getblockchaininfo.blocks - i);
			}
		} else if (global.activeBlockchain == "regtest") {
			// hack: default regtest node returns getblockchaininfo.blocks=0, despite having a genesis block
			// hack this to display the genesis block
			blockHeights.push(0);
		}

		// promiseResults[5]
		promises.push(coreApi.getBlocksStatsByHeight(blockHeights));

		// promiseResults[6]
		promises.push(new Promise(function(resolve, reject) {
			coreApi.getBlockHeaderByHeight(coinConfig.difficultyAdjustmentBlockCount * res.locals.difficultyPeriod).then(function(difficultyPeriodFirstBlockHeader) {
				resolve(difficultyPeriodFirstBlockHeader);
			});
		}));

		if (getblockchaininfo.chain !== 'regtest') {
			var targetBlocksPerDay = 24 * 60 * 60 / global.coinConfig.targetBlockTimeSeconds;

			// promiseResults[7] (if not regtest)
			promises.push(coreApi.getTxCountStats(targetBlocksPerDay / 4, -targetBlocksPerDay, "latest"));

			var chainTxStatsIntervals = [ targetBlocksPerDay, targetBlocksPerDay * 7, targetBlocksPerDay * 30, targetBlocksPerDay * 365 ]
				.filter(numBlocks => numBlocks <= getblockchaininfo.blocks);

			res.locals.chainTxStatsLabels = [ "24 hours", "1 week", "1 month", "1 year" ]
				.slice(0, chainTxStatsIntervals.length)
				.concat("All time");

			// promiseResults[8-X] (if not regtest)
			for (var i = 0; i < chainTxStatsIntervals.length; i++) {
				promises.push(coreApi.getChainTxStats(chainTxStatsIntervals[i]));
			}
		}

		if (getblockchaininfo.chain !== 'regtest') {
			promises.push(coreApi.getChainTxStats(getblockchaininfo.blocks - 1));
		}

		coreApi.getBlocksByHeight(blockHeights).then(function(latestBlocks) {
			res.locals.latestBlocks = latestBlocks;
			res.locals.blocksUntilDifficultyAdjustment = ((res.locals.difficultyPeriod + 1) * coinConfig.difficultyAdjustmentBlockCount) - latestBlocks[0].height;

			Promise.all(promises).then(function(promiseResults) {
				res.locals.mempoolInfo = promiseResults[0];
				res.locals.miningInfo = promiseResults[1];

				var rawSmartFeeEstimates = promiseResults[2];

				var smartFeeEstimates = {};

				for (var i = 0; i < feeConfTargets.length; i++) {
					var rawSmartFeeEstimate = rawSmartFeeEstimates[i];

					if (rawSmartFeeEstimate.errors) {
						smartFeeEstimates[feeConfTargets[i]] = "?";

					} else {
						smartFeeEstimates[feeConfTargets[i]] = parseInt(new Decimal(rawSmartFeeEstimate.feerate).times(coinConfig.baseCurrencyUnit.multiplier).dividedBy(1000));
					}
				}

				res.locals.smartFeeEstimates = smartFeeEstimates;


				res.locals.hashrate1d = promiseResults[3];
				res.locals.hashrate7d = promiseResults[4];

				
				var rawblockstats = promiseResults[5];
				if (rawblockstats && rawblockstats.length > 0 && rawblockstats[0] != null) {
					res.locals.blockstatsByHeight = {};

					for (var i = 0; i < rawblockstats.length; i++) {
						var blockstats = rawblockstats[i];

						res.locals.blockstatsByHeight[blockstats.height] = blockstats;
					}
				}

				res.locals.difficultyPeriodFirstBlockHeader = promiseResults[6];
				

				if (getblockchaininfo.chain !== 'regtest') {
					res.locals.txStats = promiseResults[7];

					var chainTxStats = [];
					for (var i = 0; i < res.locals.chainTxStatsLabels.length; i++) {
						chainTxStats.push(promiseResults[i + 8]);
					}

					res.locals.chainTxStats = chainTxStats;
				}

				res.render("index");

				next();

			}).catch(function(err) {
				utils.logError("32978efegdde", err);
				
				res.locals.userMessage = "Error loading recent blocks: " + err;

				res.render("index");

				next();
			});
		});
	}).catch(function(err) {
		res.locals.userMessage = "Error loading recent blocks: " + err;

		res.render("index");

		next();
	});
});

router.get("/node-status", function(req, res, next) {
	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.getblockchaininfo = getblockchaininfo;

		coreApi.getNetworkInfo().then(function(getnetworkinfo) {
			res.locals.getnetworkinfo = getnetworkinfo;

			coreApi.getUptimeSeconds().then(function(uptimeSeconds) {
				res.locals.uptimeSeconds = uptimeSeconds;

				coreApi.getNetTotals().then(function(getnettotals) {
					res.locals.getnettotals = getnettotals;

					res.render("node-status");

					next();

				}).catch(function(err) {
					res.locals.userMessage = "Error getting node status: (id=0), err=" + err;

					res.render("node-status");

					next();
				});
			}).catch(function(err) {
				res.locals.userMessage = "Error getting node status: (id=1), err=" + err;

				res.render("node-status");

				next();
			});
		}).catch(function(err) {
			res.locals.userMessage = "Error getting node status: (id=2), err=" + err;

			res.render("node-status");

			next();
		});
	}).catch(function(err) {
		res.locals.userMessage = "Error getting node status: (id=3), err=" + err;

		res.render("node-status");

		next();
	});
});

router.get("/mempool-summary", function(req, res, next) {
	res.locals.satoshiPerByteBucketMaxima = coinConfig.feeSatoshiPerByteBucketMaxima;

	coreApi.getMempoolInfo().then(function(mempoolinfo) {
		res.locals.mempoolinfo = mempoolinfo;

		coreApi.getMempoolTxids().then(function(mempooltxids) {
			var debugMaxCount = 0;

			if (debugMaxCount > 0) {
				var debugtxids = [];
				for (var i = 0; i < Math.min(debugMaxCount, mempooltxids.length); i++) {
					debugtxids.push(mempooltxids[i]);
				}

				res.locals.mempooltxidChunks = utils.splitArrayIntoChunks(debugtxids, 25);

			} else {
				res.locals.mempooltxidChunks = utils.splitArrayIntoChunks(mempooltxids, 25);
			}
			

			res.render("mempool-summary");

			next();
		});

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("mempool-summary");

		next();
	});
});

router.get("/peers", function(req, res, next) {
	coreApi.getPeerSummary().then(function(peerSummary) {
		res.locals.peerSummary = peerSummary;

		var peerIps = [];
		for (var i = 0; i < peerSummary.getpeerinfo.length; i++) {
			var ipWithPort = peerSummary.getpeerinfo[i].addr;
			if (ipWithPort.lastIndexOf(":") >= 0) {
				var ip = ipWithPort.substring(0, ipWithPort.lastIndexOf(":"));
				if (ip.trim().length > 0) {
					peerIps.push(ip.trim());
				}
			}
		}

		if (peerIps.length > 0) {
			utils.geoLocateIpAddresses(peerIps).then(function(results) {
				res.locals.peerIpSummary = results;
				
				res.render("peers");

				next();
			});
		} else {
			res.render("peers");

			next();
		}
	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("peers");

		next();
	});
});

router.post("/connect", function(req, res, next) {
	var host = req.body.host;
	var port = req.body.port;
	var username = req.body.username;
	var password = req.body.password;

	res.cookie('rpc-host', host);
	res.cookie('rpc-port', port);
	res.cookie('rpc-username', username);

	req.session.host = host;
	req.session.port = port;
	req.session.username = username;

	var newClient = new bitcoinCore({
		host: host,
		port: port,
		username: username,
		password: password,
		timeout: 30000
	});

	debugLog("created new rpc client: " + newClient);

	global.rpcClient = newClient;

	req.session.userMessage = "<span class='font-weight-bold'>Connected via RPC</span>: " + username + " @ " + host + ":" + port;
	req.session.userMessageType = "success";

	res.redirect("/");
});

router.get("/disconnect", function(req, res, next) {
	res.cookie('rpc-host', "");
	res.cookie('rpc-port', "");
	res.cookie('rpc-username', "");

	req.session.host = "";
	req.session.port = "";
	req.session.username = "";

	debugLog("destroyed rpc client.");

	global.rpcClient = null;

	req.session.userMessage = "Disconnected from node.";
	req.session.userMessageType = "success";

	res.redirect("/");
});

router.get("/changeSetting", function(req, res, next) {
	if (req.query.name) {
		req.session[req.query.name] = req.query.value;

		res.cookie('user-setting-' + req.query.name, req.query.value);
	}

	res.redirect(req.headers.referer);
});

router.get("/blocks", function(req, res, next) {
	var limit = config.site.browseBlocksPageSize;
	var offset = 0;
	var sort = "desc";

	if (req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	if (req.query.sort) {
		sort = req.query.sort;
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.sort = sort;
	res.locals.paginationBaseUrl = "/blocks";

	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.blockCount = getblockchaininfo.blocks;
		res.locals.blockOffset = offset;

		var blockHeights = [];
		if (sort == "desc") {
			for (var i = (getblockchaininfo.blocks - offset); i > (getblockchaininfo.blocks - offset - limit - 1); i--) {
				if (i >= 0) {
					blockHeights.push(i);
				}
			}
		} else {
			for (var i = offset - 1; i < (offset + limit); i++) {
				if (i >= 0) {
					blockHeights.push(i);
				}
			}
		}

		var promises = [];

		promises.push(coreApi.getBlocksByHeight(blockHeights));

		promises.push(coreApi.getBlocksStatsByHeight(blockHeights));

		Promise.all(promises).then(function(promiseResults) {
			res.locals.blocks = promiseResults[0];
			var rawblockstats = promiseResults[1];

			if (rawblockstats != null && rawblockstats.length > 0 && rawblockstats[0] != null) {
				res.locals.blockstatsByHeight = {};

				for (var i = 0; i < rawblockstats.length; i++) {
					var blockstats = rawblockstats[i];

					res.locals.blockstatsByHeight[blockstats.height] = blockstats;
				}
			}

			res.render("blocks");

			next();

		}).catch(function(err) {
			res.locals.pageErrors.push(utils.logError("32974hrbfbvc", err));

			res.render("blocks");

			next();
		});

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("blocks");

		next();
	});
});

router.get("/mining-summary", function(req, res, next) {
	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.currentBlockHeight = getblockchaininfo.blocks;

		res.render("mining-summary");

		next();

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("mining-summary");

		next();
	});
});

router.get("/block-stats", function(req, res, next) {
	if (semver.lt(global.btcNodeSemver, rpcApi.minRpcVersions.getblockstats)) {
		res.locals.rpcApiUnsupportedError = {rpc:"getblockstats", version:rpcApi.minRpcVersions.getblockstats};
	}

	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.currentBlockHeight = getblockchaininfo.blocks;

		res.render("block-stats");

		next();

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("block-stats");

		next();
	});
});

router.get("/search", function(req, res, next) {
	res.render("search");

	next();
});

router.post("/search", function(req, res, next) {
	if (!req.body.query) {
		req.session.userMessage = "Enter a block height, block hash, or transaction id.";

		res.redirect("/");

		return;
	}

	var query = req.body.query.toLowerCase().trim();
	var rawCaseQuery = req.body.query.trim();

	req.session.query = req.body.query;

	if (query.length == 64) {
		coreApi.getRawTransaction(query).then(function(tx) {
			if (tx) {
				res.redirect("/tx/" + query);

				return;
			}

			coreApi.getBlockByHash(query).then(function(blockByHash) {
				if (blockByHash) {
					res.redirect("/block/" + query);

					return;
				}

				coreApi.getAddress(rawCaseQuery).then(function(validateaddress) {
					if (validateaddress && validateaddress.isvalid) {
						res.redirect("/address/" + rawCaseQuery);

						return;
					}
				});

				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");

			}).catch(function(err) {
				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");
			});

		}).catch(function(err) {
			coreApi.getBlockByHash(query).then(function(blockByHash) {
				if (blockByHash) {
					res.redirect("/block/" + query);

					return;
				}

				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");

			}).catch(function(err) {
				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");
			});
		});

	} else if (!isNaN(query)) {
		coreApi.getBlockByHeight(parseInt(query)).then(function(blockByHeight) {
			if (blockByHeight) {
				res.redirect("/block-height/" + query);

				return;
			}

			req.session.userMessage = "No results found for query: " + query;

			res.redirect("/");
		});
	} else {
		coreApi.getAddress(rawCaseQuery).then(function(validateaddress) {
			if (validateaddress && validateaddress.isvalid) {
				res.redirect("/address/" + rawCaseQuery);

				return;
			}

			req.session.userMessage = "No results found for query: " + rawCaseQuery;

			res.redirect("/");
		});
	}
});

router.get("/block-height/:blockHeight", function(req, res, next) {
	var blockHeight = parseInt(req.params.blockHeight);

	res.locals.blockHeight = blockHeight;

	res.locals.result = {};

	var limit = config.site.blockTxPageSize;
	var offset = 0;

	if (req.query.limit) {
		limit = parseInt(req.query.limit);

		// for demo sites, limit page sizes
		if (config.demoSite && limit > config.site.blockTxPageSize) {
			limit = config.site.blockTxPageSize;

			res.locals.userMessage = "Transaction page size limited to " + config.site.blockTxPageSize + ". If this is your site, you can change or disable this limit in the site config.";
		}
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.paginationBaseUrl = "/block-height/" + blockHeight;

	coreApi.getBlockByHeight(blockHeight).then(function(result) {
		res.locals.result.getblockbyheight = result;

		var promises = [];

		promises.push(new Promise(function(resolve, reject) {
			coreApi.getBlockByHashWithTransactions(result.hash, limit, offset).then(function(result) {
				res.locals.result.getblock = result.getblock;
				res.locals.result.transactions = result.transactions;
				res.locals.result.txInputsByTransaction = result.txInputsByTransaction;

				resolve();

			}).catch(function(err) {
				res.locals.pageErrors.push(utils.logError("98493y4758h55", err));

				reject(err);
			});
		}));

		promises.push(new Promise(function(resolve, reject) {
			coreApi.getBlockStats(result.hash).then(function(result) {
				res.locals.result.blockstats = result;

				resolve();

			}).catch(function(err) {
				res.locals.pageErrors.push(utils.logError("983yr435r76d", err));

				reject(err);
			});
		}));

		Promise.all(promises).then(function() {
			res.render("block");

			next();

		}).catch(function(err) {
			res.locals.userMessageMarkdown = `Failed loading block: height=**${blockHeight}**`;

			res.render("block");

			next();
		});
	}).catch(function(err) {
		res.locals.userMessageMarkdown = `Failed loading block: height=**${blockHeight}**`;

		res.locals.pageErrors.push(utils.logError("389wer07eghdd", err));

		res.render("block");

		next();
	});
});

router.get("/block/:blockHash", function(req, res, next) {
	var blockHash = req.params.blockHash;

	res.locals.blockHash = blockHash;

	res.locals.result = {};

	var limit = config.site.blockTxPageSize;
	var offset = 0;

	if (req.query.limit) {
		limit = parseInt(req.query.limit);

		// for demo sites, limit page sizes
		if (config.demoSite && limit > config.site.blockTxPageSize) {
			limit = config.site.blockTxPageSize;

			res.locals.userMessage = "Transaction page size limited to " + config.site.blockTxPageSize + ". If this is your site, you can change or disable this limit in the site config.";
		}
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.paginationBaseUrl = "/block/" + blockHash;

	var promises = [];

	promises.push(new Promise(function(resolve, reject) {
		coreApi.getBlockByHashWithTransactions(blockHash, limit, offset).then(function(result) {
			res.locals.result.getblock = result.getblock;
			res.locals.result.transactions = result.transactions;
			res.locals.result.txInputsByTransaction = result.txInputsByTransaction;

			resolve();

		}).catch(function(err) {
			res.locals.pageErrors.push(utils.logError("238h38sse", err));
			
			reject(err);
		});
	}));

	promises.push(new Promise(function(resolve, reject) {
		coreApi.getBlockStats(blockHash).then(function(result) {
			res.locals.result.blockstats = result;

			resolve();

		}).catch(function(err) {
			res.locals.pageErrors.push(utils.logError("21983ue8hye", err));
			
			reject(err);
		});
	}));

	Promise.all(promises).then(function() {
		res.render("block");

		next();

	}).catch(function(err) {
		res.locals.userMessageMarkdown = `Failed to load block: **${blockHash}**`;

		res.render("block");

		next();
	});
});

router.get("/block-analysis/:blockHashOrHeight", function(req, res, next) {
	var blockHashOrHeight = req.params.blockHashOrHeight;

	var goWithBlockHash = function(blockHash) {
		var blockHash = blockHash;

		res.locals.blockHash = blockHash;

		res.locals.result = {};

		var txResults = [];

		var promises = [];

		res.locals.result = {};

		coreApi.getBlockByHash(blockHash).then(function(block) {
			res.locals.result.getblock = block;

			res.render("block-analysis");

			next();

		}).catch(function(err) {
			res.locals.pageErrors.push(utils.logError("943h84ehedr", err));

			res.render("block-analysis");

			next();
		});
	};

	if (!isNaN(blockHashOrHeight)) {
		coreApi.getBlockByHeight(parseInt(blockHashOrHeight)).then(function(blockByHeight) {
			goWithBlockHash(blockByHeight.hash);
		});
	} else {
		goWithBlockHash(blockHashOrHeight);
	}
});

router.get("/block-analysis", function(req, res, next) {
	res.render("block-analysis-search");

	next();
});

router.get("/tx/:transactionId", function(req, res, next) {
	var txid = req.params.transactionId;

	var output = -1;
	if (req.query.output) {
		output = parseInt(req.query.output);
	}

	res.locals.txid = txid;
	res.locals.output = output;

	res.locals.result = {};

	coreApi.getRawTransactionsWithInputs([txid]).then(function(rawTxResult) {
		var tx = rawTxResult.transactions[0];

		res.locals.result.getrawtransaction = tx;
		res.locals.result.txInputs = rawTxResult.txInputsByTransaction[txid];

		var promises = [];

		promises.push(new Promise(function(resolve, reject) {
			coreApi.getTxUtxos(tx).then(function(utxos) {
				res.locals.utxos = utxos;
				
				resolve();

			}).catch(function(err) {
				res.locals.pageErrors.push(utils.logError("3208yhdsghssr", err));

				reject(err);
			});
		}));

		if (tx.confirmations == null) {
			promises.push(new Promise(function(resolve, reject) {
				coreApi.getMempoolTxDetails(txid, true).then(function(mempoolDetails) {
					res.locals.mempoolDetails = mempoolDetails;
					
					resolve();

				}).catch(function(err) {
					res.locals.pageErrors.push(utils.logError("0q83hreuwgd", err));

					reject(err);
				});
			}));
		}

		promises.push(new Promise(function(resolve, reject) {
			global.rpcClient.command('getblock', tx.blockhash, function(err3, result3, resHeaders3) {
				res.locals.result.getblock = result3;

				resolve();
			});
		}));

		Promise.all(promises).then(function() {
			res.render("transaction");

			next();
		});

	}).catch(function(err) {
		res.locals.userMessageMarkdown = `Failed to load transaction: txid=**${txid}**`;

		res.locals.pageErrors.push(utils.logError("1237y4ewssgt", err));

		res.render("transaction");

		next();
	});
});

router.get("/address/:address", function(req, res, next) {
	var limit = config.site.addressTxPageSize;
	var offset = 0;
	var sort = "desc";

	
	if (req.query.limit) {
		limit = parseInt(req.query.limit);

		// for demo sites, limit page sizes
		if (config.demoSite && limit > config.site.addressTxPageSize) {
			limit = config.site.addressTxPageSize;

			res.locals.userMessage = "Transaction page size limited to " + config.site.addressTxPageSize + ". If this is your site, you can change or disable this limit in the site config.";
		}
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	if (req.query.sort) {
		sort = req.query.sort;
	}


	var address = req.params.address;

	res.locals.address = address;
	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.sort = sort;
	res.locals.paginationBaseUrl = `/address/${address}?sort=${sort}`;
	res.locals.transactions = [];
	res.locals.addressApiSupport = addressApi.getCurrentAddressApiFeatureSupport();
	
	res.locals.result = {};

	var parseAddressErrors = [];

	try {
		res.locals.addressObj = bitcoinjs.address.fromBase58Check(address);

	} catch (err) {
		if (!err.toString().startsWith("Error: Non-base58 character")) {
			parseAddressErrors.push(utils.logError("u3gr02gwef", err));
		}
	}

	try {
		res.locals.addressObj = bitcoinjs.address.fromBech32(address);

	} catch (err2) {
		if (!err2.toString().startsWith("Error: Mixed-case string " + address)) {
			parseAddressErrors.push(utils.logError("u02qg02yqge", err2));
		}

		
	}

	if (res.locals.addressObj == null) {
		parseAddressErrors.forEach(function(x) {
			res.locals.pageErrors.push(x);
		});
	}

	if (global.miningPoolsConfigs) {
		for (var i = 0; i < global.miningPoolsConfigs.length; i++) {
			if (global.miningPoolsConfigs[i].payout_addresses[address]) {
				res.locals.payoutAddressForMiner = global.miningPoolsConfigs[i].payout_addresses[address];
			}
		}
	}

	coreApi.getAddress(address).then(function(validateaddressResult) {
		res.locals.result.validateaddress = validateaddressResult;

		var promises = [];
		if (!res.locals.crawlerBot) {
			var addrScripthash = hexEnc.stringify(sha256(hexEnc.parse(validateaddressResult.scriptPubKey)));
			addrScripthash = addrScripthash.match(/.{2}/g).reverse().join("");

			res.locals.electrumScripthash = addrScripthash;

			promises.push(new Promise(function(resolve, reject) {
				addressApi.getAddressDetails(address, validateaddressResult.scriptPubKey, sort, limit, offset).then(function(addressDetailsResult) {
					var addressDetails = addressDetailsResult.addressDetails;

					if (addressDetailsResult.errors) {
						res.locals.addressDetailsErrors = addressDetailsResult.errors;
					}

					if (addressDetails) {
						res.locals.addressDetails = addressDetails;

						if (addressDetails.balanceSat == 0) {
							// make sure zero balances pass the falsey check in the UI
							addressDetails.balanceSat = "0";
						}

						if (addressDetails.txCount == 0) {
							// make sure txCount=0 pass the falsey check in the UI
							addressDetails.txCount = "0";
						}

						if (addressDetails.txids) {
							var txids = addressDetails.txids;

							// if the active addressApi gives us blockHeightsByTxid, it saves us work, so try to use it
							var blockHeightsByTxid = {};
							if (addressDetails.blockHeightsByTxid) {
								blockHeightsByTxid = addressDetails.blockHeightsByTxid;
							}

							res.locals.txids = txids;
							
							coreApi.getRawTransactionsWithInputs(txids).then(function(rawTxResult) {
								res.locals.transactions = rawTxResult.transactions;
								res.locals.txInputsByTransaction = rawTxResult.txInputsByTransaction;

								// for coinbase txs, we need the block height in order to calculate subsidy to display
								var coinbaseTxs = [];
								for (var i = 0; i < rawTxResult.transactions.length; i++) {
									var tx = rawTxResult.transactions[i];

									for (var j = 0; j < tx.vin.length; j++) {
										if (tx.vin[j].coinbase) {
											// addressApi sometimes has blockHeightByTxid already available, otherwise we need to query for it
											if (!blockHeightsByTxid[tx.txid]) {
												coinbaseTxs.push(tx);
											}
										}
									}
								}


								var coinbaseTxBlockHashes = [];
								var blockHashesByTxid = {};
								coinbaseTxs.forEach(function(tx) {
									coinbaseTxBlockHashes.push(tx.blockhash);
									blockHashesByTxid[tx.txid] = tx.blockhash;
								});

								var blockHeightsPromises = [];
								if (coinbaseTxs.length > 0) {
									// we need to query some blockHeights by hash for some coinbase txs
									blockHeightsPromises.push(new Promise(function(resolve2, reject2) {
										coreApi.getBlocksByHash(coinbaseTxBlockHashes).then(function(blocksByHashResult) {
											for (var txid in blockHashesByTxid) {
												if (blockHashesByTxid.hasOwnProperty(txid)) {
													blockHeightsByTxid[txid] = blocksByHashResult[blockHashesByTxid[txid]].height;
												}
											}

											resolve2();

										}).catch(function(err) {
											res.locals.pageErrors.push(utils.logError("78ewrgwetg3", err));

											reject2(err);
										});
									}));
								}

								Promise.all(blockHeightsPromises).then(function() {
									var addrGainsByTx = {};
									var addrLossesByTx = {};

									res.locals.addrGainsByTx = addrGainsByTx;
									res.locals.addrLossesByTx = addrLossesByTx;

									var handledTxids = [];

									for (var i = 0; i < rawTxResult.transactions.length; i++) {
										var tx = rawTxResult.transactions[i];
										var txInputs = rawTxResult.txInputsByTransaction[tx.txid];
										
										if (handledTxids.includes(tx.txid)) {
											continue;
										}

										handledTxids.push(tx.txid);

										for (var j = 0; j < tx.vout.length; j++) {
											if (tx.vout[j].value > 0 && tx.vout[j].scriptPubKey && tx.vout[j].scriptPubKey.addresses && tx.vout[j].scriptPubKey.addresses.includes(address)) {
												if (addrGainsByTx[tx.txid] == null) {
													addrGainsByTx[tx.txid] = new Decimal(0);
												}

												addrGainsByTx[tx.txid] = addrGainsByTx[tx.txid].plus(new Decimal(tx.vout[j].value));
											}
										}

										for (var j = 0; j < tx.vin.length; j++) {
											var txInput = txInputs[j];
											var vinJ = tx.vin[j];

											if (txInput != null) {
												if (txInput && txInput.scriptPubKey && txInput.scriptPubKey.addresses && txInput.scriptPubKey.addresses.includes(address)) {
													if (addrLossesByTx[tx.txid] == null) {
														addrLossesByTx[tx.txid] = new Decimal(0);
													}

													addrLossesByTx[tx.txid] = addrLossesByTx[tx.txid].plus(new Decimal(txInput.value));
												}
											}
										}

										//debugLog("tx: " + JSON.stringify(tx));
										//debugLog("txInputs: " + JSON.stringify(txInputs));
									}

									res.locals.blockHeightsByTxid = blockHeightsByTxid;

									resolve();

								}).catch(function(err) {
									res.locals.pageErrors.push(utils.logError("230wefrhg0egt3", err));

									reject(err);
								});

							}).catch(function(err) {
								res.locals.pageErrors.push(utils.logError("asdgf07uh23", err));

								reject(err);
							});

						} else {
							// no addressDetails.txids available
							resolve();
						}
					} else {
						// no addressDetails available
						resolve();
					}
				}).catch(function(err) {
					res.locals.pageErrors.push(utils.logError("23t07ug2wghefud", err));

					res.locals.addressApiError = err;

					reject(err);
				});
			}));

			promises.push(new Promise(function(resolve, reject) {
				coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
					res.locals.getblockchaininfo = getblockchaininfo;

					resolve();

				}).catch(function(err) {
					res.locals.pageErrors.push(utils.logError("132r80h32rh", err));

					reject(err);
				});
			}));
		}

		promises.push(new Promise(function(resolve, reject) {
			qrcode.toDataURL(address, function(err, url) {
				if (err) {
					res.locals.pageErrors.push(utils.logError("93ygfew0ygf2gf2", err));
				}

				res.locals.addressQrCodeUrl = url;

				resolve();
			});
		}));

		Promise.all(promises.map(utils.reflectPromise)).then(function() {
			res.render("address");

			next();

		}).catch(function(err) {
			res.locals.pageErrors.push(utils.logError("32197rgh327g2", err));

			res.render("address");

			next();
		});
		
	}).catch(function(err) {
		res.locals.pageErrors.push(utils.logError("2108hs0gsdfe", err, {address:address}));

		res.locals.userMessageMarkdown = `Failed to load address: **${address}**`;

		res.render("address");

		next();
	});
});

router.get("/rpc-terminal", auth(app, process.env.BTCEXP_BASIC_AUTH_PASSWORD, config.demoSite), function(req, res, next) {
	res.render("rpc-terminal");

	next();
});

router.post("/rpc-terminal", auth(app, process.env.BTCEXP_BASIC_AUTH_PASSWORD, config.demoSite), function(req, res, next) {
	var params = req.body.cmd.trim().split(/\s+/);
	var cmd = params.shift();
	var parsedParams = [];

	params.forEach(function(param, i) {
		if (!isNaN(param)) {
			parsedParams.push(parseInt(param));

		} else {
			parsedParams.push(param);
		}
	});

	if (config.rpcBlacklist.includes(cmd.toLowerCase())) {
		res.write("Sorry, that RPC command is blacklisted. If this is your server, you may allow this command by removing it from the 'rpcBlacklist' setting in config.js.", function() {
			res.end();
		});

		next();

		return;
	}

	global.rpcClientNoTimeout.command([{method:cmd, parameters:parsedParams}], function(err, result, resHeaders) {
		debugLog("Result[1]: " + JSON.stringify(result, null, 4));
		debugLog("Error[2]: " + JSON.stringify(err, null, 4));
		debugLog("Headers[3]: " + JSON.stringify(resHeaders, null, 4));

		if (err) {
			debugLog(JSON.stringify(err, null, 4));

			res.write(JSON.stringify(err, null, 4), function() {
				res.end();
			});

			next();

		} else if (result) {
			res.write(JSON.stringify(result, null, 4), function() {
				res.end();
			});

			next();

		} else {
			res.write(JSON.stringify({"Error":"No response from node"}, null, 4), function() {
				res.end();
			});

			next();
		}
	});
});

router.get("/rpc-browser", auth(app, process.env.BTCEXP_BASIC_AUTH_PASSWORD, config.demoSite), function(req, res, next) {
	coreApi.getHelp().then(function(result) {
		res.locals.gethelp = result;

		if (req.query.method) {
			res.locals.method = req.query.method;

			coreApi.getRpcMethodHelp(req.query.method.trim()).then(function(result2) {
				res.locals.methodhelp = result2;

				if (req.query.execute) {
					var argDetails = result2.args;
					var argValues = [];

					if (req.query.args) {
						for (var i = 0; i < req.query.args.length; i++) {
							var argProperties = argDetails[i].properties;

							for (var j = 0; j < argProperties.length; j++) {
								if (argProperties[j] === "numeric") {
									if (req.query.args[i] == null || req.query.args[i] == "") {
										argValues.push(null);

									} else {
										argValues.push(parseInt(req.query.args[i]));
									}

									break;

								} else if (argProperties[j] === "boolean") {
									if (req.query.args[i]) {
										argValues.push(req.query.args[i] == "true");
									}

									break;

								} else if (argProperties[j] === "string" || argProperties[j] === "numeric or string" || argProperties[j] === "string or numeric") {
									if (req.query.args[i]) {
										argValues.push(req.query.args[i].replace(/[\r]/g, ''));
									}

									break;

								} else if (argProperties[j] === "array") {
									if (req.query.args[i]) {
										argValues.push(JSON.parse(req.query.args[i]));
									}
									
									break;

								} else {
									debugLog(`Unknown argument property: ${argProperties[j]}`);
								}
							}
						}
					}

					res.locals.argValues = argValues;

					if (config.rpcBlacklist.includes(req.query.method.toLowerCase())) {
						res.locals.methodResult = "Sorry, that RPC command is blacklisted. If this is your server, you may allow this command by removing it from the 'rpcBlacklist' setting in config.js.";

						res.render("rpc-browser");

						next();

						return;
					}

					forceCsrf(req, res, err => {
						if (err) {
							return next(err);
						}

						debugLog("Executing RPC '" + req.query.method + "' with params: " + JSON.stringify(argValues));

						global.rpcClientNoTimeout.command([{method:req.query.method, parameters:argValues}], function(err3, result3, resHeaders3) {
							debugLog("RPC Response: err=" + err3 + ", headers=" + resHeaders3 + ", result=" + JSON.stringify(result3));

							if (err3) {
								res.locals.pageErrors.push(utils.logError("23roewuhfdghe", err3, {method:req.query.method, params:argValues, result:result3, headers:resHeaders3}));

								if (result3) {
									res.locals.methodResult = {error:("" + err3), result:result3};

								} else {
									res.locals.methodResult = {error:("" + err3)};
								}
							} else if (result3) {
								res.locals.methodResult = result3;

							} else {
								res.locals.methodResult = {"Error":"No response from node."};
							}

							res.render("rpc-browser");

							next();
						});
					});
				} else {
					res.render("rpc-browser");

					next();
				}
			}).catch(function(err) {
				res.locals.userMessage = "Error loading help content for method " + req.query.method + ": " + err;

				res.render("rpc-browser");

				next();
			});

		} else {
			res.render("rpc-browser");

			next();
		}

	}).catch(function(err) {
		res.locals.userMessage = "Error loading help content: " + err;

		res.render("rpc-browser");

		next();
	});
});

router.get("/terminal", function(req, res, next) {
	res.render("terminal");

	next();
});

router.post("/terminal", function(req, res, next) {
	console.log("here");

	var params = req.body.cmd.trim().split(/\s+/);
	var cmd = params.shift();
	var paramsStr = req.body.cmd.trim().substring(cmd.length).trim();

	console.log("abc: " + params + ", " + cmd + ", " + paramsStr);

	if (cmd == "parsescript") {
		const nbs = require('node-bitcoin-script');
		var parsedScript = nbs.parseRawScript(paramsStr, "hex");

		res.write(JSON.stringify({"parsed":parsedScript}, null, 4), function() {
			res.end();
		});

		next();

	} else {
		res.write(JSON.stringify({"Error":"Unknown command"}, null, 4), function() {
			res.end();
		});

		next();
	}
});

router.get("/unconfirmed-tx", function(req, res, next) {
	var limit = config.site.browseBlocksPageSize;
	var offset = 0;
	var sort = "desc";

	if (req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	if (req.query.sort) {
		sort = req.query.sort;
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.sort = sort;
	res.locals.paginationBaseUrl = "/unconfirmed-tx";

	coreApi.getMempoolDetails(offset, limit).then(function(mempoolDetails) {
		res.locals.mempoolDetails = mempoolDetails;

		res.render("unconfirmed-transactions");

		next();

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("unconfirmed-transactions");

		next();
	});
});

router.get("/tx-stats", function(req, res, next) {
	var dataPoints = 100;

	if (req.query.dataPoints) {
		dataPoints = req.query.dataPoints;
	}

	if (dataPoints > 250) {
		dataPoints = 250;
	}

	var targetBlocksPerDay = 24 * 60 * 60 / global.coinConfig.targetBlockTimeSeconds;

	coreApi.getTxCountStats(dataPoints, 0, "latest").then(function(result) {
		res.locals.getblockchaininfo = result.getblockchaininfo;
		res.locals.txStats = result.txCountStats;

		coreApi.getTxCountStats(targetBlocksPerDay / 4, -144, "latest").then(function(result2) {
			res.locals.txStatsDay = result2.txCountStats;

			coreApi.getTxCountStats(targetBlocksPerDay / 4, -144 * 7, "latest").then(function(result3) {
				res.locals.txStatsWeek = result3.txCountStats;

				coreApi.getTxCountStats(targetBlocksPerDay / 4, -144 * 30, "latest").then(function(result4) {
					res.locals.txStatsMonth = result4.txCountStats;

					res.render("tx-stats");

					next();
				});
			});
		});
	});
});

router.get("/difficulty-history", function(req, res, next) {
	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.blockCount = getblockchaininfo.blocks;

		res.render("difficulty-history");

		next();

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("difficulty-history");

		next();
	});
});

router.get("/about", function(req, res, next) {
	res.render("about");

	next();
});

router.get("/tools", function(req, res, next) {
	res.render("tools");

	next();
});

router.get("/admin", function(req, res, next) {
	res.locals.appStartTime = global.appStartTime;
	res.locals.memstats = v8.getHeapStatistics();
	res.locals.rpcStats = global.rpcStats;
	res.locals.electrumStats = global.electrumStats;
	res.locals.cacheStats = global.cacheStats;
	res.locals.errorStats = global.errorStats;

	res.render("admin");

	next();
});

router.get("/changelog", function(req, res, next) {
	res.locals.changelogHtml = marked(global.changelogMarkdown);

	res.render("changelog");

	next();
});

router.get("/fun", function(req, res, next) {
	var sortedList = coins[config.coin].historicalData;
	sortedList.sort(function(a, b) {
		if (a.date > b.date) {
			return 1;

		} else if (a.date < b.date) {
			return -1;

		} else {
			var x = a.type.localeCompare(b.type);

			if (x == 0) {
				if (a.type == "blockheight") {
					return a.blockHeight - b.blockHeight;

				} else {
					return x;
				}
			}

			return x;
		}
	});

	res.locals.historicalData = sortedList;
	
	res.render("fun");

	next();
});

return router

}

module.exports = routerExport;
