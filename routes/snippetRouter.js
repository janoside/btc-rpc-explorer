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

const forceCsrf = csurf({ ignoreMethods: [] });





router.get("/formatCurrencyAmount/:amt", function(req, res, next) {
	res.locals.currencyValue = req.params.amt;

	res.render("includes/value-display");

	next();
});

router.get("/quote/random", function(req, res, next) {
	res.locals.quoteIndex = utils.randomInt(0, btcQuotes.items.length);
	res.locals.quote = btcQuotes.items[res.locals.quoteIndex];

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

		result.minFeeRate = nextBlockEstimate.minFeeRate;
		result.maxFeeRate = nextBlockEstimate.maxFeeRate;
		result.minFeeTxid = nextBlockEstimate.minFeeTxid;
		result.maxFeeTxid = nextBlockEstimate.maxFeeTxid;

		result.totalFees = nextBlockEstimate.totalFees.toNumber();
	}));

	await utils.awaitPromises(promises);

	res.locals.minFeeRate = result.minFeeRate;
	res.locals.maxFeeRate = result.maxFeeRate;
	res.locals.txCount = result.txCount;
	res.locals.totalFees = result.totalFees;

	res.render("snippets/index-next-block");
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
