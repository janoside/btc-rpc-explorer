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

const forceCsrf = csurf({ ignoreMethods: [] });





router.get("/blocks-by-height/:blockHeights", function(req, res, next) {
	var blockHeightStrs = req.params.blockHeights.split(",");
	
	var blockHeights = [];
	for (var i = 0; i < blockHeightStrs.length; i++) {
		blockHeights.push(parseInt(blockHeightStrs[i]));
	}

	coreApi.getBlocksByHeight(blockHeights).then(function(result) {
		res.json(result);
	}).catch(next);
});

router.get("/block-headers-by-height/:blockHeights", function(req, res, next) {
	var blockHeightStrs = req.params.blockHeights.split(",");
	
	var blockHeights = [];
	for (var i = 0; i < blockHeightStrs.length; i++) {
		blockHeights.push(parseInt(blockHeightStrs[i]));
	}

	coreApi.getBlockHeadersByHeight(blockHeights).then(function(result) {
		res.json(result);

		next();
	});
});

router.get("/block-stats-by-height/:blockHeights", function(req, res, next) {
	var blockHeightStrs = req.params.blockHeights.split(",");
	
	var blockHeights = [];
	for (var i = 0; i < blockHeightStrs.length; i++) {
		blockHeights.push(parseInt(blockHeightStrs[i]));
	}

	coreApi.getBlocksStatsByHeight(blockHeights).then(function(result) {
		res.json(result);

		next();
	});
});

router.get("/mempool-txs/:txids", function(req, res, next) {
	var txids = req.params.txids.split(",").map(utils.asHash);

	var promises = [];

	for (var i = 0; i < txids.length; i++) {
		promises.push(coreApi.getMempoolTxDetails(txids[i], false));
	}

	Promise.all(promises).then(function(results) {
		res.json(results);

		next();

	}).catch(function(err) {
		res.json({success:false, error:err});

		next();
	});
});



const mempoolSummaryStatuses = {};
const mempoolSummaries = {};

router.get("/mempool-summary-status", asyncHandler(async (req, res, next) => {
	const statusId = req.query.statusId;
	if (statusId && mempoolSummaryStatuses[statusId]) {
		res.json(mempoolSummaryStatuses[statusId]);

		next();

	} else {
		res.json({});

		next();
	}
}));

router.get("/get-mempool-summary", asyncHandler(async (req, res, next) => {
	const statusId = req.query.statusId;

	if (statusId && mempoolSummaries[statusId]) {
		var summary = mempoolSummaries[statusId];
		
		res.json(summary);

		next();

		delete mempoolSummaries[statusId];
		delete mempoolSummaryStatuses[statusId];

	} else {
		res.json({});

		next();
	}
}));

router.get("/build-mempool-summary", asyncHandler(async (req, res, next) => {
	try {
		// long timeout
		res.connection.setTimeout(600000);


		const statusId = req.query.statusId;
		if (statusId) {
			mempoolSummaryStatuses[statusId] = {};
		}

		res.json({success:true, status:"started"});

		next();


		const ageBuckets = req.query.ageBuckets ? parseInt(req.query.ageBuckets) : 100;
		const sizeBuckets = req.query.sizeBuckets ? parseInt(req.query.sizeBuckets) : 100;


		var summary = await coreApi.buildMempoolSummary(statusId, ageBuckets, sizeBuckets, (update) => {
			mempoolSummaryStatuses[statusId] = update;
		});

		// store summary until it's retrieved via /api/get-mempool-summary
		mempoolSummaries[statusId] = summary;

	} catch (err) {
		utils.logError("329r7whegee", err);
	}
}));




const miningSummaryStatuses = {};
const miningSummaries = {};

router.get("/mining-summary-status", asyncHandler(async (req, res, next) => {
	const statusId = req.query.statusId;
	if (statusId && miningSummaryStatuses[statusId]) {
		res.json(miningSummaryStatuses[statusId]);

		next();

	} else {
		res.json({});

		next();
	}
}));

router.get("/get-mining-summary", asyncHandler(async (req, res, next) => {
	const statusId = req.query.statusId;

	if (statusId && miningSummaries[statusId]) {
		var summary = miningSummaries[statusId];
		
		res.json(summary);

		next();

		delete miningSummaries[statusId];
		delete miningSummaryStatuses[statusId];

	} else {
		res.json({});

		next();
	}
}));

router.get("/build-mining-summary/:startBlock/:endBlock", asyncHandler(async (req, res, next) => {
	try {
		// long timeout
		res.connection.setTimeout(600000);


		var startBlock = parseInt(req.params.startBlock);
		var endBlock = parseInt(req.params.endBlock);


		const statusId = req.query.statusId;
		if (statusId) {
			miningSummaryStatuses[statusId] = {};
		}

		res.json({success:true, status:"started"});

		next();
		


		var summary = await coreApi.buildMiningSummary(statusId, startBlock, endBlock, (update) => {
			miningSummaryStatuses[statusId] = update;
		});

		// store summary until it's retrieved via /api/get-mining-summary
		miningSummaries[statusId] = summary;

	} catch (err) {
		utils.logError("4328943ryh44", err);
	}
}));






router.get("/mempool-tx-summaries/:txids", asyncHandler(async (req, res, next) => {
	try {
		const txids = req.params.txids.split(",").map(utils.asHash);

		const promises = [];
		const results = [];

		for (var i = 0; i < txids.length; i++) {
			const txid = txids[i];
			const key = txid.substring(0, 6);

			promises.push(new Promise(async (resolve, reject) => {
				try {
					const item = await coreApi.getMempoolTxDetails(txid, false);
					const itemSummary = {
						f: item.entry.fees.modified,
						sz: item.entry.vsize ? item.entry.vsize : item.entry.size,
						af: item.entry.fees.ancestor,
						df: item.entry.fees.descendant,
						dsz: item.entry.descendantsize,
						t: item.entry.time,
						w: item.entry.weight ? item.entry.weight : item.entry.size * 4
					};

					results.push(itemSummary);
					
					resolve();

				} catch (e) {
					utils.logError("38yereghee", e);

					// resolve anyway
					resolve();
				}
			}));
		}

		await Promise.all(promises);

		res.json(results);

		next();

	} catch (err) {
		res.json({success:false, error:err});

		next();
	}
}));

router.get("/raw-tx-with-inputs/:txid", function(req, res, next) {
	var txid = utils.asHash(req.params.txid);

	var promises = [];

	promises.push(coreApi.getRawTransactionsWithInputs([txid]));

	Promise.all(promises).then(function(results) {
		res.json(results);

		next();

	}).catch(function(err) {
		res.json({success:false, error:err});

		next();
	});
});

router.get("/block-tx-summaries/:blockHash/:blockHeight/:txids", function(req, res, next) {
	var blockHash = req.params.blockHash;
	var blockHeight = parseInt(req.params.blockHeight);
	var txids = req.params.txids.split(",").map(utils.asHash);

	var promises = [];

	var results = [];

	promises.push(new Promise(function(resolve, reject) {
		coreApi.buildBlockAnalysisData(blockHeight, blockHash, txids, 0, results, resolve);
	}));

	Promise.all(promises).then(function() {
		res.json(results);

		next();

	}).catch(function(err) {
		res.json({success:false, error:err});

		next();
	});
});

router.get("/utils/:func/:params", function(req, res, next) {
	var func = req.params.func;
	var params = req.params.params;

	var data = null;

	if (func == "formatLargeNumber") {
		if (params.indexOf(",") > -1) {
			var parts = params.split(",");

			data = utils.formatLargeNumber(parseInt(parts[0]), parseInt(parts[1]));

		} else {
			data = utils.formatLargeNumber(parseInt(params));
		}
	} else if (func == "formatCurrencyAmountInSmallestUnits") {
		var parts = params.split(",");

		data = utils.formatCurrencyAmountInSmallestUnits(new Decimal(parts[0]), parseInt(parts[1]));

	} else {
		data = {success:false, error:`Unknown function: ${func}`};
	}

	res.json(data);

	next();
});



router.get("/v1/blocks/tip/height", function(req, res, next) {
	rpcApi.getBlockCount().then(function(blockcount){
		res.send(blockcount.toString());
	}).catch(next);
});

router.get("/v1/blocks/tip/hash", function(req, res, next) {
	coreApi.getBlockchainInfo().then(function(getblockchaininfo){
		res.send(getblockchaininfo.bestblockhash.toString());
	}).catch(next);
});

router.get("/v1/blocks/totalbtc", function(req, res, next) {	
	if (global.utxoSetSummary) {
		var supply = parseFloat(global.utxoSetSummary.total_amount).toString();
		res.send(supply.toString());
		next();
	}
	else {
		// estimated supply
		coreApi.getBlockchainInfo().then(function(getblockchaininfo){
			var estimatedSupply = utils.estimatedSupply(getblockchaininfo.blocks);
			res.send(estimatedSupply.toString());
		}).catch(next);
	}
});

router.get("/v1/blocks/hashrate", function(req, res, next) {
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
		
				res.json({"1Day": rates[0]*1, "7Days": rates[1]*1, "30Days": rates[2]*1});
			});
		});
	}).catch(next);
});

router.get("/v1/blocks/speed", asyncHandler(async (req, res, next) => {
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
		
	if (timePerBlock > 600) {
			var diffAdjPercent = new Decimal(timeDiff / heightDiff / 600).times(100).minus(100);
			diffAdjPercent = diffAdjPercent * -1;

	} else {
			var diffAdjPercent = new Decimal(100).minus(new Decimal(timeDiff / heightDiff / 600).times(100));
	}	
	
	res.send(diffAdjPercent.toFixed(2).toString());
}));

router.get("/v1/mempool/count", function(req, res, next) {
	coreApi.getMempoolInfo().then(function(info){
		res.send(info.size.toString());
	}).catch(next);
});

router.get("/v1/mempool/fees/recommended", function(req, res, next) {
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
							"fastestFee":smartFeeEstimates[1],
							"halfHourFee":smartFeeEstimates[3],
							"hourFee":smartFeeEstimates[6],
							"minimumFee":smartFeeEstimates[144]
							};
		res.json(results);
	}).catch(next);
});

router.get("/v1/price/:currency/moscowtime", function(req, res, next) {
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

router.get("/v1/price/:currency/marketcap", function(req, res, next) {
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

router.get("/v1/price/:currency", function(req, res, next) {
	var result = 0;
	var amount = 1.0;
	var currency = req.params.currency.toLowerCase();
	if (global.exchangeRates != null && global.exchangeRates[currency] != null) {
		var formatData = utils.formatExchangedCurrency(amount, currency);
		result = formatData.val;
	}
	else if (currency == "xau" && global.exchangeRates != null && global.goldExchangeRates != null) {
		var dec = new Decimal(amount);
		dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
		var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(2);
		result = utils.addThousandsSeparators(exchangedAmt);
	}
	
	res.send(result.toString());
	next();
});


module.exports = router;
