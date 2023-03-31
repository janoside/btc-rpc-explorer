"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const express = require('express');
const csurf = require('csurf');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const qrcode = require('qrcode');
const bitcoinjs = require('bitcoinjs-lib');
const bip32 = require('bip32');
const bs58check = require('bs58check');
const { bech32, bech32m } = require("bech32");
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
const btcQuotes = require("./../app/coins/btcQuotes.js");

const forceCsrf = csurf({ ignoreMethods: [] });

let noTxIndexMsg = "\n\nYour node does not have **txindex** enabled. Without it, you can only lookup wallet, mempool, and recently confirmed transactions by their **txid**. Searching for non-wallet transactions that were confirmed more than "+config.noTxIndexSearchDepth+" blocks ago is only possible if the confirmed block height is available.";

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

		const { perfId, perfResults } = utils.perfLogNewItem({action:"homepage"});
		res.locals.perfId = perfId;

		res.locals.homepage = true;
		
		// don't need timestamp on homepage "blocks-list", this flag disables
		res.locals.hideTimestampColumn = true;


		// variables used by blocks-list.pug
		res.locals.offset = 0;
		res.locals.sort = "desc";

		let feeConfTargets = [1, 6, 144, 1008];
		res.locals.feeConfTargets = feeConfTargets;


		let promises = [];

		promises.push(utils.timePromise("homepage.getMempoolInfo", async () => {
			res.locals.mempoolInfo = await coreApi.getMempoolInfo();
		}, perfResults));

		promises.push(utils.timePromise("homepage.getMiningInfo", async () => {
			res.locals.miningInfo = await coreApi.getMiningInfo();
		}, perfResults));

		promises.push(utils.timePromise("homepage.getSmartFeeEstimates", async () => {
			const rawSmartFeeEstimates = await coreApi.getSmartFeeEstimates("CONSERVATIVE", feeConfTargets);

			let smartFeeEstimates = {};

			for (let i = 0; i < feeConfTargets.length; i++) {
				let rawSmartFeeEstimate = rawSmartFeeEstimates[i];

				if (rawSmartFeeEstimate.errors) {
					smartFeeEstimates[feeConfTargets[i]] = "?";

				} else {
					smartFeeEstimates[feeConfTargets[i]] = parseInt(new Decimal(rawSmartFeeEstimate.feerate).times(coinConfig.baseCurrencyUnit.multiplier).dividedBy(1000));
				}
			}

			res.locals.smartFeeEstimates = smartFeeEstimates;
		}, perfResults));

		promises.push(utils.timePromise("homepage.getNetworkHashrate", async () => {
			res.locals.hashrate7d = await coreApi.getNetworkHashrate(1008);
		}, perfResults));

		promises.push(utils.timePromise("homepage.getNetworkHashrate", async () => {
			res.locals.hashrate30d = await coreApi.getNetworkHashrate(4320);
		}, perfResults));



		const getblockchaininfo = await utils.timePromise("homepage.getBlockchainInfo", async () => {
			return await coreApi.getBlockchainInfo();
		}, perfResults);


		res.locals.getblockchaininfo = getblockchaininfo;

		res.locals.difficultyPeriod = parseInt(Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount));
			

		let blockHeights = [];
		if (getblockchaininfo.blocks) {
			// +1 to page size here so we have the next block to calculate T.T.M.
			for (let i = 0; i < (config.site.homepage.recentBlocksCount + 1); i++) {
				blockHeights.push(getblockchaininfo.blocks - i);
			}
		} else if (global.activeBlockchain == "regtest") {
			// hack: default regtest node returns getblockchaininfo.blocks=0, despite
			// having a genesis block; hack this to display the genesis block
			blockHeights.push(0);
		}

		promises.push(utils.timePromise("homepage.getBlocksStatsByHeight", async () => {
			const rawblockstats = await coreApi.getBlocksStatsByHeight(blockHeights);

			if (rawblockstats && rawblockstats.length > 0 && rawblockstats[0] != null) {
				res.locals.blockstatsByHeight = {};

				for (let i = 0; i < rawblockstats.length; i++) {
					let blockstats = rawblockstats[i];

					res.locals.blockstatsByHeight[blockstats.height] = blockstats;
				}
			}
		}, perfResults));

		promises.push(utils.timePromise("homepage.getBlockHeaderByHeight", async () => {
			let h = coinConfig.difficultyAdjustmentBlockCount * res.locals.difficultyPeriod;
			res.locals.difficultyPeriodFirstBlockHeader = await coreApi.getBlockHeaderByHeight(h);
		}, perfResults));

		promises.push(utils.timePromise("homepage.getBlocksByHeight", async () => {
			const latestBlocks = await coreApi.getBlocksByHeight(blockHeights);
			
			res.locals.latestBlocks = latestBlocks;
			res.locals.blocksUntilDifficultyAdjustment = ((res.locals.difficultyPeriod + 1) * coinConfig.difficultyAdjustmentBlockCount) - latestBlocks[0].height;
		}));

		
		let targetBlocksPerDay = 24 * 60 * 60 / global.coinConfig.targetBlockTimeSeconds;
		res.locals.targetBlocksPerDay = targetBlocksPerDay;

		if (false && getblockchaininfo.chain !== 'regtest') {
			/*promises.push(new Promise(async (resolve, reject) => {
				res.locals.txStats = await utils.timePromise("homepage.getTxStats", coreApi.getTxStats(targetBlocksPerDay / 4, -targetBlocksPerDay, "latest"));
				
				resolve();
			}));*/

			let chainTxStatsIntervals = [ [targetBlocksPerDay, "24 hours"], [7 * targetBlocksPerDay, "7 days"], [30 * targetBlocksPerDay, "30 days"] ]
				.filter(dat => dat[0] <= getblockchaininfo.blocks);

			res.locals.chainTxStats = {};
			for (let i = 0; i < chainTxStatsIntervals.length; i++) {
				promises.push(utils.timePromise(`homepage.getChainTxStats.${chainTxStatsIntervals[i][0]}`, async () => {
					res.locals.chainTxStats[chainTxStatsIntervals[i][0]] = await coreApi.getChainTxStats(chainTxStatsIntervals[i][0]);
				}, perfResults));
			}

			chainTxStatsIntervals.push([-1, "All time"]);
			res.locals.chainTxStatsIntervals = chainTxStatsIntervals;

			promises.push(utils.timePromise("homepage.getChainTxStats.allTime", async () => {
				res.locals.chainTxStats[-1] = await coreApi.getChainTxStats(getblockchaininfo.blocks - 1);
			}, perfResults));
		}

		/*promises.push(utils.timePromise("homepage.getblocktemplate", async () => {
			let nextBlockEstimate = await utils.timePromise("homepage.getNextBlockEstimate", async () => {
				return await coreApi.getNextBlockEstimate();
			}, perfResults);


			res.locals.nextBlockTemplate = nextBlockEstimate.blockTemplate;
			res.locals.nextBlockFeeRateGroups = nextBlockEstimate.feeRateGroups;

			res.locals.nextBlockMinFeeRate = nextBlockEstimate.minFeeRate;
			res.locals.nextBlockMaxFeeRate = nextBlockEstimate.maxFeeRate;
			res.locals.nextBlockMinFeeTxid = nextBlockEstimate.minFeeTxid;
			res.locals.nextBlockMaxFeeTxid = nextBlockEstimate.maxFeeTxid;

			res.locals.nextBlockTotalFees = nextBlockEstimate.totalFees;
		
		}, perfResults));*/


		await utils.awaitPromises(promises);

		let eraStartBlockHeader = res.locals.difficultyPeriodFirstBlockHeader;
		let currentBlock = res.locals.latestBlocks[0];

		res.locals.difficultyAdjustmentData = utils.difficultyAdjustmentEstimates(eraStartBlockHeader, currentBlock);



		res.locals.perfResults = perfResults;


		await utils.timePromise("homepage.render", async () => {
			res.render("index");
		}, perfResults);

		next();

	} catch (err) {
		utils.logError("238023hw87gddd", err);
					
		res.locals.userMessage = "Error building page: " + err;

		await utils.timePromise("homepage.render", async () => {
			res.render("index");
		});

		next();
	}
}));

router.get("/node-details", asyncHandler(async (req, res, next) => {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"node-details"});
		res.locals.perfId = perfId;

		const promises = [];

		promises.push(utils.timePromise("node-details.getBlockchainInfo", async () => {
			res.locals.getblockchaininfo = await coreApi.getBlockchainInfo();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getDeploymentInfo", async () => {
			res.locals.getdeploymentinfo = await coreApi.getDeploymentInfo();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getNetworkInfo", async () => {
			res.locals.getnetworkinfo = await coreApi.getNetworkInfo();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getUptimeSeconds", async () => {
			res.locals.uptimeSeconds = await coreApi.getUptimeSeconds();
		}, perfResults));

		promises.push(utils.timePromise("node-details.getNetTotals", async () => {
			res.locals.getnettotals = await coreApi.getNetTotals();
		}, perfResults));


		await utils.awaitPromises(promises);


		res.locals.perfResults = perfResults;

		await utils.timePromise("node-details.render", async () => {
			res.render("node-details");
		}, perfResults);
		
		next();

	} catch (err) {
		utils.logError("32978efegdde", err);
					
		res.locals.userMessage = "Error building page: " + err;

		await utils.timePromise("node-details.render", async () => {
			res.render("node-details");
		});

		next();
	}
}));

router.get("/mempool-summary", asyncHandler(async (req, res, next) => {
	try {
		res.locals.satoshiPerByteBucketMaxima = coinConfig.feeSatoshiPerByteBucketMaxima;

		await utils.timePromise("mempool-summary/render", async () => {
			res.render("mempool-summary");
		});

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
		const { perfId, perfResults } = utils.perfLogNewItem({action:"peers"});
		res.locals.perfId = perfId;

		const promises = [];

		promises.push(utils.timePromise("peers.getPeerSummary", async () => {
			res.locals.peerSummary = await coreApi.getPeerSummary();
		}, perfResults));

		
		await utils.awaitPromises(promises);

		let peerSummary = res.locals.peerSummary;

		let peerIps = [];
		for (let i = 0; i < peerSummary.getpeerinfo.length; i++) {
			let ipWithPort = peerSummary.getpeerinfo[i].addr;
			if (ipWithPort.lastIndexOf(":") >= 0) {
				let ip = ipWithPort.substring(0, ipWithPort.lastIndexOf(":"));
				if (ip.trim().length > 0) {
					peerIps.push(ip.trim());
				}
			}
		}

		if (peerIps.length > 0) {
			res.locals.peerIpSummary = await utils.timePromise("peers.geoLocateIpAddresses", async () => {
				return await utils.geoLocateIpAddresses(peerIps)
			}, perfResults);
			
			res.locals.mapBoxComApiAccessKey = config.credentials.mapBoxComApiAccessKey;
		}


		await utils.timePromise("peers.render", async () => {
			res.render("peers");
		}, perfResults);

		next();

	} catch (err) {
		utils.logError("394rhweghe", err);
					
		res.locals.userMessage = "Error: " + err;

		await utils.timePromise("peers.render", async () => {
			res.render("peers");
		});

		next();
	}
}));

router.post("/connect", function(req, res, next) {
	let host = req.body.host;
	let port = req.body.port;
	let username = req.body.username;
	let password = req.body.password;

	res.cookie('rpc-host', host);
	res.cookie('rpc-port', port);
	res.cookie('rpc-username', username);

	req.session.host = host;
	req.session.port = port;
	req.session.username = username;

	let newClient = new bitcoinCore({
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
			req.session.userSettings = Object.create(null);
		}

		if (typeof req.query.name !== "string" || typeof req.query.value !== "string") {
			res.redirect(req.headers.referer);

			return;
		}

		if (req.query.name == "userTzOffset") {
			if (parseFloat(req.query.value) == NaN) {
				res.redirect(req.headers.referer);

				return;
			}
		}

		req.session.userSettings[req.query.name.toString()] = req.query.value.toString();

		let userSettings = JSON.parse(req.cookies["user-settings"] || "{}");
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

router.get("/user-settings", asyncHandler(async (req, res, next) => {
	await utils.timePromise("user-settings.render", async () => {
		res.render("user-settings");
	});

	next();
}));

router.get("/blocks", asyncHandler(async (req, res, next) => {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"blocks"});
		res.locals.perfId = perfId;

		let limit = config.site.browseBlocksPageSize;
		let offset = 0;
		let sort = "desc";

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

		let getblockchaininfo = await utils.timePromise("blocks.geoLocateIpAddresses", coreApi.getBlockchainInfo, perfResults);

		res.locals.blockCount = getblockchaininfo.blocks;
		res.locals.blockOffset = offset;

		let blockHeights = [];
		if (sort == "desc") {
			for (let i = (getblockchaininfo.blocks - offset); i > (getblockchaininfo.blocks - offset - limit - 1); i--) {
				if (i >= 0) {
					blockHeights.push(i);
				}
			}
		} else {
			for (let i = offset - 1; i < (offset + limit); i++) {
				if (i >= 0) {
					blockHeights.push(i);
				}
			}
		}

		blockHeights = blockHeights.filter((h) => {
			return h >= 0 && h <= getblockchaininfo.blocks;
		});


		let promises = [];

		promises.push(utils.timePromise("blocks.getBlocksByHeight", async () => {
			res.locals.blocks = await coreApi.getBlocksByHeight(blockHeights);
		}, perfResults));

		
		promises.push(utils.timePromise("blocks.getBlocksByHeight", async () => {
			try {
				let rawblockstats = await coreApi.getBlocksStatsByHeight(blockHeights);

				if (rawblockstats != null && rawblockstats.length > 0 && rawblockstats[0] != null) {
					res.locals.blockstatsByHeight = {};

					for (let i = 0; i < rawblockstats.length; i++) {
						let blockstats = rawblockstats[i];

						res.locals.blockstatsByHeight[blockstats.height] = blockstats;
					}
				}
			} catch (err) {
				if (!global.prunedBlockchain) {
					throw err;

				} else {
					// failure may be due to pruning, let it pass
					// TODO: be more discerning here...consider throwing something
				}
			}
		}, perfResults));


		await utils.awaitPromises(promises);

		await utils.timePromise("blocks.render", async () => {
			res.render("blocks");
		}, perfResults);

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("32974hrbfbvc", err));

		res.locals.userMessage = "Error: " + err;

		await utils.timePromise("blocks.render", async () => {
			res.render("blocks");
		});

		next();
	}
}));

router.get("/mining-summary", asyncHandler(async (req, res, next) => {
	try {
		let getblockchaininfo = await utils.timePromise("mining-summary.getBlockchainInfo", coreApi.getBlockchainInfo);

		res.locals.currentBlockHeight = getblockchaininfo.blocks;

		await utils.timePromise("mining-summary.render", async () => {
			res.render("mining-summary");
		});

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("39342heuges", err));

		res.locals.userMessage = "Error: " + err;

		res.render("mining-summary");

		next();
	}
}));

router.get("/xyzpub/:extendedPubkey", asyncHandler(async (req, res, next) => {
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

		
		res.locals.paginationBaseUrl = `./xyzpub/${extendedPubkey}`;

		res.locals.metaTitle = `Extended Public Key: ${utils.ellipsizeMiddle(extendedPubkey, 24)}`;


		res.locals.relatedKeys = [];

		const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
		const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";
		const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

		res.locals.pubkeyType = "Unknown";
		res.locals.bip32Path = "Unknown";
		res.locals.pubkeyTypeDesc = null;
		res.locals.keyType = extendedPubkey.substring(0, 4);

		// if xpub/ypub/zpub convert to address under path m/0/0
		if (extendedPubkey.match(/^(xpub|tpub).*$/)) {
			res.locals.pubkeyType = "P2PKH";
			res.locals.pubkeyTypeDesc = "Pay to Public Key Hash";
			res.locals.bip32Path = "m/44'/0'";

			
			let xpub = extendedPubkey;
			if (!extendedPubkey.startsWith(xpub_tpub)) {
				xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
			}

			res.locals.receiveAddresses = utils.bip32Addresses(extendedPubkey, "p2pkh", 0, limit, offset);
			res.locals.changeAddresses = utils.bip32Addresses(extendedPubkey, "p2pkh", 1, limit, offset);

			if (!extendedPubkey.startsWith(xpub_tpub)) {
				res.locals.relatedKeys.push({
					keyType: xpub_tpub,
					key: utils.xpubChangeVersionBytes(xpub, xpub_tpub),
					bip32Path: "m/44'/0'",
					outputType: "P2PKH",
					firstAddresses: utils.bip32Addresses(xpub, "p2pkh", 0, 3, 0)
				});
			}

			res.locals.relatedKeys.push({
				keyType: xpub_tpub,
				key: extendedPubkey,
				bip32Path: "m/44'/0'",
				outputType: "P2PKH",
				firstAddresses: utils.bip32Addresses(xpub, "p2pkh", 0, 3, 0)
			});

			res.locals.relatedKeys.push({
				keyType: ypub_upub,
				key: utils.xpubChangeVersionBytes(xpub, ypub_upub),
				bip32Path: "m/49'/0'",
				outputType: "P2WPKH in P2SH",
				firstAddresses: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 3, 0)
			});

			res.locals.relatedKeys.push({
				keyType: zpub_vpub,
				key: utils.xpubChangeVersionBytes(xpub, zpub_vpub),
				bip32Path: "m/84'/0'",
				outputType: "P2WPKH",
				firstAddresses: utils.bip32Addresses(xpub, "p2wpkh", 0, 3, 0)
			});

		} else if (extendedPubkey.match(/^(ypub|upub).*$/)) {
			res.locals.pubkeyType = "P2WPKH in P2SH";
			res.locals.pubkeyTypeDesc = "Pay to Witness Public Key Hash (P2WPKH) wrapped inside Pay to Script Hash (P2SH), aka Wrapped Segwit";
			res.locals.bip32Path = "m/49'/0'";

			const xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

			res.locals.receiveAddresses = utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, limit, offset);
			res.locals.changeAddresses = utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 1, limit, offset);

			res.locals.relatedKeys.push({
				keyType: xpub_tpub,
				key: xpub,
				bip32Path: "m/44'/0'",
				outputType: "P2PKH",
				firstAddresses: utils.bip32Addresses(xpub, "p2pkh", 0, 3, 0)
			});

			res.locals.relatedKeys.push({
				keyType: ypub_upub,
				key: extendedPubkey,
				bip32Path: "m/49'/0'",
				outputType: "P2WPKH in P2SH",
				firstAddresses: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 3, 0)
			});

			res.locals.relatedKeys.push({
				keyType: zpub_vpub,
				key: utils.xpubChangeVersionBytes(xpub, zpub_vpub),
				bip32Path: "m/84'/0'",
				outputType: "P2WPKH",
				firstAddresses: utils.bip32Addresses(xpub, "p2wpkh", 0, 3, 0)
			});

		} else if (extendedPubkey.match(/^(zpub|vpub).*$/)) {
			res.locals.pubkeyType = "P2WPKH";
			res.locals.pubkeyTypeDesc = "Pay to Witness Public Key Hash, aka Native Segwit";
			res.locals.bip32Path = "m/84'/0'";

			const xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

			res.locals.receiveAddresses = utils.bip32Addresses(xpub, "p2wpkh", 0, limit, offset);
			res.locals.changeAddresses = utils.bip32Addresses(xpub, "p2wpkh", 1, limit, offset);

			res.locals.relatedKeys.push({
				keyType: xpub_tpub,
				key: xpub,
				bip32Path: "m/44'/0'",
				outputType: "P2PKH",
				firstAddresses: utils.bip32Addresses(xpub, "p2pkh", 0, 3, 0)
			});

			res.locals.relatedKeys.push({
				keyType: ypub_upub,
				key: utils.xpubChangeVersionBytes(xpub, ypub_upub),
				bip32Path: "m/49'/0'",
				outputType: "P2WPKH in P2SH",
				firstAddresses: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 3, 0)
			});

			res.locals.relatedKeys.push({
				keyType: zpub_vpub,
				key: extendedPubkey,
				bip32Path: "m/84'/0'",
				outputType: "P2WPKH",
				firstAddresses: utils.bip32Addresses(xpub, "p2wpkh", 0, 3, 0)
			});

		} else if (extendedPubkey.startsWith("Ypub")) {
			res.locals.pubkeyType = "Multi-Sig P2WSH in P2SH";
			res.locals.bip32Path = "-";

		} else if (extendedPubkey.startsWith("Zpub")) {
			res.locals.pubkeyType = "Multi-Sig P2WSH";
			res.locals.bip32Path = "-";
		}

		// Cumulate balanceSat of all addresses
		res.locals.balanceSat = 0;

		// Loop over the 2 types addresses (first receive and then change)
		let allAddresses = [res.locals.receiveAddresses, res.locals.changeAddresses];
		res.locals.receiveAddresses = [];
		res.locals.changeAddresses = [];
		for (let i = 0; i < allAddresses.length; i++) {
			// Duplicate addresses and change them to addressDetails objects with 3 properties (address, balanceSat, txCount)
			let addresses = [...allAddresses[i]];
			for (let j = 0; j < addresses.length; j++) {
				const address = addresses[j];
				const validateaddressResult = await coreApi.getAddress(address);

				// No need to paginate request => use a high limit value
				const addressDetailsResult = await addressApi.getAddressDetails(address, validateaddressResult.scriptPubKey, "desc", 100, 0);

				// In case of errors, we just skip this address result
				if (Array.isArray(addressDetailsResult.errors) && addressDetailsResult.errors.length == 0) {
					res.locals.balanceSat += addressDetailsResult.addressDetails.balanceSat;
					const addressDetails = { ...addressDetailsResult.addressDetails, address};
					if (i == 0)
						res.locals.receiveAddresses.push(addressDetails);
					else
						res.locals.changeAddresses.push(addressDetails);
				}
			}
		}

		await utils.timePromise("extended-public-key.render", async () => {
			res.render("extended-public-key");
		});

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("23r08uyhe7ege", err));

		res.locals.userMessage = "Error: " + err;

		await utils.timePromise("extended-public-key.render", async () => {
			res.render("extended-public-key");
		});

		next();
	}
}));

router.get("/block-stats", asyncHandler(async (req, res, next) => {
	if (semver.lt(global.btcNodeSemver, rpcApi.minRpcVersions.getblockstats)) {
		res.locals.rpcApiUnsupportedError = {rpc:"getblockstats", version:rpcApi.minRpcVersions.getblockstats};
	}

	try {
		const getblockchaininfo = await coreApi.getBlockchainInfo();
		res.locals.currentBlockHeight = getblockchaininfo.blocks;

		await utils.timePromise("block-stats.render", async () => {
			res.render("block-stats");
		});

		next();

	} catch(err) {
		res.locals.userMessage = "Error: " + err;

		await utils.timePromise("block-stats.render", async () => {
			res.render("block-stats");
		});

		next();
	};
}));

router.get("/mining-template", asyncHandler(async (req, res, next) => {
	// url changed
	res.redirect("./next-block");
}));

router.get("/next-block", asyncHandler(async (req, res, next) => {
	const blockTemplate = await coreApi.getBlockTemplate();

	res.locals.minFeeRate = 1000000;
	res.locals.maxFeeRate = -1;
	res.locals.medianFeeRate = -1;

	const parentTxIndexes = new Set();
	blockTemplate.transactions.forEach(tx => {
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

			if (feeRate > res.locals.maxFeeRate) {
				res.locals.maxFeeRate = feeRate;
			}

			if (feeRate < res.locals.minFeeRate) {
				res.locals.minFeeRate = feeRate;
			}
		}

		txIndex++;
	});

	if (feeRates.length > 0) {
		res.locals.medianFeeRate = feeRates[Math.floor(feeRates.length / 2)];
	}

	res.locals.blockTemplate = blockTemplate;

	
	await utils.timePromise("next-block.render", async () => {
		res.render("next-block");
	});

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

	let query = req.body.query.toLowerCase().trim();
	let rawCaseQuery = req.body.query.trim();

	req.session.query = req.body.query;
	
	// xpub/ypub/zpub -> redirect: /xyzpub/XXX
	if (rawCaseQuery.match(/^(xpub|ypub|zpub|Ypub|Zpub).*$/)) {
		res.redirect(`./xyzpub/${rawCaseQuery}`);
		
		return;
	}

	// tpub/upub/vpub -> redirect: /xyzpub/XXX
	if (rawCaseQuery.match(/^(tpub|upub|vpub|Upub|Vpub).*$/)) {
		res.redirect(`./xyzpub/${rawCaseQuery}`);
		
		return;
	}
	
	
	// Support txid@height lookups
	if (/^[a-f0-9]{64}@\d+$/.test(query)) {
		return res.redirect("./tx/" + query);
	}

	let parseAddressData = utils.tryParseAddress(query);

	if (false) {
		if (parseAddressData.errors) {
			parseAddressData.errors.forEach(err => {
				utils.logError("asdfhuadf", err);
			});
		}
	}

	if (parseAddressData.parsedAddress) {
		res.redirect("./address/" + rawCaseQuery);

	} else if (query.length == 64) {
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
		req.session.userMessage = "No results found for query: " + rawCaseQuery;

		res.redirect("./");
	}
});

router.get("/block-height/:blockHeight", asyncHandler(async (req, res, next) => {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"block-height"});
		res.locals.perfId = perfId;

		let blockHeight = parseInt(req.params.blockHeight);

		res.locals.blockHeight = blockHeight;

		res.locals.result = {};

		let limit = config.site.blockTxPageSize;
		let offset = 0;

		res.locals.maxTxOutputDisplayCount = 15;

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


		const result = await utils.timePromise("block-height.getBlockByHeight", async () => {
			return await coreApi.getBlockByHeight(blockHeight);
		}, perfResults);

		res.locals.result.getblockbyheight = result;

		let promises = [];

		promises.push(utils.timePromise("block-height.getBlockByHashWithTransactions", async () => {
			const blockWithTransactions = await coreApi.getBlockByHashWithTransactions(result.hash, limit, offset);

			res.locals.result.getblock = blockWithTransactions.getblock;
			res.locals.result.transactions = blockWithTransactions.transactions;
			res.locals.result.txInputsByTransaction = blockWithTransactions.txInputsByTransaction;
		}, perfResults));

		promises.push(utils.timePromise("block-height.getBlockStats", async () => {
			try {
				const blockStats = await coreApi.getBlockStats(result.hash);
				
				res.locals.result.blockstats = blockStats;

			} catch (err) {
				if (global.prunedBlockchain) {
					// unavailable, likely due to pruning
					debugLog('Failed loading block stats', err);
					res.locals.result.blockstats = null;

				} else {
					throw err;
				}
			}
		}, perfResults));

		await utils.awaitPromises(promises);


		if (global.specialBlocks && global.specialBlocks[res.locals.result.getblock.hash]) {
			let funInfo = global.specialBlocks[res.locals.result.getblock.hash];

			res.locals.metaTitle = funInfo.summary;

			if (funInfo.alertBodyHtml) {
				res.locals.metaDesc = funInfo.alertBodyHtml.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

			} else {
				res.locals.metaDesc = "";
			}
		} else {
			res.locals.metaTitle = `Bitcoin Block #${blockHeight.toLocaleString()}`;
			res.locals.metaDesc = "";
		}
		

		await utils.timePromise("block-height.render", async () => {
			res.render("block");
		}, perfResults);

		next();

	} catch (err) {
		res.locals.userMessageMarkdown = `Failed loading block: height=**${blockHeight}**`;

		res.locals.pageErrors.push(utils.logError("389wer07eghdd", err));

		await utils.timePromise("block-height.render", async () => {
			res.render("block");
		});

		next();
	}
}));

router.get("/block/:blockHash", asyncHandler(async (req, res, next) => {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"block"});
		res.locals.perfId = perfId;

		let blockHash = utils.asHash(req.params.blockHash);

		res.locals.blockHash = blockHash;

		res.locals.result = {};

		let limit = config.site.blockTxPageSize;
		let offset = 0;

		res.locals.maxTxOutputDisplayCount = 15;

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

		let promises = [];

		promises.push(utils.timePromise("block.getBlockByHashWithTransactions", async () => {
			const blockWithTransactions = await coreApi.getBlockByHashWithTransactions(blockHash, limit, offset);

			res.locals.result.getblock = blockWithTransactions.getblock;
			res.locals.result.transactions = blockWithTransactions.transactions;
			res.locals.result.txInputsByTransaction = blockWithTransactions.txInputsByTransaction;
		}, perfResults));

		promises.push(utils.timePromise("block.getBlockStats", async () => {
			try {
				const blockStats = await coreApi.getBlockStats(blockHash);
				
				res.locals.result.blockstats = blockStats;

			} catch (err) {
				if (global.prunedBlockchain) {
					// unavailable, likely due to pruning
					debugLog('Failed loading block stats, likely due to pruning', err);

				} else {
					throw err;
				}
			}
		}, perfResults));

		await utils.awaitPromises(promises);


		if (global.specialBlocks && global.specialBlocks[res.locals.result.getblock.hash]) {
			let funInfo = global.specialBlocks[res.locals.result.getblock.hash];

			res.locals.metaTitle = funInfo.summary;

			if (funInfo.alertBodyHtml) {
				res.locals.metaDesc = funInfo.alertBodyHtml.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

			} else {
				res.locals.metaDesc = "";
			}

		} else {
			res.locals.metaTitle = `Bitcoin Block ${utils.ellipsizeMiddle(res.locals.result.getblock.hash, 16)}`;
			res.locals.metaDesc = "";
		}

		
		await utils.timePromise("block.render", async () => {
			res.render("block");
		}, perfResults);

		next();

	} catch (err) {
		res.locals.userMessageMarkdown = `Failed to load block: **${blockHash}**`;

		res.locals.pageErrors.push(utils.logError("32824yhr2973t3d", err));

		await utils.timePromise("block.render", async () => {
			res.render("block");
		});

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
		const mempoolTxids = await utils.timePromise("predicted-blocks.getAllMempoolTxids", coreApi.getAllMempoolTxids());
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

		for (let i = 0; i < mempoolTxSummaries.length; i++) {
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
	let blockHashOrHeight = utils.asHashOrHeight(req.params.blockHashOrHeight);

	let goWithBlockHash = function(blockHash) {
		res.locals.blockHash = blockHash;

		res.locals.result = {};

		let txResults = [];

		let promises = [];

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
		const { perfId, perfResults } = utils.perfLogNewItem({action:"transaction"});
		res.locals.perfId = perfId;

		let txid = utils.asHash(req.params.transactionId);

		let output = -1;
		if (req.query.output) {
			output = parseInt(req.query.output);
		}

		res.locals.txid = txid;
		res.locals.output = output;

		res.locals.maxTxOutputDisplayCount = 40;

		const promises = [];

		if (req.query.blockHeight) {
			res.locals.blockHeight = parseInt(req.query.blockHeight);
		}

		res.locals.result = {};

		let txInputLimit = (res.locals.crawlerBot) ? 3 : -1;

		let txPromise = req.query.blockHeight ? 
				async () => {
					const block = await coreApi.getBlockByHeight(parseInt(req.query.blockHeight));
					res.locals.block = block;
					return await coreApi.getRawTransactionsWithInputs([txid], txInputLimit, block.hash);
				}
				:
				async () => {
					return await coreApi.getRawTransactionsWithInputs([txid], txInputLimit);
				};

		const rawTxResult = await utils.timePromise("tx.getRawTransactionsWithInputs", txPromise, perfResults);

		let tx = rawTxResult.transactions[0];

		res.locals.tx = tx;
		res.locals.isCoinbaseTx = tx.vin[0].coinbase;


		res.locals.result.getrawtransaction = tx;
		res.locals.result.txInputs = rawTxResult.txInputsByTransaction[txid] || {};


		promises.push(utils.timePromise("tx.getTxUtxos", async () => {
			res.locals.utxos = await coreApi.getTxUtxos(tx);
		}, perfResults));

		if (tx.confirmations == null) {
			promises.push(utils.timePromise("tx.getMempoolTxDetails", async () => {
				res.locals.mempoolDetails = await coreApi.getMempoolTxDetails(txid, true);

			}, perfResults));
			
		} else {
			promises.push(utils.timePromise("tx.getblockheader", async () => {
				let rpcResult = await rpcApi.getRpcDataWithParams({method:'getblockheader', parameters:[tx.blockhash]});
				res.locals.result.getblock = rpcResult;
			}, perfResults));
		}

		await utils.awaitPromises(promises);

		if (global.specialTransactions && global.specialTransactions[txid]) {
			let funInfo = global.specialTransactions[txid];

			res.locals.metaTitle = funInfo.summary;

			if (funInfo.alertBodyHtml) {
				res.locals.metaDesc = funInfo.alertBodyHtml.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

			} else {
				res.locals.metaDesc = "";
			}
		} else {
			res.locals.metaTitle = `Bitcoin Transaction ${utils.ellipsizeMiddle(txid, 16)}`;
			res.locals.metaDesc = "";
		}

		res.locals.perfResults = perfResults;
		
		await utils.timePromise("tx.render", async () => {
			res.render("transaction");
		}, perfResults);

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

		await utils.timePromise("tx.render", async () => {
			res.render("transaction");
		});

		next();
	}
}));

router.get("/address/:address", asyncHandler(async (req, res, next) => {
	let address = utils.asAddress(req.params.address);

	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"address"});
		res.locals.perfId = perfId;

		let limit = config.site.addressTxPageSize;
		let offset = 0;
		let sort = "desc";

		res.locals.maxTxOutputDisplayCount = config.site.addressPage.txOutputMaxDefaultDisplay;

		
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


		res.locals.metaTitle = `Bitcoin Address ${address}`;

		res.locals.address = address;
		res.locals.limit = limit;
		res.locals.offset = offset;
		res.locals.sort = sort;
		res.locals.paginationBaseUrl = `./address/${address}?sort=${sort}`;
		res.locals.transactions = [];
		res.locals.addressApiSupport = addressApi.getCurrentAddressApiFeatureSupport();
		
		res.locals.result = {};

		let parseAddressData = utils.tryParseAddress(address);

		if (parseAddressData.parsedAddress) {
			//console.log("address.parse: " + JSON.stringify(parseAddressData));

			res.locals.addressObj = parseAddressData.parsedAddress;
			res.locals.addressEncoding = parseAddressData.encoding;

		} else if (parseAddressData.errors) {
			parseAddressData.errors.forEach(err => {
				res.locals.pageErrors.push(utils.logError("ParseAddressError", err));
			});
		}


		if (global.miningPoolsConfigs) {
			for (let i = 0; i < global.miningPoolsConfigs.length; i++) {
				if (global.miningPoolsConfigs[i].payout_addresses[address]) {
					res.locals.payoutAddressForMiner = global.miningPoolsConfigs[i].payout_addresses[address];
				}
			}
		}



		const validateaddressResult = await coreApi.getAddress(address);
		res.locals.result.validateaddress = validateaddressResult;

		let promises = [];

		if (!res.locals.crawlerBot) {
			let addrScripthash = hexEnc.stringify(sha256(hexEnc.parse(validateaddressResult.scriptPubKey)));
			addrScripthash = addrScripthash.match(/.{2}/g).reverse().join("");

			res.locals.electrumScripthash = addrScripthash;

			promises.push(utils.timePromise("address.getAddressDetails", async () => {
				const addressDetailsResult = await addressApi.getAddressDetails(address, validateaddressResult.scriptPubKey, sort, limit, offset);
				let addressDetails = addressDetailsResult.addressDetails;

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
						let txids = addressDetails.txids;

						// if the active addressApi gives us blockHeightsByTxid, it saves us work, so try to use it
						let blockHeightsByTxid = {};
						if (addressDetails.blockHeightsByTxid) {
							blockHeightsByTxid = addressDetails.blockHeightsByTxid;
						}

						res.locals.txids = txids;

						const rawTxResult = await (global.txindexAvailable
							? coreApi.getRawTransactionsWithInputs(txids, 5)
							: coreApi.getRawTransactionsByHeights(txids, blockHeightsByTxid)
								.then(transactions => ({ transactions, txInputsByTransaction: {} }))
						);
						
						res.locals.transactions = rawTxResult.transactions;
						res.locals.txInputsByTransaction = rawTxResult.txInputsByTransaction;

						
						// for coinbase txs, we need the block height in order to calculate subsidy to display
						let coinbaseTxs = [];
						for (let i = 0; i < rawTxResult.transactions.length; i++) {
							let tx = rawTxResult.transactions[i];

							for (let j = 0; j < tx.vin.length; j++) {
								if (tx.vin[j].coinbase) {
									// addressApi sometimes has blockHeightByTxid already available, otherwise we need to query for it
									if (!blockHeightsByTxid[tx.txid]) {
										coinbaseTxs.push(tx);
									}
								}
							}
						}


						let coinbaseTxBlockHashes = [];
						let blockHashesByTxid = {};
						coinbaseTxs.forEach(function(tx) {
							coinbaseTxBlockHashes.push(tx.blockhash);
							blockHashesByTxid[tx.txid] = tx.blockhash;
						});

						let blockHeightsPromises = [];
						if (coinbaseTxs.length > 0) {
							// we need to query some blockHeights by hash for some coinbase txs
							blockHeightsPromises.push(utils.timePromise("address.getBlocksByHash", async () => {
								const blocksByHashResult = await coreApi.getBlocksByHash(coinbaseTxBlockHashes);
								for (let txid in blockHashesByTxid) {
									if (blockHashesByTxid.hasOwnProperty(txid)) {
										blockHeightsByTxid[txid] = blocksByHashResult[blockHashesByTxid[txid]].height;
									}
								}
							}, perfResults));
						}

						await utils.awaitPromises(blockHeightsPromises);

						let addrGainsByTx = {};
						let addrLossesByTx = {};

						res.locals.addrGainsByTx = addrGainsByTx;
						res.locals.addrLossesByTx = addrLossesByTx;

						let handledTxids = [];

						for (let i = 0; i < rawTxResult.transactions.length; i++) {
							let tx = rawTxResult.transactions[i];
							let txInputs = rawTxResult.txInputsByTransaction[tx.txid] || {};
							
							if (handledTxids.includes(tx.txid)) {
								continue;
							}

							handledTxids.push(tx.txid);

							for (let j = 0; j < tx.vout.length; j++) {
								if (tx.vout[j].value > 0 && tx.vout[j].scriptPubKey) {
									if (utils.getVoutAddresses(tx.vout[j]).includes(address)) {
										if (addrGainsByTx[tx.txid] == null) {
											addrGainsByTx[tx.txid] = new Decimal(0);
										}

										addrGainsByTx[tx.txid] = addrGainsByTx[tx.txid].plus(new Decimal(tx.vout[j].value));
									}
								}
							}

							for (let j = 0; j < tx.vin.length; j++) {
								let txInput = txInputs[j];
								let vinJ = tx.vin[j];

								if (txInput != null) {
									if (txInput && txInput.scriptPubKey) {
										if (utils.getVoutAddresses(txInput).includes(address)) {
											if (addrLossesByTx[tx.txid] == null) {
												addrLossesByTx[tx.txid] = new Decimal(0);
											}

											addrLossesByTx[tx.txid] = addrLossesByTx[tx.txid].plus(new Decimal(txInput.value));
										}
									}
								}
							}

							//debugLog("tx: " + JSON.stringify(tx));
							//debugLog("txInputs: " + JSON.stringify(txInputs));
						}

						res.locals.blockHeightsByTxid = blockHeightsByTxid;
					}
				}
			}, perfResults));

			promises.push(utils.timePromise("address.getBlockchainInfo", async () => {
				res.locals.getblockchaininfo = await coreApi.getBlockchainInfo();
			}, perfResults));
		}

		promises.push(utils.timePromise("address.qrcode.toDataURL", async () => {
			qrcode.toDataURL(address, function(err, url) {
				if (err) {
					res.locals.pageErrors.push(utils.logError("93ygfew0ygf2gf2", err));
				}

				res.locals.addressQrCodeUrl = url;
			});
		}, perfResults));

		await utils.awaitPromises(promises);
		
		await utils.timePromise("address.render", async () => {
			res.render("address");
		}, perfResults);

		next();

	} catch (e) {
		res.locals.pageErrors.push(utils.logError("2108hs0gsdfe", e, {address:address}));

		res.locals.userMessageMarkdown = `Failed to load address: **${address}**`;

		await utils.timePromise("address.render", async () => {
			res.render("address");
		});

		next();
	}
}));

router.get("/next-halving", asyncHandler(async (req, res, next) => {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"next-halving"});
		res.locals.perfId = perfId;

		const getblockchaininfo = await utils.timePromise("homepage.getBlockchainInfo", async () => {
			return await coreApi.getBlockchainInfo();
		}, perfResults);

		let promises = [];

		res.locals.getblockchaininfo = getblockchaininfo;
		res.locals.difficultyPeriod = parseInt(Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount));

		let blockHeights = [];
		if (getblockchaininfo.blocks) {
			for (let i = 0; i < 1; i++) {
				blockHeights.push(getblockchaininfo.blocks - i);
			}
		} else if (global.activeBlockchain == "regtest") {
			// hack: default regtest node returns getblockchaininfo.blocks=0, despite
			// having a genesis block; hack this to display the genesis block
			blockHeights.push(0);
		}

		promises.push(utils.timePromise("homepage.getBlockHeaderByHeight", async () => {
			let h = coinConfig.difficultyAdjustmentBlockCount * res.locals.difficultyPeriod;
			res.locals.difficultyPeriodFirstBlockHeader = await coreApi.getBlockHeaderByHeight(h);
		}, perfResults));

		promises.push(utils.timePromise("homepage.getBlocksByHeight", async () => {
			const latestBlocks = await coreApi.getBlocksByHeight(blockHeights);
			
			res.locals.latestBlocks = latestBlocks;
		}));

		await utils.awaitPromises(promises);


		let nextHalvingData = utils.nextHalvingEstimates(res.locals.difficultyPeriodFirstBlockHeader, res.locals.latestBlocks[0]);

		res.locals.nextHalvingData = nextHalvingData;

		await utils.timePromise("next-halving.render", async () => {
			res.render("next-halving");
		}, perfResults);

		next();

	} catch (e) {
		res.locals.pageErrors.push(utils.logError("013923hege3", e));

		await utils.timePromise("next-halving.render", async () => {
			res.render("next-halving");
		});

		next();
	}
}));

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

	let params = req.body.cmd.trim().split(/\s+/);
	let cmd = params.shift();
	let parsedParams = [];

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
		const rpcResult = await rpcApi.getRpcDataWithParams({method:cmd, parameters:parsedParams});
		const result = rpcResult;
		
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

		let method = "unknown";
		let argValues = [];

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
				let argDetails = methodHelp.args;
				
				if (req.query.args) {
					debugLog("ARGS: " + JSON.stringify(req.query.args));

					for (let i = 0; i < req.query.args.length; i++) {
						let argProperties = argDetails[i].properties;
						debugLog(`ARG_PROPS[${i}]: ` + JSON.stringify(argProperties));

						for (let j = 0; j < argProperties.length; j++) {
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

				//let csurfPromise = 

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
					const rpcResult = await rpcApi.getRpcDataWithParams({method:req.query.method, parameters:argValues});
					const result = rpcResult;
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
	let params = req.body.cmd.trim().split(/\s+/);
	let cmd = params.shift();
	let paramsStr = req.body.cmd.trim().substring(cmd.length).trim();

	if (cmd == "parsescript") {
		const nbs = require('node-bitcoin-script');
		let parsedScript = nbs.parseRawScript(paramsStr, "hex");

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
		let limit = config.site.browseMempoolTransactionsPageSize;
		let offset = 0;
		let sort = "desc";

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

		const perfResults = {};

		const mempoolData = await utils.timePromise("mempool-tx.getMempoolTxids", async () => {
			return await coreApi.getMempoolTxids(limit, offset)
		}, perfResults);

		const txids = mempoolData.txids;
		res.locals.txCount = mempoolData.txCount;

		
		const promises = [];

		promises.push(utils.timePromise("mempool-tx.getRawTransactionsWithInputs", async () => {
			const transactionData = await coreApi.getRawTransactionsWithInputs(txids, config.slowDeviceMode ? 3 : 5);

			res.locals.transactions = transactionData.transactions;
			res.locals.txInputsByTransaction = transactionData.txInputsByTransaction;
		}, perfResults));

		res.locals.mempoolDetailsByTxid = {};

		txids.forEach(txid => {
			promises.push(utils.timePromise("mempool-tx.getRawTransactionsWithInputs", async () => {
				const mempoolTxidDetails = await coreApi.getMempoolTxDetails(txid, false);

				res.locals.mempoolDetailsByTxid[txid] = mempoolTxidDetails;
			}, perfResults));
		});


		await utils.awaitPromises(promises);


		await utils.timePromise("mempool-transactions.render", async () => {
			res.render("mempool-transactions");
		});

		next();

	} catch (err) {
		utils.logError("3297gfsdyde3q", err);
					
		res.locals.userMessage = "Error building page: " + err;

		await utils.timePromise("mempool-transactions.render", async () => {
			res.render("mempool-transactions");
		});

		next();
	}
}));

router.get("/tx-stats", asyncHandler(async (req, res, next) => {
	const promises = [];
	const perfResults = {};

	res.locals.getblockchaininfo = await coreApi.getBlockchainInfo();
	let tipHeight = res.locals.getblockchaininfo.blocks;

	// only re-calculate tx-stats every X blocks since it's data heavy
	let heightInterval = 6;
	let height = heightInterval * Math.floor(tipHeight / heightInterval);

	promises.push(utils.timePromise("tx-stats.getTxStats-all", async () => {
		const statsAll = await coreApi.getTxStats(250, 0, height);

		res.locals.txStats = statsAll;
	}, perfResults));

	promises.push(utils.timePromise("tx-stats.getTxStats-day", async () => {
		const statsDay = await coreApi.getTxStats(144, height - 144, height);
		
		res.locals.txStatsDay = statsDay;
	}, perfResults));

	promises.push(utils.timePromise("tx-stats.getTxStats-week", async () => {
		const statsWeek = await coreApi.getTxStats(200, height - 144 * 7, height);

		res.locals.txStatsWeek = statsWeek;
	}, perfResults));

	promises.push(utils.timePromise("tx-stats.getTxStats-month", async () => {
		const statsMonth = await coreApi.getTxStats(250, height - 144 * 30, height);

		res.locals.txStatsMonth = statsMonth;
	}, perfResults));

	promises.push(utils.timePromise("tx-stats.getTxStats-year", async () => {
		const statsYear = await coreApi.getTxStats(250, height - 144 * 365, height);

		res.locals.txStatsYear = statsYear;
	}, perfResults));


	await utils.awaitPromises(promises);

	res.render("tx-stats");

	next();
}));

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

router.get("/utxo-set", function(req, res, next) {
	res.render("utxo-set");

	next();
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
	let viewType = "new-first";
	if (req.query.viewType) {
		viewType = req.query.viewType;
	}

	let listNewFirst = coins[config.coin].historicalData;
	
	listNewFirst.sort(function(a, b) {
		if (a.date > b.date) {
			return -1;

		} else if (a.date < b.date) {
			return 1;

		} else {
			let x = a.type.localeCompare(b.type);

			if (x == 0) {
				if (a.type == "blockheight") {
					return b.blockHeight - a.blockHeight;

				} else {
					return x;
				}
			}

			return x;
		}
	});

	let listOldFirst = [...listNewFirst];
	listOldFirst.reverse();

	let listByYear = {};
	let itemYears = [];

	listNewFirst.forEach(item => {
		let itemYear = item.date.substring(0, 4);

		if (!itemYears.includes(itemYear)) {
			itemYears.push(itemYear);
			listByYear[itemYear] = [];
		}

		listByYear[itemYear].push(item);
	});

	let listByMonth = {};
	let itemMonths = [];

	listNewFirst.forEach(item => {
		let itemMonth = item.date.substring(5, 7);

		if (!itemMonths.includes(itemMonth)) {
			itemMonths.push(itemMonth);
			listByMonth[itemMonth] = [];
		}

		listByMonth[itemMonth].push(item);
	});

	itemMonths.sort();

	res.locals.viewType = viewType;
	res.locals.listNewFirst = listNewFirst;
	res.locals.listOldFirst = listOldFirst;
	res.locals.listByYear = listByYear;
	res.locals.itemYears = itemYears;
	res.locals.listByMonth = listByMonth;
	res.locals.itemMonths = itemMonths;
	
	res.render("fun");

	next();
});

router.get("/quotes", function(req, res, next) {
	res.locals.btcQuotes = btcQuotes.items;

	res.render("quotes");

	next();
});

router.get("/holidays", function(req, res, next) {
	res.locals.btcHolidays = global.btcHolidays;

	res.render("holidays");

	next();
});

router.get("/quote/:quoteIndex", function(req, res, next) {
	res.locals.quoteIndex = parseInt(req.params.quoteIndex);
	res.locals.btcQuotes = btcQuotes.items;

	if (btcQuotes.items[res.locals.quoteIndex].duplicateIndex) {
		let duplicateIndex = btcQuotes.items[res.locals.quoteIndex].duplicateIndex;

		res.redirect(`${config.baseUrl}quote/${duplicateIndex}`);

		return;
	}

	res.render("quote");

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
		let pdfData = vouts.map((out, n) => {
			let parts = out.scriptPubKey.asm.split(" ")
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
