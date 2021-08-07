"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const express = require('express');
const csurf = require('csurf');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const qrcode = require('qrcode');
const bitcoinjs = require('groestlcoinjs-lib');
const sha256 = require("crypto-js/sha256");
const hexEnc = require("crypto-js/enc-hex");
const Decimal = require("decimal.js");
const asyncHandler = require("express-async-handler");
const markdown = require("markdown-it")();

const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");
const rpcApi = require("./../app/api/rpcApi.js");
const apiDocs = require("./../docs/api.js");
const btcQuotes = require("./../app/coins/btcQuotes.js");

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

router.get("/changelog", function(req, res, next) {
	res.locals.changelogHtml = markdown.render(global.apiChangelogMarkdown);

	res.render("api-changelog");

	next();
});

router.get("/version", function(req, res, next) {
	res.send(apiDocs.version);

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

router.get("/mining/hashrate", asyncHandler(async (req, res, next) => {
	try {
		var decimals = 3;

		if (req.query.decimals) {
			decimals = parseInt(req.query.decimals);
		}

		var blocksPerDay = 24 * 60 * 60 / coinConfig.targetBlockTimeSeconds;
		var rates = [];

		var timePeriods = [
			1 * blocksPerDay,
			7 * blocksPerDay,
			30 * blocksPerDay,
			90 * blocksPerDay,
			365 * blocksPerDay,
		];

		var promises = [];

		for (var i = 0; i < timePeriods.length; i++) {
			const index = i;
			const x = timePeriods[i];

			promises.push(new Promise(async (resolve, reject) => {
				try {
					const hashrate = await coreApi.getNetworkHashrate(x);
					var summary = utils.formatLargeNumber(hashrate, decimals);

					rates[index] = {
						val: parseFloat(summary[0]),

						unit: `${summary[1].name}hash`,
						unitAbbreviation: `${summary[1].abbreviation}H`,
						unitExponent: summary[1].exponent,
						unitMultiplier: summary[1].val,

						raw: summary[0] * summary[1].val,

						string1: `${summary[0]}x10^${summary[1].exponent}`,
						string2: `${summary[0]}e${summary[1].exponent}`,
						string3: `${(summary[0] * summary[1].val).toLocaleString()}`
					};

					resolve();

				} catch (ex) {
					utils.logError("8ehfwe8ehe", ex);

					resolve();
				}
			}));
		}

		await Promise.all(promises);

		res.json({
			"1Day": rates[0],
			"7Day": rates[1],
			"30Day": rates[2],
			"90day": rates[3],
			"365Day": rates[4]
		});

	} catch (e) {
		utils.logError("23reuhd8uw92D", e);

		res.json({
			error: typeof(e) == "string" ? e : utils.stringifySimple(e)
		});
	}
}));

router.get("/mining/diff-adj-estimate", asyncHandler(async (req, res, next) => {
	var promises = [];
	const getblockchaininfo = await utils.timePromise("api_diffAdjEst_getBlockchainInfo", coreApi.getBlockchainInfo());
	var currentBlock;
	var difficultyPeriod = parseInt(Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount));
	var difficultyPeriodFirstBlockHeader;

	promises.push(utils.safePromise("api_diffAdjEst_getBlockHeaderByHeight", async () => {
		currentBlock = await coreApi.getBlockHeaderByHeight(getblockchaininfo.blocks);
	}));

	promises.push(utils.safePromise("api_diffAdjEst_getBlockHeaderByHeight2", async () => {
		let h = coinConfig.difficultyAdjustmentBlockCount * difficultyPeriod;
		difficultyPeriodFirstBlockHeader = await coreApi.getBlockHeaderByHeight(h);
	}));

	await Promise.all(promises);

	var firstBlockHeader = difficultyPeriodFirstBlockHeader;
	var heightDiff = currentBlock.height - firstBlockHeader.height;
	var blockCount = heightDiff + 1;
	var timeDiff = currentBlock.mediantime - firstBlockHeader.mediantime;
	var timePerBlock = timeDiff / heightDiff;
	var dt = new Date().getTime() / 1000 - firstBlockHeader.time;
	var predictedBlockCount = dt / coinConfig.targetBlockTimeSeconds;
	var timePerBlock2 = dt / heightDiff;

	if (predictedBlockCount > blockCount) {
		var diffAdjPercent = new Decimal(100).minus(new Decimal(blockCount / predictedBlockCount).times(100)).times(-1);
		//diffAdjPercent = diffAdjPercent * -1;

	} else {
		var diffAdjPercent = new Decimal(100).minus(new Decimal(predictedBlockCount / blockCount).times(100));
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





/// UTIL

router.get("/util/xyzpub/:extendedPubkey", asyncHandler(async (req, res, next) => {
	try {
		const extendedPubkey = req.params.extendedPubkey;
		res.locals.extendedPubkey = extendedPubkey;


		let limit = 20;
		if (req.query.limit) {
			limit = parseInt(req.query.limit);
		}

		let offset = 0;
		if (req.query.offset) {
			offset = parseInt(req.query.offset);
		}


		let receiveAddresses = [];
		let changeAddresses = [];
		let relatedKeys = [];

		let outputType = "Unknown";
		let outputTypeDesc = null;
		let bip32Path = "Unknown";

		// if xpub/ypub/zpub convert to address under path m/0/0
		if (extendedPubkey.match(/^(xpub|tpub).*$/)) {
			outputType = "P2PKH";
			outputTypeDesc = "Pay to Public Key Hash";
			bip32Path = "m/44'/17'";

			const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
			const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";
			const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

			let xpub = extendedPubkey;
			if (!extendedPubkey.startsWith(xpub_tpub)) {
				xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
			}

			receiveAddresses = utils.bip32Addresses(extendedPubkey, "p2pkh", 0, limit, offset);
			changeAddresses = utils.bip32Addresses(extendedPubkey, "p2pkh", 1, limit, offset);

			if (!extendedPubkey.startsWith(xpub_tpub)) {
				relatedKeys.push({
					keyType: xpub_tpub,
					key: utils.xpubChangeVersionBytes(xpub, xpub_tpub),
					outputType: "P2PKH",
					firstAddress: utils.bip32Addresses(xpub, "p2pkh", 0, 1, 0)[0]
				});
			}

			relatedKeys.push({
				keyType: ypub_upub,
				key: utils.xpubChangeVersionBytes(xpub, ypub_upub),
				outputType: "P2WPKH in P2SH",
				firstAddress: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 1, 0)[0]
			});

			relatedKeys.push({
				keyType: zpub_vpub,
				key: utils.xpubChangeVersionBytes(xpub, zpub_vpub),
				outputType: "P2WPKH",
				firstAddress: utils.bip32Addresses(xpub, "p2wpkh", 0, 1, 0)[0]
			});

		} else if (extendedPubkey.match(/^(ypub|upub).*$/)) {
			outputType = "P2WPKH in P2SH";
			outputTypeDesc = "Pay to Witness Public Key Hash (P2WPKH) wrapped inside Pay to Script Hash (P2SH), aka Wrapped Segwit";
			bip32Path = "m/49'/17'";

			const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
			const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

			const xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

			receiveAddresses = utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, limit, offset);
			changeAddresses = utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 1, limit, offset);

			relatedKeys.push({
				keyType: xpub_tpub,
				key: xpub,
				outputType: "P2PKH",
				firstAddress: utils.bip32Addresses(xpub, "p2pkh", 0, 1, 0)[0]
			});

			relatedKeys.push({
				keyType: zpub_vpub,
				key: utils.xpubChangeVersionBytes(xpub, zpub_vpub),
				outputType: "P2WPKH",
				firstAddress: utils.bip32Addresses(xpub, "p2wpkh", 0, 1, 0)[0]
			});

		} else if (extendedPubkey.match(/^(zpub|vpub).*$/)) {
			outputType = "P2WPKH";
			outputTypeDesc = "Pay to Witness Public Key Hash, aka Native Segwit";
			bip32Path = "m/84'/17'";

			const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
			const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";

			const xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

			receiveAddresses = utils.bip32Addresses(xpub, "p2wpkh", 0, limit, offset);
			changeAddresses = utils.bip32Addresses(xpub, "p2wpkh", 1, limit, offset);

			relatedKeys.push({
				keyType: xpub_tpub,
				key: xpub,
				outputType: "P2PKH",
				firstAddress: utils.bip32Addresses(xpub, "p2pkh", 0, 1, 0)[0]
			});

			relatedKeys.push({
				keyType: ypub_upub,
				key: utils.xpubChangeVersionBytes(xpub, ypub_upub),
				outputType: "P2WPKH in P2SH",
				firstAddress: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 1, 0)[0]
			});

		} else if (extendedPubkey.startsWith("Ypub")) {
			outputType = "Multi-Sig P2WSH in P2SH";
			bip32Path = "-";

		} else if (extendedPubkey.startsWith("Zpub")) {
			outputType = "Multi-Sig P2WSH";
			bip32Path = "-";
		}


		res.json({
			keyType: extendedPubkey.substring(0, 4),
			outputType: outputType,
			outputTypeDesc: outputTypeDesc,
			bip32Path: bip32Path,
			relatedKeys: relatedKeys,
			receiveAddresses: receiveAddresses,
			changeAddresses: changeAddresses
		});

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("0923tygdusde", err));

		next();
	}
}));





/// PRICE

router.get("/price/:currency/sats", function(req, res, next) {
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
		var satCurrencyType = global.currencyTypes["gro"];
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




/// FUN

router.get("/quotes/random", function(req, res, next) {
	var index = utils.randomInt(0, btcQuotes.items.length);

	res.json(btcQuotes.items[index]);

	next();
});

router.get("/quotes/:quoteIndex", function(req, res, next) {
	var index = parseInt(req.params.quoteIndex);

	res.json(btcQuotes.items[index]);

	next();
});

router.get("/quotes/all", function(req, res, next) {
	res.json(btcQuotes.items);

	next();
});


module.exports = router;
