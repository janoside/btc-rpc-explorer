"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const express = require('express');
const csurf = require('csurf');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const bitcoinCore = require("bitcoin-core");
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
const rpcApi = require("./../app/api/rpcApi.js");
const apiDocs = require("./../docs/api.js");

const forceCsrf = csurf({ ignoreMethods: [] });




router.get("/docs", function(req, res, next) {
	res.locals.apiDocs = apiDocs;
	res.locals.route = req.query.route;

	res.locals.categories = [];
	apiDocs.routes.forEach(x => {
		let category = x.category;

		if (!res.locals.categories.find(y => (y.name == category))) {
			res.locals.categories.push({name:category, items:[]});
		}

		res.locals.categories.find(x => (x.name == category)).items.push(x);
	});

	res.render("api-docs");

	next();
});






/// BLOCKS

router.get("/blocks/tip/height", asyncHandler(async (req, res, next) => {
	try {
		const blockcount = await rpcApi.getBlockCount();

		res.send(blockcount.toString());

	} catch (e) {
		utils.logError("a39gfoeuew", e);

		res.json({success: false});
	}

	next();
}));

router.get("/blocks/tip/hash", function(req, res, next) {
	coreApi.getBlockchainInfo().then(function(getblockchaininfo){
		res.send(getblockchaininfo.bestblockhash.toString());
	}).catch(next);
});

router.get("/block/:hashOrHeight", asyncHandler(async (req, res, next) => {
	const hashOrHeight = req.params.hashOrHeight;
	let hash = (hashOrHeight.length == 64 ? hashOrHeight : null);

	try {

		if (hash == null) {
			hash = await coreApi.getBlockHashByHeight(parseInt(hashOrHeight));
		}

		const block = await coreApi.getBlockByHash(hash);

		res.json(block);

	} catch (e) {
		utils.logError("w9fgeddsuos", e);

		res.json({success: false});
	}

	next();
}));




/// TRANSACTIONS

router.get("/tx/:txid", function(req, res, next) {
	var txid = utils.asHash(req.params.txid);

	var promises = [];

	promises.push(coreApi.getRawTransactionsWithInputs([txid]));

	Promise.all(promises).then(function(results) {
		res.json(results[0].transactions[0]);

		next();

	}).catch(function(err) {
		res.json({success:false, error:err});

		next();
	});
});




/// BLOCKCHAIN

router.get("/blockchain/coins", function(req, res, next) {	
	if (global.utxoSetSummary) {
		var supply = parseFloat(global.utxoSetSummary.total_amount).toString();

		res.send(supply.toString());

		next();

	} else {
		// estimated supply
		coreApi.getBlockchainInfo().then(function(getblockchaininfo){
			var estimatedSupply = utils.estimatedSupply(getblockchaininfo.blocks);
			res.send(estimatedSupply.toString());
		}).catch(next);
	}
});




/// MINING

router.get("/mining/hashrate", function(req, res, next) {
	var blocksPerDay = 144;
	var rates = [];
	var timePeriods = [(1*blocksPerDay), (7*blocksPerDay), (30* blocksPerDay)];
	
	coreApi.getNetworkHashrate(timePeriods[0]).then(function(info0){
		var hashRateData = utils.formatLargeNumber(info0, 1)
		rates[0] = hashRateData[0];
		
		coreApi.getNetworkHashrate(timePeriods[1]).then(function(info1){
			var hashRateData = utils.formatLargeNumber(info1, 1)
			rates[1] = hashRateData[0];
			
			coreApi.getNetworkHashrate(timePeriods[2]).then(function(info2){
				var hashRateData = utils.formatLargeNumber(info2, 1)
				rates[2] = hashRateData[0];
		
				res.json({"1Day": rates[0]*1, "7Day": rates[1]*1, "30Day": rates[2]*1});
			});
		});
	}).catch(next);
});

router.get("/mining/diff-adj-estimate", asyncHandler(async (req, res, next) => {
	var promises = [];
	const getblockchaininfo = await utils.timePromise("promises.api.getBlockchainInfo", coreApi.getBlockchainInfo());
	var currentBlock;
	var difficultyPeriod = parseInt(Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount));
	var difficultyPeriodFirstBlockHeader;
	
	promises.push(new Promise(async (resolve, reject) => {
			currentBlock = await utils.timePromise("promises.api.getBlockHeaderByHeight", coreApi.getBlockHeaderByHeight(getblockchaininfo.blocks));
			resolve();
	}));
	
	promises.push(new Promise(async (resolve, reject) => {
			let h = coinConfig.difficultyAdjustmentBlockCount * difficultyPeriod;
			difficultyPeriodFirstBlockHeader = await utils.timePromise("promises.api.getBlockHeaderByHeight", coreApi.getBlockHeaderByHeight(h));
			resolve();
	}));
	
	await Promise.all(promises);
	
	var firstBlockHeader = difficultyPeriodFirstBlockHeader;
	var heightDiff = currentBlock.height - firstBlockHeader.height;
	var timeDiff = currentBlock.mediantime - firstBlockHeader.mediantime;
	var timePerBlock = timeDiff / heightDiff;
	var dt = new Date().getTime() / 1000 - firstBlockHeader.time;	
	var timePerBlock2 = dt / heightDiff;
		
	if (timePerBlock2 > 600) {
		var diffAdjPercent = new Decimal(dt / heightDiff / 600).times(100).minus(100);
		diffAdjPercent = diffAdjPercent * -1;

	} else {
		var diffAdjPercent = new Decimal(100).minus(new Decimal(dt / heightDiff / 600).times(100));
	}	
	
	res.send(diffAdjPercent.toFixed(2).toString());
}));




/// MEMPOOL

router.get("/mempool/count", function(req, res, next) {
	coreApi.getMempoolInfo().then(function(info){
		res.send(info.size.toString());
	}).catch(next);
});

router.get("/mempool/fees", function(req, res, next) {
	var feeConfTargets = [1, 3, 6, 144];
	coreApi.getSmartFeeEstimates("CONSERVATIVE", feeConfTargets).then(function(rawSmartFeeEstimates){
		var smartFeeEstimates = {};
		
		for (var i = 0; i < feeConfTargets.length; i++) {
			var rawSmartFeeEstimate = rawSmartFeeEstimates[i];
			if (rawSmartFeeEstimate.errors) {
				smartFeeEstimates[feeConfTargets[i]] = "?";

			} else {
				smartFeeEstimates[feeConfTargets[i]] = parseInt(new Decimal(rawSmartFeeEstimate.feerate).times(coinConfig.baseCurrencyUnit.multiplier).dividedBy(1000));
			}
		}		
		
		var results = {
			"nextBlock":smartFeeEstimates[1],
			"30min":smartFeeEstimates[3],
			"60min":smartFeeEstimates[6],
			"1day":smartFeeEstimates[144]
		};

		res.json(results);

	}).catch(next);
});





/// PRICE

router.get("/price/:currency/moscowtime", function(req, res, next) {
	var result = 0;
	var amount = 1.0;
	var currency = req.params.currency.toLowerCase();
	if (global.exchangeRates != null && global.exchangeRates[currency] != null) {
		var satsRateData = utils.satoshisPerUnitOfLocalCurrency(currency);
		result = satsRateData.amtRaw;
	}
	else if (currency == "xau" && global.exchangeRates != null && global.goldExchangeRates != null) {
		var dec = new Decimal(amount);
		dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
		var satCurrencyType = global.currencyTypes["sat"];
		var one = new Decimal(1);
		dec = one.dividedBy(dec);
		dec = dec.times(satCurrencyType.multiplier);
		
		result = dec.toFixed(0);
	}
	
	res.send(result.toString());
	next();
});

router.get("/price/:currency/marketcap", function(req, res, next) {
	var result = 0;
	
	coreApi.getBlockchainInfo().then(function(getblockchaininfo){
		var estimatedSupply = utils.estimatedSupply(getblockchaininfo.blocks);
		var price = 0;

		var amount = 1.0;
		var currency = req.params.currency.toLowerCase();
		if (global.exchangeRates != null && global.exchangeRates[currency] != null) {
			var formatData = utils.formatExchangedCurrency(amount, currency);
			price = parseFloat(formatData.valRaw).toFixed(2);
		}
		else if (currency == "xau" && global.exchangeRates != null && global.goldExchangeRates != null) {
			var dec = new Decimal(amount);
			dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
			var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(2);
			price = exchangedAmt;
		}
	
		result = estimatedSupply * price;
		res.send(result.toFixed(2).toString());
		next();

	}).catch(next);
});

router.get("/price/:currency", function(req, res, next) {
	var result = 0;
	var amount = 1.0;
	var currency = req.params.currency.toLowerCase();

	if (global.exchangeRates != null && global.exchangeRates[currency] != null) {
		var formatData = utils.formatExchangedCurrency(amount, currency);
		result = formatData.val;
	} else if (currency == "xau" && global.exchangeRates != null && global.goldExchangeRates != null) {
		var dec = new Decimal(amount);
		dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
		var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(2);
		result = utils.addThousandsSeparators(exchangedAmt);
	}
	
	res.send(result.toString());

	next();
});

router.get("/price", function(req, res, next) {
	var amount = 1.0;
	var result = {};

	["usd", "eur", "gbp", "xau"].forEach(currency => {
		if (global.exchangeRates != null && global.exchangeRates[currency] != null) {
			var formatData = utils.formatExchangedCurrency(amount, currency);
			result[currency] = formatData.val;

		} else if (currency == "xau" && global.exchangeRates != null && global.goldExchangeRates != null) {
			var dec = new Decimal(amount);
			dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
			var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(2);
			result[currency] = utils.addThousandsSeparators(exchangedAmt);
		}
	});
	
	
	res.json(result);

	next();
});


module.exports = router;
