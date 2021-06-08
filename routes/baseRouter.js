"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const express = require('express');
const csurf = require('csurf');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const bitcoinCore = require("btc-rpc-client");
const qrcode = require('qrcode');
const bitcoinjs = require('bitcoinjs-lib');
const bip32 = require('bip32');
const b58 = require('bs58check');
const sha256 = require("crypto-js/sha256");
const hexEnc = require("crypto-js/enc-hex");
const Decimal = require("decimal.js");
const semver = require("semver");
const markdown = require("markdown-it")();
const asyncHandler = require("express-async-handler");

const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");
const rpcApi = require("./../app/api/rpcApi.js");

const forceCsrf = csurf({ ignoreMethods: [] });

var noTxIndexMsg = "\n\nYour node does not have **txindex** enabled. Without it, you can only lookup wallet, mempool, and recently confirmed transactions by their **txid**. Searching for non-wallet transactions that were confirmed more than "+config.noTxIndexSearchDepth+" blocks ago is only possible if the confirmed block height is available.";

router.get("/", asyncHandler(async (req, res, next) => {
	try {
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
		promises.push(new Promise(async (resolve, reject) => {
			res.locals.mempoolInfo = await utils.timePromise("promises.index.getMempoolInfo", coreApi.getMempoolInfo());
			
			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.miningInfo = await utils.timePromise("promises.index.getMiningInfo", coreApi.getMiningInfo());

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			const rawSmartFeeEstimates = await utils.timePromise("promises.index.getSmartFeeEstimates", coreApi.getSmartFeeEstimates("CONSERVATIVE", feeConfTargets));

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

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.hashrate7d = await utils.timePromise("promises.index.getNetworkHashrate-1008", coreApi.getNetworkHashrate(1008));

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.hashrate30d = await utils.timePromise("promises.index.getNetworkHashrate-4320", coreApi.getNetworkHashrate(4320));

			resolve();
		}));


		const getblockchaininfo = await utils.timePromise("promises.index.getBlockchainInfo", coreApi.getBlockchainInfo());
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

		promises.push(new Promise(async (resolve, reject) => {
			const rawblockstats = await utils.timePromise("promises.index.getBlocksStatsByHeight", coreApi.getBlocksStatsByHeight(blockHeights));

			if (rawblockstats && rawblockstats.length > 0 && rawblockstats[0] != null) {
				res.locals.blockstatsByHeight = {};

				for (var i = 0; i < rawblockstats.length; i++) {
					var blockstats = rawblockstats[i];

					res.locals.blockstatsByHeight[blockstats.height] = blockstats;
				}
			}

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			let h = coinConfig.difficultyAdjustmentBlockCount * res.locals.difficultyPeriod;
			res.locals.difficultyPeriodFirstBlockHeader = await utils.timePromise("promises.index.getBlockHeaderByHeight", coreApi.getBlockHeaderByHeight(h));
			
			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			const latestBlocks = await utils.timePromise(`promises.index.getBlocksByHeight`, coreApi.getBlocksByHeight(blockHeights));

			res.locals.latestBlocks = latestBlocks;
			res.locals.blocksUntilDifficultyAdjustment = ((res.locals.difficultyPeriod + 1) * coinConfig.difficultyAdjustmentBlockCount) - latestBlocks[0].height;
			
			resolve();
		}));

		var targetBlocksPerDay = 24 * 60 * 60 / global.coinConfig.targetBlockTimeSeconds;
		res.locals.targetBlocksPerDay = targetBlocksPerDay;

		if (getblockchaininfo.chain !== 'regtest') {
			/*promises.push(new Promise(async (resolve, reject) => {
				res.locals.txStats = await utils.timePromise("promises.index.getTxCountStats", coreApi.getTxCountStats(targetBlocksPerDay / 4, -targetBlocksPerDay, "latest"));
				
				resolve();
			}));*/

			var chainTxStatsIntervals = [ [targetBlocksPerDay, "24 hours"], [7 * targetBlocksPerDay, "7 days"], [30 * targetBlocksPerDay, "30 days"] ]
				.filter(dat => dat[0] <= getblockchaininfo.blocks);

			res.locals.chainTxStats = {};
			for (var i = 0; i < chainTxStatsIntervals.length; i++) {
				promises.push(new Promise(async (resolve, reject) => {
					res.locals.chainTxStats[chainTxStatsIntervals[i][0]] = await utils.timePromise(`promises.index.getChainTxStats-${chainTxStatsIntervals[i][0]}`, coreApi.getChainTxStats(chainTxStatsIntervals[i][0]));
					
					resolve();
				}));
			}

			chainTxStatsIntervals.push([-1, "All time"]);
			res.locals.chainTxStatsIntervals = chainTxStatsIntervals;

			promises.push(new Promise(async (resolve, reject) => {
				res.locals.chainTxStats[-1] = await utils.timePromise(`promises.index.getChainTxStats-allTime`, coreApi.getChainTxStats(getblockchaininfo.blocks - 1));
				
				resolve();
			}));
		}

		promises.push(new Promise(async (resolve, reject) => {
			try {
				let blockTemplate = await global.rpcClient.command('getblocktemplate', {"rules": ["segwit"]});

				res.locals.nextBlockTemplate = blockTemplate;
				
				var minFeeRate = 1000000;
				var maxFeeRate = 0;
				var minFeeTxid = null;
				var maxFeeTxid = null;

				var parentTxIndexes = new Set();
				blockTemplate.transactions.forEach(tx => {
					if (tx.depends && tx.depends.length > 0) {
						tx.depends.forEach(index => {
							parentTxIndexes.add(index);
						});
					}
				});

				var txIndex = 1;
				blockTemplate.transactions.forEach(tx => {
					var feeRate = tx.fee / tx.weight * 4;
					if (tx.depends && tx.depends.length > 0) {
						var totalFee = tx.fee;
						var totalWeight = tx.weight;

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

				res.locals.nextBlockFeeRateGroups = [];
				var groupCount = 10;
				for (var i = 0; i < groupCount; i++) {
					res.locals.nextBlockFeeRateGroups.push({
						minFeeRate: minFeeRate + i * (maxFeeRate - minFeeRate) / groupCount,
						maxFeeRate: minFeeRate + (i + 1) * (maxFeeRate - minFeeRate) / groupCount,
						totalWeight: 0,
						txidCount: 0,
						//txids: []
					});
				}

				var txIncluded = 0;
				blockTemplate.transactions.forEach(tx => {
					var feeRate = tx.avgFeeRate ? tx.avgFeeRate : (tx.fee / tx.weight * 4);

					for (var i = 0; i < res.locals.nextBlockFeeRateGroups.length; i++) {
						if (feeRate >= res.locals.nextBlockFeeRateGroups[i].minFeeRate) {
							if (feeRate < res.locals.nextBlockFeeRateGroups[i].maxFeeRate) {
								res.locals.nextBlockFeeRateGroups[i].totalWeight += tx.weight;
								res.locals.nextBlockFeeRateGroups[i].txidCount++;
								
								//res.locals.nextBlockFeeRateGroups[i].txids.push(tx.txid);

								txIncluded++;

								break;
							}
						}
					}
				});

				res.locals.nextBlockFeeRateGroups.forEach(group => {
					group.weightRatio = group.totalWeight / blockTemplate.weightlimit;
				});



				res.locals.nextBlockMinFeeRate = minFeeRate;
				res.locals.nextBlockMaxFeeRate = maxFeeRate;
				res.locals.nextBlockMinFeeTxid = minFeeTxid;
				res.locals.nextBlockMaxFeeTxid = maxFeeTxid;

				var subsidy = coinConfig.blockRewardFunction(blockTemplate.height, global.activeBlockchain);

				res.locals.nextBlockTotalFees = new Decimal(blockTemplate.coinbasevalue).dividedBy(coinConfig.baseCurrencyUnit.multiplier).minus(new Decimal(subsidy));

				resolve();

			} catch (err) {
				utils.logError("3r8weyhfugehe", err);

				resolve();
			}
		}));


		await Promise.all(promises);
		
		
		var firstBlockHeader = res.locals.difficultyPeriodFirstBlockHeader;
		var currentBlock = res.locals.latestBlocks[0];
		var heightDiff = currentBlock.height - firstBlockHeader.height;
		var blockCount = heightDiff + 1;
		var timeDiff = currentBlock.mediantime - firstBlockHeader.mediantime;
		var timePerBlock = timeDiff / heightDiff;
		var timePerBlockDuration = moment.duration(timePerBlock * 1000);
		var daysUntilAdjustment = new Decimal(res.locals.blocksUntilDifficultyAdjustment).times(timePerBlock).dividedBy(60 * 60 * 24);
		var hoursUntilAdjustment = new Decimal(res.locals.blocksUntilDifficultyAdjustment).times(timePerBlock).dividedBy(60 * 60);
		var duaDP1 = daysUntilAdjustment.toDP(1);
		var daysUntilAdjustmentStr = daysUntilAdjustment > 1 ? `~${duaDP1} day${duaDP1 == "1" ? "" : "s"}` : "< 1 day";
		var hoursUntilAdjustmentStr = hoursUntilAdjustment > 1 ? `~${hoursUntilAdjustment.toDP(0)} hr${hoursUntilAdjustment.toDP(1) == "1" ? "" : "s"}` : "< 1 hr";
		var nowTime = new Date().getTime() / 1000;
		var dt = nowTime - firstBlockHeader.time;
		var timePerBlock2 = dt / heightDiff;
		var predictedBlockCount = dt / coinConfig.targetBlockTimeSeconds;

		if (predictedBlockCount > blockCount) {
			var diffAdjPercent = new Decimal(100).minus(new Decimal(blockCount / predictedBlockCount).times(100)).times(-1);
			var diffAdjText = `Blocks during the current difficulty epoch have taken this long, on average, to be mined. If this pace continues, then in ${res.locals.blocksUntilDifficultyAdjustment.toLocaleString()} block${res.locals.blocksUntilDifficultyAdjustment == 1 ? "" : "s"} (${daysUntilAdjustmentStr}) the difficulty will adjust downward: -${diffAdjPercent.toDP(1)}%`;
			var diffAdjSign = "-";
			var textColorClass = "text-danger";

		} else {
			var diffAdjPercent = new Decimal(100).minus(new Decimal(predictedBlockCount / blockCount).times(100));
			var diffAdjText = `Blocks during the current difficulty epoch have taken this long, on average, to be mined. If this pace continues, then in ${res.locals.blocksUntilDifficultyAdjustment.toLocaleString()} block${res.locals.blocksUntilDifficultyAdjustment == 1 ? "" : "s"} (${daysUntilAdjustmentStr}) the difficulty will adjust upward: +${diffAdjPercent.toDP(1)}%`;
			var diffAdjSign = "+";
			var textColorClass = "text-success";
		}

		res.locals.difficultyAdjustmentData = {
			estimateAvailable: !isNaN(diffAdjPercent),

			blockCount: blockCount,
			blocksLeft: res.locals.blocksUntilDifficultyAdjustment,
			daysLeftStr: daysUntilAdjustmentStr,
			timeLeftStr: (daysUntilAdjustment < 1 ? hoursUntilAdjustmentStr : daysUntilAdjustmentStr),
			calculationBlockCount: heightDiff,
			currentEpoch: res.locals.difficultyPeriod,

			delta: diffAdjPercent,
			sign: diffAdjSign,

			timePerBlock: timePerBlock,
			firstBlockTime: firstBlockHeader.time,
			nowTime: nowTime,
			dt: dt,
			predictedBlockCount: predictedBlockCount,

			//nameDesc: `Estimate for the difficulty adjustment that will occur in ${res.locals.blocksUntilDifficultyAdjustment.toLocaleString()} block${res.locals.blocksUntilDifficultyAdjustment == 1 ? "" : "s"} (${daysUntilAdjustmentStr}). This is calculated using the average block time over the last ${heightDiff} block(s). This estimate becomes more reliable as the difficulty epoch nears its end.`,
		};


		res.render("index");

		next();

	} catch (err) {
		utils.logError("238023hw87gddd", err);
					
		res.locals.userMessage = "Error building page: " + err;

		res.render("index");

		next();
	}
}));

router.get("/node-details", asyncHandler(async (req, res, next) => {
	try {
		const promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.getblockchaininfo = await utils.timePromise("promises.node-details.getBlockchainInfo", coreApi.getBlockchainInfo());

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.getnetworkinfo = await utils.timePromise("promises.node-details.getNetworkInfo", coreApi.getNetworkInfo());

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.uptimeSeconds = await utils.timePromise("promises.node-details.getUptimeSeconds", coreApi.getUptimeSeconds());

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.getnettotals = await utils.timePromise("promises.node-details.getNetTotals", coreApi.getNetTotals());

			resolve();
		}));

		await Promise.all(promises);

		res.render("node-details");

		next();

	} catch (err) {
		utils.logError("32978efegdde", err);
					
		res.locals.userMessage = "Error building page: " + err;

		res.render("node-details");

		next();
	}
}));

router.get("/mempool-summary", asyncHandler(async (req, res, next) => {
	try {
		res.locals.satoshiPerByteBucketMaxima = coinConfig.feeSatoshiPerByteBucketMaxima;

		res.render("mempool-summary");

		next();

	} catch (err) {
		utils.logError("390824yw7e332", err);
					
		res.locals.userMessage = "Error building page: " + err;

		res.render("mempool-summary");

		next();
	}
}));

router.get("/peers", asyncHandler(async (req, res, next) => {
	try {
		const promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.peerSummary = await utils.timePromise("promises.peers.getPeerSummary", coreApi.getPeerSummary());

			resolve();
		}));

		await Promise.all(promises);

		var peerSummary = res.locals.peerSummary;

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
			res.locals.peerIpSummary = await utils.timePromise("promises.peers.geoLocateIpAddresses", utils.geoLocateIpAddresses(peerIps));
			res.locals.mapBoxComApiAccessKey = config.credentials.mapBoxComApiAccessKey;
		}


		res.render("peers");

		next();

	} catch (err) {
		utils.logError("394rhweghe", err);
					
		res.locals.userMessage = "Error: " + err;

		res.render("peers");

		next();
	}
}));

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
		if (!req.session.userSettings) {
			req.session.userSettings = {};
		}

		req.session.userSettings[req.query.name] = req.query.value;

		var userSettings = JSON.parse(req.cookies["user-settings"] || "{}");
		userSettings[req.query.name] = req.query.value;

		res.cookie("user-settings", JSON.stringify(userSettings));
	}

	res.redirect(req.headers.referer);
});

router.get("/session-data", function(req, res, next) {
	if (req.query.action && req.query.data) {
		let action = req.query.action;
		let data = req.query.data;

		if (action == "add-rpc-favorite") {
			if (!req.session.favoriteRpcCommands) {
				req.session.favoriteRpcCommands = [];
			}

			if (!req.session.favoriteRpcCommands.includes(data)) {
				req.session.favoriteRpcCommands.push(data);
			}

			req.session.favoriteRpcCommands.sort();
		}

		if (action == "remove-rpc-favorite") {
			if (!req.session.favoriteRpcCommands) {
				req.session.favoriteRpcCommands = [];
			}

			if (req.session.favoriteRpcCommands.includes(data)) {
				req.session.favoriteRpcCommands.splice(req.session.favoriteRpcCommands.indexOf(data), 1);
			}
		}
	}

	res.redirect(req.headers.referer);
});

router.get("/user-settings", function(req, res, next) {
	res.render("user-settings");

	next();
});

router.get("/blocks", asyncHandler(async (req, res, next) => {
	try {
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
		res.locals.paginationBaseUrl = "./blocks";

		// if pruning is active, global.pruneHeight is used when displaying this page
		// global.pruneHeight is updated whenever we send a getblockchaininfo RPC to the node

		var getblockchaininfo = await utils.timePromise("promises.blocks.geoLocateIpAddresses", coreApi.getBlockchainInfo());

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

		blockHeights = blockHeights.filter((h) => {
			return h >= 0 && h <= getblockchaininfo.blocks;
		});


		var promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			res.locals.blocks = await utils.timePromise("promises.blocks.getBlocksByHeight", coreApi.getBlocksByHeight(blockHeights));

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			try {
				var rawblockstats = await utils.timePromise("promises.blocks.getBlocksStatsByHeight", coreApi.getBlocksStatsByHeight(blockHeights));

				if (rawblockstats != null && rawblockstats.length > 0 && rawblockstats[0] != null) {
					res.locals.blockstatsByHeight = {};

					for (var i = 0; i < rawblockstats.length; i++) {
						var blockstats = rawblockstats[i];

						res.locals.blockstatsByHeight[blockstats.height] = blockstats;
					}
				}

				resolve();

			} catch (err) {
				if (!global.prunedBlockchain) {
					reject(err);

				} else {
					// failure may be due to pruning, let it pass
					// TODO: be more discerning here
					resolve();
				}
			}
		}));


		await Promise.all(promises);

		res.render("blocks");

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("32974hrbfbvc", err));

		res.locals.userMessage = "Error: " + err;

		res.render("blocks");

		next();
	}
}));

router.get("/mining-summary", asyncHandler(async (req, res, next) => {
	try {
		var getblockchaininfo = await utils.timePromise("promises.mining-summary.getBlockchainInfo", coreApi.getBlockchainInfo());

		res.locals.currentBlockHeight = getblockchaininfo.blocks;

		res.render("mining-summary");

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("39342heuges", err));

		res.locals.userMessage = "Error: " + err;

		res.render("mining-summary");

		next();
	}
}));

router.get("/xpub/:extendedPubkey", asyncHandler(async (req, res, next) => {
	try {
		const extendedPubkey = req.params.extendedPubkey;
		res.locals.extendedPubkey = extendedPubkey;

		
		let limit = 20;
		if (req.query.limit) {
			limit = parseInt(req.query.limit);
		}
		res.locals.limit = limit;

		let offset = 0;
		if (req.query.offset) {
			offset = parseInt(req.query.offset);
		}
		res.locals.offset = offset;

		
		res.locals.paginationBaseUrl = `./xpub/${extendedPubkey}`;


		const receiveAddresses = [];
		const changeAddresses = [];

		res.locals.pubkeyType = "Unknown";
		res.locals.derivationPath = "Unknown";
		res.locals.pubkeyTypeDesc = null;

		// if xpub/ypub/zpub convert to address under path m/0/0
		if (extendedPubkey.startsWith("xpub")) {
			res.locals.pubkeyType = "P2PKH / P2SH";
			res.locals.pubkeyTypeDesc = "Pay to Public Key Hash (P2PKH) or Pay to Script Hash (P2SH)";
			res.locals.derivationPath = "m/44'/0'";
			
			var bip32object = bip32.fromBase58(extendedPubkey);

			for (var i = 0; i < limit; i++) {
				var bip32Child = bip32object.derive(0).derive(offset + i);
				var publicKey = bip32Child.publicKey;
				var generatedAddress = bitcoinjs.payments.p2pkh({ pubkey: publicKey }).address;

				receiveAddresses.push(generatedAddress);
			}

			for (var i = 0; i < limit; i++) {
				var bip32Child = bip32object.derive(1).derive(offset + i);
				var publicKey = bip32Child.publicKey;
				var generatedAddress = bitcoinjs.payments.p2pkh({ pubkey: publicKey }).address;

				changeAddresses.push(generatedAddress);
			}
		} else if (extendedPubkey.startsWith("ypub")) {
			res.locals.pubkeyType = "P2WPKH in P2SH";
			res.locals.pubkeyTypeDesc = "Pay to Witness Public Key Hash (P2WPKH) wrapped inside Pay to Script Hash (P2SH) - aka Wrapped Segwit";
			res.locals.derivationPath = "m/49'/0'";

			var data = b58.decode(extendedPubkey)
			data = data.slice(4)
			data = Buffer.concat([Buffer.from('0488b21e','hex'), data])
			
			var bip32object = bip32.fromBase58(b58.encode(data));

			for (var i = 0; i < limit; i++) {
				var bip32Child = bip32object.derive(0).derive(offset + i);
				var publicKey = bip32Child.publicKey;
				var generatedAddress = bitcoinjs.payments.p2sh({ redeem: bitcoinjs.payments.p2wpkh({ pubkey: publicKey })}).address;

				receiveAddresses.push(generatedAddress);
			}

			for (var i = 0; i < limit; i++) {
				var bip32Child = bip32object.derive(1).derive(offset + i);
				var publicKey = bip32Child.publicKey;
				var generatedAddress = bitcoinjs.payments.p2sh({ redeem: bitcoinjs.payments.p2wpkh({ pubkey: publicKey })}).address;

				changeAddresses.push(generatedAddress);
			}
		} else if (extendedPubkey.startsWith("zpub")) {
			res.locals.pubkeyType = "P2WPKH";
			res.locals.pubkeyTypeDesc = "Pay to Witness Public Key Hash (P2WPKH) - aka Native Segwit";
			res.locals.derivationPath = "m/84'/0'";

			var data = b58.decode(extendedPubkey);
			data = data.slice(4)
			data = Buffer.concat([Buffer.from('0488b21e','hex'), data])
			
			var bip32object = bip32.fromBase58(b58.encode(data));

			for (var i = 0; i < limit; i++) {
				var bip32Child = bip32object.derive(0).derive(offset + i);
				var publicKey = bip32Child.publicKey;
				var generatedAddress = bitcoinjs.payments.p2wpkh({ pubkey: publicKey }).address;

				receiveAddresses.push(generatedAddress);
			}

			for (var i = 0; i < limit; i++) {
				var bip32Child = bip32object.derive(1).derive(offset + i);
				var publicKey = bip32Child.publicKey;
				var generatedAddress = bitcoinjs.payments.p2wpkh({ pubkey: publicKey }).address;

				changeAddresses.push(generatedAddress);
			}
		} else if (extendedPubkey.startsWith("Ypub")) {
			res.locals.pubkeyType = "Multi-Sig P2WSH in P2SH";
			res.locals.derivationPath = "-";

		} else if (extendedPubkey.startsWith("Zpub")) {
			res.locals.pubkeyType = "Multi-Sig P2WSH";
			res.locals.derivationPath = "-";
		}

		if (!extendedPubkey.startsWith("xpub")) {
			res.locals.xpub = anypubToXpub(extendedPubkey);
		}

		res.locals.receiveAddresses = receiveAddresses;
		res.locals.changeAddresses = changeAddresses;

		res.render("extended-public-key");

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("23r08uyhe7ege", err));

		res.locals.userMessage = "Error: " + err;

		res.render("extended-public-key");

		next();
	}
}));

function anypubToXpub(xyzpub) {
	let data = b58.decode(xyzpub);
	data = data.slice(4);
	data = Buffer.concat([Buffer.from('0488b21e','hex'), data]);

	return b58.encode(data);
}

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

router.get("/mining-template", asyncHandler(async (req, res, next) => {
	const blockTemplate = await global.rpcClient.command('getblocktemplate', {"rules": ["segwit"]});

	res.locals.minFeeRate = 1000000;
	res.locals.maxFeeRate = -1;

	const parentTxIndexes = new Set();
	blockTemplate.transactions.forEach(tx => {
		if (tx.depends && tx.depends.length > 0) {
			tx.depends.forEach(index => {
				parentTxIndexes.add(index);
			});
		}
	});

	var txIndex = 1;
	blockTemplate.transactions.forEach(tx => {
		let feeRate = tx.fee / tx.weight * 4;

		if (tx.depends && tx.depends.length > 0) {
			var totalFee = tx.fee;
			var totalWeight = tx.weight;

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
			if (feeRate > res.locals.maxFeeRate) {
				res.locals.maxFeeRate = feeRate;
			}

			if (feeRate < res.locals.minFeeRate) {
				res.locals.minFeeRate = feeRate;
			}
		}

		txIndex++;
	});

	res.locals.blockTemplate = blockTemplate;

	res.render("mining-template");

	next();
}));

router.get("/search", function(req, res, next) {
	res.render("search");

	next();
});

router.post("/search", function(req, res, next) {
	if (!req.body.query) {
		req.session.userMessage = "Enter a block height, block hash, or transaction id.";

		res.redirect("./");

		return;
	}

	var query = req.body.query.toLowerCase().trim();
	var rawCaseQuery = req.body.query.trim();

	req.session.query = req.body.query;
	
	// xpub/ypub/zpub -> redirect: /xpub/XXX
	if (rawCaseQuery.match(/^(xpub|ypub|zpub|Ypub|Zpub).*$/)) {
		res.redirect(`./xpub/${rawCaseQuery}`);
		
		return;
	}
	
	
	// Support txid@height lookups
	if (/^[a-f0-9]{64}@\d+$/.test(query)) {
		return res.redirect("./tx/" + query);
	}

	if (query.length == 64) {
		coreApi.getRawTransaction(query).then(function(tx) {
			res.redirect("./tx/" + query);

		}).catch(function(err) {
			coreApi.getBlockByHash(query).then(function(blockByHash) {
				res.redirect("./block/" + query);

			}).catch(function(err) {
				req.session.userMessage = "No results found for query: " + query;

				if (!global.txindexAvailable) {
					req.session.userMessage += noTxIndexMsg;
				}
				
				res.redirect("./");
			});
		});

	} else if (!isNaN(query)) {
		coreApi.getBlockByHeight(parseInt(query)).then(function(blockByHeight) {
			res.redirect("./block-height/" + query);
			
		}).catch(function(err) {
			req.session.userMessage = "No results found for query: " + query;

			res.redirect("./");
		});
	} else {
		coreApi.getAddress(rawCaseQuery).then(function(validateaddress) {
			if (validateaddress && validateaddress.isvalid) {
				res.redirect("./address/" + rawCaseQuery);

				return;
			}

			req.session.userMessage = "No results found for query: " + rawCaseQuery;

			res.redirect("./");
		});
	}
});

router.get("/block-height/:blockHeight", asyncHandler(async (req, res, next) => {
	try {
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
		res.locals.paginationBaseUrl = "./block-height/" + blockHeight;

		const result = await utils.timePromise("promises.block-height.getBlockByHeight", coreApi.getBlockByHeight(blockHeight));
		res.locals.result.getblockbyheight = result;

		var promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			const blockWithTransactions = await utils.timePromise("promises.block-height.getBlockByHashWithTransactions", coreApi.getBlockByHashWithTransactions(result.hash, limit, offset));

			res.locals.result.getblock = blockWithTransactions.getblock;
			res.locals.result.transactions = blockWithTransactions.transactions;
			res.locals.result.txInputsByTransaction = blockWithTransactions.txInputsByTransaction;

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			try {
				const blockStats = await utils.timePromise("promises.block-height.getBlockStats", coreApi.getBlockStats(result.hash));
				
				res.locals.result.blockstats = blockStats;

				resolve();

			} catch (err) {
				if (global.prunedBlockchain) {
					// unavailable, likely due to pruning
					debugLog('Failed loading block stats', err);
					res.locals.result.blockstats = null;

					resolve();

				} else {
					throw err;
				}
			}
		}));

		await Promise.all(promises);


		if (global.specialBlocks && global.specialBlocks[res.locals.result.getblock.hash]) {
			let funInfo = global.specialBlocks[res.locals.result.getblock.hash];

			res.locals.metaTitle = funInfo.summary;
			res.locals.metaDesc = funInfo.alertBodyHtml.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

		} else {
			res.locals.metaTitle = `Bitcoin Block #${blockHeight.toLocaleString()}`;
			res.locals.metaDesc = "";
		}
		

		res.render("block");

		next();

	} catch (err) {
		res.locals.userMessageMarkdown = `Failed loading block: height=**${blockHeight}**`;

		res.locals.pageErrors.push(utils.logError("389wer07eghdd", err));

		res.render("block");

		next();
	}
}));

router.get("/block/:blockHash", asyncHandler(async (req, res, next) => {
	try {
		var blockHash = utils.asHash(req.params.blockHash);

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
		res.locals.paginationBaseUrl = "./block/" + blockHash;

		var promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			const blockWithTransactions = await utils.timePromise("promises.block-hash.getBlockByHashWithTransactions", coreApi.getBlockByHashWithTransactions(blockHash, limit, offset));
			
			res.locals.result.getblock = blockWithTransactions.getblock;
			res.locals.result.transactions = blockWithTransactions.transactions;
			res.locals.result.txInputsByTransaction = blockWithTransactions.txInputsByTransaction;

			resolve();
		}));

		promises.push(new Promise(async (resolve, reject) => {
			try {
				const blockStats = await utils.timePromise("promises.block-hash.getBlockStats", coreApi.getBlockStats(blockHash));
				
				res.locals.result.blockstats = blockStats;

				resolve();

			} catch (err) {
				if (global.prunedBlockchain) {
					// unavailable, likely due to pruning
					debugLog('Failed loading block stats, likely due to pruning', err);

					resolve();

				} else {
					reject(err);
				}
			}
		}));

		await Promise.all(promises);


		if (global.specialBlocks && global.specialBlocks[res.locals.result.getblock.hash]) {
			let funInfo = global.specialBlocks[res.locals.result.getblock.hash];

			res.locals.metaTitle = funInfo.summary;
			res.locals.metaDesc = funInfo.alertBodyHtml.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

		} else {
			res.locals.metaTitle = `Bitcoin Block ${utils.ellipsizeMiddle(res.locals.result.getblock.hash, 16)}`;
			res.locals.metaDesc = "";
		}

		
		res.render("block");

		next();

	} catch (err) {
		res.locals.userMessageMarkdown = `Failed to load block: **${blockHash}**`;

		res.locals.pageErrors.push(utils.logError("32824yhr2973t3d", err));

		res.render("block");

		next();
	}
}));

router.get("/predicted-blocks", asyncHandler(async (req, res, next) => {
	try {
		res.locals.satoshiPerByteBucketMaxima = coinConfig.feeSatoshiPerByteBucketMaxima;

		res.render("predicted-blocks");

		next();

	} catch (err) {
		utils.logError("2083ryw0efghsu", err);
					
		res.locals.userMessage = "Error building page: " + err;

		res.render("predicted-blocks");

		next();
	}
}));

router.get("/predicted-blocks-old", asyncHandler(async (req, res, next) => {
	try {
		const mempoolTxids = await utils.timePromise("promises.predicted-blocks.getAllMempoolTxids", coreApi.getAllMempoolTxids());
		let mempoolTxSummaries = await coreApi.getMempoolTxSummaries(mempoolTxids, Math.random().toString(36).substr(2, 5), (x) => {});

		const blockTemplate = {weight: 0, totalFees: new Decimal(0), vB: 0, txCount:0, txids: []};
		const blocks = [];
		
		mempoolTxSummaries.sort((a, b) => {
			let aFeeRate = (a.f + a.af) / (a.w + a.asz * 4);
			let bFeeRate = (b.f + b.af) / (b.w + b.asz * 4);

			if (aFeeRate > bFeeRate) {
				return -1;

			} else if (aFeeRate < bFeeRate) {
				return 1;

			} else {
				return a.key.localeCompare(b.key);
			}
		});

		res.locals.topTxs = mempoolTxSummaries.slice(0, 20);

		let currentBlock = Object.assign({}, blockTemplate);

		for (var i = 0; i < mempoolTxSummaries.length; i++) {
			const tx = mempoolTxSummaries[i];

			tx.frw = tx.f / tx.w;
			tx.fr = tx.f / tx.sz;

			if ((currentBlock.weight + tx.w) > coinConfig.maxBlockWeight) {
				// this tx doesn't fit in the current block we're building
				// so let's finish this one up and add it to the list
				currentBlock.avgFee = currentBlock.totalFees.dividedBy(currentBlock.txCount);
				currentBlock.avgFeeRate = currentBlock.totalFees.dividedBy(currentBlock.vB);

				blocks.push(currentBlock);

				// ...and start a new block
				currentBlock = Object.assign({}, blockTemplate);
				console.log(JSON.stringify(currentBlock));
			}

			currentBlock.txCount++;
			currentBlock.weight += tx.w;
			currentBlock.totalFees = currentBlock.totalFees.plus(new Decimal(tx.f));
			currentBlock.vB += tx.sz;
			//currentBlock.txids.push(tx.key);
		}

		res.locals.projectedBlocks = blocks;

		res.render("predicted-blocks");

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("234efuewgew", err));

		res.render("predicted-blocks");

		next();
	}
}));

router.get("/block-analysis/:blockHashOrHeight", function(req, res, next) {
	var blockHashOrHeight = utils.asHashOrHeight(req.params.blockHashOrHeight);

	var goWithBlockHash = function(blockHash) {
		var blockHash = blockHash;

		res.locals.blockHash = blockHash;

		res.locals.result = {};

		var txResults = [];

		var promises = [];

		res.locals.result = {};

		coreApi.getBlockByHash(blockHash).then(function(block) {
			res.locals.block = block;
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

router.get("/tx/:transactionId@:blockHeight", asyncHandler(async (req, res, next) => {
	req.query.blockHeight = req.params.blockHeight;
	req.url = "/tx/" + req.params.transactionId;

	next();
}));


router.get("/tx/:transactionId", asyncHandler(async (req, res, next) => {
	try {
		var txid = utils.asHash(req.params.transactionId);

		var output = -1;
		if (req.query.output) {
			output = parseInt(req.query.output);
		}

		res.locals.txid = txid;
		res.locals.output = output;


		if (req.query.blockHeight) {
			res.locals.blockHeight = req.query.blockHeight;
		}

		res.locals.result = {};

		var txPromise = req.query.blockHeight ? 
				coreApi.getBlockByHeight(parseInt(req.query.blockHeight))
				.then(block => {
					res.locals.block = block;
					return coreApi.getRawTransactionsWithInputs([txid], -1, block.hash)
				})
				: coreApi.getRawTransactionsWithInputs([txid], -1);

		const rawTxResult = await utils.timePromise("promises.tx.getRawTransactionsWithInputs", txPromise);

		var tx = rawTxResult.transactions[0];

		res.locals.tx = tx;
		res.locals.isCoinbaseTx = tx.vin[0].coinbase;


		res.locals.result.getrawtransaction = tx;
		res.locals.result.txInputs = rawTxResult.txInputsByTransaction[txid] || {};

		var promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			const utxos = await utils.timePromise("promises.tx.getTxUtxos", coreApi.getTxUtxos(tx));
			
			res.locals.utxos = utxos;
				
			resolve();
		}));

		if (tx.confirmations == null) {
			promises.push(new Promise(async (resolve, reject) => {
				const mempoolDetails = await utils.timePromise("promises.tx.getMempoolTxDetails", coreApi.getMempoolTxDetails(txid, true));

				res.locals.mempoolDetails = mempoolDetails;
					
				resolve();
			}));
		} else {
			promises.push(new Promise(async (resolve, reject) => {
				try {
					const blockHeader = await global.rpcClient.command('getblockheader', tx.blockhash);

					res.locals.result.getblock = blockHeader;

					resolve();

				} catch (err) {
					utils.logError("239rge0uwhse", err);

					resolve();
				}
			}));
		}

		await Promise.all(promises);

		if (global.specialTransactions && global.specialTransactions[txid]) {
			let funInfo = global.specialTransactions[txid];

			res.locals.metaTitle = funInfo.summary;
			res.locals.metaDesc = funInfo.alertBodyHtml.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

		} else {
			res.locals.metaTitle = `Bitcoin Transaction ${utils.ellipsizeMiddle(txid, 16)}`;
			res.locals.metaDesc = "";
		}
		
		res.render("transaction");

		next();

	} catch (err) {
		if (global.prunedBlockchain && res.locals.blockHeight && res.locals.blockHeight < global.pruneHeight) {
			// Failure to load tx here is expected and a full description of the situation is given to the user
			// in the UI. No need to also show an error userMessage here.

		} else if (!global.txindexAvailable) {
			res.locals.noTxIndexMsg = noTxIndexMsg;

			// As above, failure to load the tx is expected here and good user feedback is given in the UI.
			// No need for error userMessage.

		} else {
			res.locals.userMessageMarkdown = `Failed to load transaction: txid=**${txid}**`;
		}

		

		utils.logError("1237y4ewssgt", err);

		res.render("transaction");

		next();
	}
}));

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


	var address = utils.asAddress(req.params.address);

	res.locals.address = address;
	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.sort = sort;
	res.locals.paginationBaseUrl = `./address/${address}?sort=${sort}`;
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

							(global.txindexAvailable
								? coreApi.getRawTransactionsWithInputs(txids, 5)
								: coreApi.getRawTransactionsByHeights(txids, blockHeightsByTxid)
									.then(transactions => ({ transactions, txInputsByTransaction: {} }))
							).then(function(rawTxResult) {
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
										var txInputs = rawTxResult.txInputsByTransaction[tx.txid] || {};
										
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
								// the transactions failed loading, render with just the txids list.
								resolve();
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

router.get("/rpc-terminal", function(req, res, next) {
	if (!config.demoSite && !req.authenticated) {
		res.send("RPC Terminal / Browser require authentication. Set an authentication password via the 'BTCEXP_BASIC_AUTH_PASSWORD' environment variable (see .env-sample file for more info).");
		
		next();

		return;
	}

	res.render("rpc-terminal");

	next();
});

router.post("/rpc-terminal", asyncHandler(async (req, res, next) => {
	if (!config.demoSite && !req.authenticated) {
		res.send("RPC Terminal / Browser require authentication. Set an authentication password via the 'BTCEXP_BASIC_AUTH_PASSWORD' environment variable (see .env-sample file for more info).");

		next();

		return;
	}

	var params = req.body.cmd.trim().split(/\s+/);
	var cmd = params.shift();
	var parsedParams = [];

	params.forEach((param, i) => {
		try {
			parsedParams.push(JSON.parse(param));

		} catch (e) {
			// add as string
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

	try {
		const result = await global.rpcClientNoTimeout.command([{method:cmd, parameters:parsedParams}]);//, function(err, result, resHeaders) {
		
		if (result) {
			debugLog("Result[1]: " + JSON.stringify(result, null, 4));

			res.write(JSON.stringify(result, null, 4), function() {
				res.end();
			});

		} else {
			res.write(JSON.stringify({"Error":"No response from node"}, null, 4), function() {
				res.end();
			});
		}
	} catch (err) {
		debugLog(JSON.stringify(err, null, 4));

		res.write(JSON.stringify(err, null, 4), function() {
			res.end();
		});
	}

	next();
}));

router.get("/rpc-browser", asyncHandler(async (req, res, next) => {
	if (!config.demoSite && !req.authenticated) {
		res.send("RPC Terminal / Browser require authentication. Set an authentication password via the 'BTCEXP_BASIC_AUTH_PASSWORD' environment variable (see .env-sample file for more info).");

		next();

		return;
	}

	try {
		const helpContent = await coreApi.getHelp();
		res.locals.gethelp = helpContent;

		var method = "unknown";
		var argValues = [];
		if (req.query.method) {
			method = req.query.method;

			if (!req.session.recentRpcCommands) {
				req.session.recentRpcCommands = [];
			}

			if (!req.session.recentRpcCommands.includes(method)) {
				req.session.recentRpcCommands.unshift(method);
				
				while (req.session.recentRpcCommands.length > 5) {
					req.session.recentRpcCommands.pop();
				}
			}

			res.locals.method = req.query.method;

			const methodHelp = await coreApi.getRpcMethodHelp(req.query.method.trim());
			res.locals.methodhelp = methodHelp;

			if (req.query.execute) {
				var argDetails = methodHelp.args;
				
				if (req.query.args) {
					debugLog("ARGS: " + JSON.stringify(req.query.args));

					for (var i = 0; i < req.query.args.length; i++) {
						var argProperties = argDetails[i].properties;
						debugLog(`ARG_PROPS[${i}]: ` + JSON.stringify(argProperties));

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

							} else if (argProperties[j] === "array" || argProperties[j] === "json array") {
								if (req.query.args[i]) {
									argValues.push(JSON.parse(req.query.args[i]));
								}
								
								break;

							} else if (argProperties[j] === "json object") {
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

				//var csurfPromise = 

				await new Promise((resolve, reject) => {
					forceCsrf(req, res, async (err) => {
						if (err) {
							reject(err);

						} else {
							resolve();
						}
					});
				});

				debugLog("Executing RPC '" + req.query.method + "' with params: " + JSON.stringify(argValues));

				try {
					const startTimeNanos = utils.startTimeNanos();
					const result = await global.rpcClientNoTimeout.command([{method:req.query.method, parameters:argValues}]);//, function(err3, result3, resHeaders3) {
					const dtMillis = utils.dtMillis(startTimeNanos);

					res.locals.executionMillis = dtMillis;

					debugLog("RPC Response: result=" + JSON.stringify(result));

					if (result) {
						res.locals.methodResult = result;

					} else {
						res.locals.methodResult = {"Error":"No response from node."};
					}

					//res.render("rpc-browser");

					//next();

				} catch (err) {
					res.locals.pageErrors.push(utils.logError("23roewuhfdghe", err, {method:req.query.method, params:argValues}));

					res.locals.methodResult = {error:("" + err)};

					//res.render("rpc-browser");

					//next();
				}

				/*forceCsrf(req, res, async (err) => {
					if (err) {
						return next(err);
					}

					
				});*/
			}
		}
	} catch (err) {
		res.locals.pageErrors.push(utils.logError("23ewyf0weee", err, {method:method, params:argValues}));
		
		res.locals.userMessage = "Error loading help content: " + err;
	}

	res.render("rpc-browser");

	next();
}));

router.get("/terminal", function(req, res, next) {
	res.render("terminal");

	next();
});

router.post("/terminal", function(req, res, next) {
	var params = req.body.cmd.trim().split(/\s+/);
	var cmd = params.shift();
	var paramsStr = req.body.cmd.trim().substring(cmd.length).trim();

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

router.get("/mempool-transactions", asyncHandler(async (req, res, next) => {
	try {
		var limit = config.site.browseMempoolTransactionsPageSize;
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
		res.locals.paginationBaseUrl = "./mempool-transactions";

		const mempoolData = await utils.timePromise("promises.mempool-tx.getMempoolTxids", coreApi.getMempoolTxids(limit, offset));

		const txids = mempoolData.txids;
		res.locals.txCount = mempoolData.txCount;

		
		const promises = [];

		promises.push(new Promise(async (resolve, reject) => {
			const transactionData = await utils.timePromise("promises.mempool-tx.getRawTransactionsWithInputs", coreApi.getRawTransactionsWithInputs(txids, config.slowDeviceMode ? 3 : 5));

			res.locals.transactions = transactionData.transactions;
			res.locals.txInputsByTransaction = transactionData.txInputsByTransaction;
			
			resolve();
		}));

		res.locals.mempoolDetailsByTxid = {};

		txids.forEach(txid => {
			promises.push(new Promise(async (resolve, reject) => {
				const mempoolTxidDetails = await utils.timePromise("promises.mempool-tx.getMempoolTxDetails", coreApi.getMempoolTxDetails(txid, false));

				res.locals.mempoolDetailsByTxid[txid] = mempoolTxidDetails;

				resolve();
			}));
		});


		await Promise.all(promises);


		res.render("mempool-transactions");

		next();

	} catch (err) {
		utils.logError("3297gfsdyde3q", err);
					
		res.locals.userMessage = "Error building page: " + err;

		res.render("mempool-transactions");

		next();
	}
}));

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

router.get("/changelog", function(req, res, next) {
	res.locals.changelogHtml = markdown.render(global.changelogMarkdown);

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

router.get("/bitcoin-whitepaper", function(req, res, next) {
	res.render("bitcoin-whitepaper");

	next();
});

router.get("/bitcoin.pdf", function(req, res, next) {
	// ref: https://bitcoin.stackexchange.com/questions/35959/how-is-the-whitepaper-decoded-from-the-blockchain-tx-with-1000x-m-of-n-multisi
	const whitepaperTxid = "54e48e5f5c656b26c3bca14a8c95aa583d07ebe84dde3b7dd4a78f4e4186e713";

	// get all outputs except the last 2 using `gettxout`
	Promise.all([...Array(946).keys()].map(vout => coreApi.getTxOut(whitepaperTxid, vout)))
	.then(function (vouts) {
		// concatenate all multisig pubkeys
		var pdfData = vouts.map((out, n) => {
			var parts = out.scriptPubKey.asm.split(" ")
			// the last output is a 1-of-1
			return n == 945 ? parts[1] : parts.slice(1,4).join('')
		}).join('')

		// strip size and checksum from start and null bytes at the end
		pdfData = pdfData.slice(16).slice(0, -16);

		const hexArray = utils.arrayFromHexString(pdfData);
		res.contentType("application/pdf");
		res.send(Buffer.alloc(hexArray.length, hexArray, "hex"));
	}).catch(function(err) {
		res.locals.userMessageMarkdown = `Failed to load transaction outputs: txid=**${whitepaperTxid}**`;

		res.locals.pageErrors.push(utils.logError("432907twhgeyedg", err));

		res.render("transaction");

		next();
	});
});

module.exports = router;
