"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const express = require('express');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const qrcode = require('qrcode');
const bitcoinjs = require('bitcoinjs-lib');
const sha256 = require("crypto-js/sha256");
const hexEnc = require("crypto-js/enc-hex");
const Decimal = require("decimal.js");
const asyncHandler = require("express-async-handler");

const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");
const btcQuotes = require("./../app/coins/btcQuotes.js");





router.get("/formatCurrencyAmount/:amt", function(req, res, next) {
	res.locals.currencyValue = req.params.amt;

	res.render("includes/value-display");

	next();
});

router.get("/quote/random", function(req, res, next) {
	let done = false;

	while (!done) {
		res.locals.quoteIndex = utils.randomInt(0, btcQuotes.items.length);
		res.locals.quote = btcQuotes.items[res.locals.quoteIndex];

		done = !utils.objHasProperty(res.locals.quote, "duplicateIndex");
	}

	res.render("snippets/quote");

	next();
});

router.get("/next-block", asyncHandler(async (req, res, next) => {
	const promises = [];

	const result = {};

	promises.push(utils.timePromise("api/next-block/getblocktemplate", async () => {
		let nextBlockEstimate = await utils.timePromise("api/next-block/getNextBlockEstimate", async () => {
			return await coreApi.getNextBlockEstimate();
		});


		result.txCount = nextBlockEstimate.blockTemplate.transactions.length;

		result.totalWeight = nextBlockEstimate.weight;

		result.minFeeRate = nextBlockEstimate.minFeeRate;
		result.maxFeeRate = nextBlockEstimate.maxFeeRate;
		result.medianFeeRate = nextBlockEstimate.medianFeeRate;
		result.minFeeTxid = nextBlockEstimate.minFeeTxid;
		result.maxFeeTxid = nextBlockEstimate.maxFeeTxid;

		result.totalFees = nextBlockEstimate.totalFees.toNumber();
	}));

	await utils.awaitPromises(promises);

	res.locals.minFeeRate = result.minFeeRate;
	res.locals.maxFeeRate = result.maxFeeRate;
	res.locals.medianFeeRate = result.medianFeeRate;
	res.locals.txCount = result.txCount;
	res.locals.totalWeight = result.totalWeight;
	res.locals.totalFees = result.totalFees;

	res.render("snippets/index-next-block");
}));

router.get("/index-halving-countdown", asyncHandler(async (req, res, next) => {
	try {
		const getblockchaininfo = await utils.timePromise("snippet.index-halving-countdown.getBlockchainInfo", async () => {
			return await coreApi.getBlockchainInfo();
		});

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

		promises.push(utils.timePromise("snippet.index-halving-countdown.getBlockHeaderByHeight", async () => {
			let h = coinConfig.difficultyAdjustmentBlockCount * res.locals.difficultyPeriod;
			res.locals.difficultyPeriodFirstBlockHeader = await coreApi.getBlockHeaderByHeight(h);
		}));

		promises.push(utils.timePromise("snippet.index-halving-countdown.getBlocksByHeight", async () => {
			const latestBlocks = await coreApi.getBlocksByHeight(blockHeights);
			
			res.locals.latestBlocks = latestBlocks;
		}));

		await utils.awaitPromises(promises);


		let nextHalvingData = utils.nextHalvingEstimates(res.locals.difficultyPeriodFirstBlockHeader, res.locals.latestBlocks[0]);

		res.locals.nextHalvingData = nextHalvingData;

		await utils.timePromise("snippet.index-halving-countdown.render", async () => {
			res.render("snippets/index-halving-countdown");
		});

	} catch (e) {
		res.locals.pageErrors.push(utils.logError("390wrgehburfuge", e));

		await utils.timePromise("snippet.index-halving-countdown.render", async () => {
			res.render("snippets/index-halving-countdown");
		});
	}
}));

router.get("/utxo-set", asyncHandler(async (req, res, next) => {
	const promises = [];

	promises.push(utils.timePromise("api/utxo-set", async () => {
		if (global.utxoSetSummary) {
			res.locals.utxoSetSummary = global.utxoSetSummary;

		} else {
			res.locals.utxoSetSummary = await coreApi.getUtxoSetSummary(true, true);
		}
	}));

	await utils.awaitPromises(promises);

	res.render("snippets/utxo-set");
}));

router.get("/timezone-refresh-toast", asyncHandler(async (req, res, next) => {
	res.render("snippets/tz-update-toast");
}));


router.get("/timestamp", asyncHandler(async (req, res, next) => {
	res.locals.timestamp = req.query.timestamp;
	res.locals.includeAgo = req.query.includeAgo ? (req.query.includeAgo == "true") : true;
	res.locals.formatString = req.query.formatString;

	res.render("snippets/timestamp");
}));




module.exports = router;
