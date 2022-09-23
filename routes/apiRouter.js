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
const { bech32, bech32m } = require("bech32");
const Decimal = require("decimal.js");
const asyncHandler = require("express-async-handler");
const markdown = require("markdown-it")();

const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");
const xyzpubApi = require("./../app/api/xyzpubApi.js");
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
	let txid = utils.asHash(req.params.txid);

	let promises = [];

	let txInputLimit = (res.locals.crawlerBot) ? 3 : -1;

	promises.push(coreApi.getRawTransactionsWithInputs([txid], txInputLimit));

	Promise.all(promises).then(function(results) {
		let outJson = results[0].transactions[0];
		let txInputs = results[0].txInputsByTransaction[txid] || {};
		
		let inputBtc = 0;
		if (txInputs[0]) {
			for (let key in txInputs) {
				let item = txInputs[key];

				inputBtc += item["value"] * global.coinConfig.baseCurrencyUnit.multiplier;

				outJson.vin[key].scriptSig.address = item.scriptPubKey.address;
				outJson.vin[key].scriptSig.type = item.scriptPubKey.type;
				outJson.vin[key].value = item.value;
			}
		}
		
		let outputBtc = 0;
		for (let key in outJson.vout) {	
			let item = outJson.vout[key];
			
			outputBtc += item.value * global.coinConfig.baseCurrencyUnit.multiplier;
		}

		outJson.fee = {
			"amount": (inputBtc - outputBtc) / global.coinConfig.baseCurrencyUnit.multiplier,
			"unit": "BTC"
		};

		if (global.specialTransactions && global.specialTransactions[txid]) {
			let funInfo = global.specialTransactions[txid];

			outJson.fun = funInfo;
		}
		
		res.json(outJson);

		next();

	}).catch(function(err) {
		utils.logError("10328fwgdaqw", err);

		res.json({success:false, error:err});

		next();
	});
});

router.get("/tx/volume/24h", function(req, res, next) {
	try {
		if (networkVolume && networkVolume.d1 && networkVolume.d1.amt) {
			let currencyValue = parseInt(networkVolume.d1.amt);

			res.json({"24h": currencyValue});

		} else {
			res.json({success:false, error: "Volume data not yet loaded."});
		}

		next();

	} catch (err) {
		utils.logError("39024y484", err);

		res.json({success:false, error:err});
		
		next();
	}
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

router.get("/blockchain/utxo-set", asyncHandler(async (req, res, next) => {
	const utxoSetSummary = await coreApi.getUtxoSetSummary(true, true);
	
	res.json(utxoSetSummary);

	next();
}));







/// ADDRESSES

router.get("/address/:address", asyncHandler(async (req, res, next) => {
	try {
		const { perfId, perfResults } = utils.perfLogNewItem({action:"api.address"});
		res.locals.perfId = perfId;

		var limit = config.site.addressTxPageSize;
		var offset = 0;
		var sort = "desc";

		res.locals.maxTxOutputDisplayCount = config.site.addressPage.txOutputMaxDefaultDisplay;

		
		if (req.query.limit) {
			limit = parseInt(req.query.limit);
		}

		if (req.query.offset) {
			offset = parseInt(req.query.offset);
		}

		if (req.query.sort) {
			sort = req.query.sort;
		}


		const address = utils.asAddress(req.params.address);

		const transactions = [];
		const addressApiSupport = addressApi.getCurrentAddressApiFeatureSupport();
		
		const result = {};

		let addressEncoding = "unknown";

		let base58Error = null;
		let bech32Error = null;
		let bech32mError = null;

		if (address.match(/^[132mn].*$/)) {
			try {
				let base58Data = bitcoinjs.address.fromBase58Check(address);
				result.base58 = {hash:base58Data.hash.toString("hex"), version:base58Data.version};

				addressEncoding = "base58";

			} catch (err) {
				utils.logError("api.AddressParseError-001", err);
			}
		}

		if (addressEncoding == "unknown") {
			try {
				let bech32Data = bitcoinjs.address.fromBech32(address);
				result.bech32 = {data:bech32Data.data.toString("hex"), version:bech32Data.version};

				addressEncoding = "bech32";

			} catch (err) {
				utils.logError("api.AddressParseError-002", err);
			}
		}

		if (addressEncoding == "unknown") {
			try {
				let bech32mData = bech32m.decode(address);
				result.bech32m = {words:Buffer.from(bech32mData.words).toString("hex"), version:bech32mData.version};

				addressEncoding = "bech32m";

			} catch (err) {
				utils.logError("api.AddressParseError-003", err);
			}
		}

		if (addressEncoding == "unknown") {
			res.json({success:false, error:"Invalid address"});

			next();

			return;
		}

		result.encoding = addressEncoding;

		result.notes = [];
		if (global.specialAddresses[address] && global.specialAddresses[address].type == "fun") {
			let funInfo = global.specialAddresses[address].addressInfo;

			notes.push(funInfo);
		}

		if (global.miningPoolsConfigs) {
			for (var i = 0; i < global.miningPoolsConfigs.length; i++) {
				if (global.miningPoolsConfigs[i].payout_addresses[address]) {
					let note = global.miningPoolsConfigs[i].payout_addresses[address];
					note.type = "payout address for miner";

					result.notes.push(note);

					break;
				}
			}
		}

		if (result.notes.length == 0) {
			delete result.notes;
		}



		const validateaddressResult = await coreApi.getAddress(address);
		result.validateaddress = validateaddressResult;

		const promises = [];

		var addrScripthash = hexEnc.stringify(sha256(hexEnc.parse(validateaddressResult.scriptPubKey)));
		addrScripthash = addrScripthash.match(/.{2}/g).reverse().join("");

		result.electrumScripthash = addrScripthash;

		promises.push(utils.timePromise("address.getAddressDetails", async () => {
			const addressDetailsResult = await addressApi.getAddressDetails(address, validateaddressResult.scriptPubKey, sort, limit, offset);

			var addressDetails = addressDetailsResult.addressDetails;

			result.txHistory = addressDetails;
			result.txHistory.request = {};
			result.txHistory.request.limit = limit;
			result.txHistory.request.offset = offset;
			result.txHistory.request.sort = sort;

			if (addressDetailsResult.errors && addressDetailsResult.errors.length > 0) {
				result.txHistory.errors = addressDetailsResult.errors;
			}
		}, perfResults));

		await utils.awaitPromises(promises);
		
		res.json(result);

		next();

	} catch (e) {
		res.json({success:false});

		next();
	}
}));





/// XYZ PUBS

// redirect for an old path
router.get("/util/xyzpub/:extendedPubkey", asyncHandler(async (req, res, next) => {
	const extendedPubkey = req.params.extendedPubkey;
	
	res.redirect(`${req.baseUrl}/xyzpub/${extendedPubkey}`);
}));

router.get("/xyzpub/:extendedPubkey", asyncHandler(async (req, res, next) => {
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

		
		let relatedKeys = [];

		let outputType = "Unknown";
		let outputTypeDesc = null;
		let bip32Path = "Unknown";


		const keyDetails = xyzpubApi.getKeyDetails(extendedPubkey);
		keyDetails.receiveAddresses = xyzpubApi.getXpubAddresses(extendedPubkey, 0, limit, offset);
		keyDetails.changeAddresses = xyzpubApi.getXpubAddresses(extendedPubkey, 1, limit, offset);


		res.json(keyDetails);

		next();

	} catch (err) {
		res.locals.pageErrors.push(utils.logError("0923tygdusde", err));

		next();
	}
}));

router.get("/xyzpub/txids/:extendedPubkey", asyncHandler(async (req, res, next) => {
	try {
		const extendedPubkey = req.params.extendedPubkey;

		let gapLimit = 20;
		if (req.query.gapLimit) {
			gapLimit = parseInt(req.query.gapLimit);
		}

		let limit = -1;
		if (req.query.limit) {
			limit = parseInt(req.query.limit);
		}
		
		const searchResult = await xyzpubApi.searchXpubTxids(extendedPubkey, gapLimit, limit);

		let result = {
			txids: [],
			txCount: 0
		};

		searchResult.usedAddresses.forEach(addrResult => {
			addrResult.txids.forEach(txid => {
				if (!result.txids.includes(txid)) {
					result.txids.push(txid);
					result.txCount++;
				}
			});
		})
		
		if (searchResult) {
			res.json(result);

		} else {
			res.json({success:false});
		}

		next();

	} catch (e) {
		utils.logError("382rdere", e);

		res.json({success:false, error: e.toString()});

		next();
	}
}));

router.get("/xyzpub/addresses/:extendedPubkey", asyncHandler(async (req, res, next) => {
	try {
		const extendedPubkey = req.params.extendedPubkey;

		let receiveOrChange = 0;
		if (req.query.receiveOrChange) {
			receiveOrChange = parseInt(req.query.receiveOrChange);
		}

		let limit = 10;
		if (req.query.limit) {
			limit = parseInt(req.query.limit);
		}

		let offset = 0;
		if (req.query.offset) {
			offset = parseInt(req.query.offset);
		}
		
		const xyzpubResult = await xyzpubApi.getXpubAddresses(extendedPubkey, receiveOrChange, limit, offset);
		
		if (xyzpubResult){
			res.json(xyzpubResult);

		} else {
			res.json({success:false});
		}

		next();
		
	} catch (e) {
		utils.logError("3297rwegee", e);

		res.json({success:false, error: e.toString()});

		next();
	}
}));





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
	const { perfId, perfResults } = utils.perfLogNewItem({action:"api.diff-adj-estimate"});
	res.locals.perfId = perfId;

	var promises = [];
	const getblockchaininfo = await utils.timePromise("api_diffAdjEst_getBlockchainInfo", coreApi.getBlockchainInfo);
	var currentBlock;
	var difficultyPeriod = parseInt(Math.floor(getblockchaininfo.blocks / coinConfig.difficultyAdjustmentBlockCount));
	var difficultyPeriodFirstBlockHeader;
	
	promises.push(utils.timePromise("api.diff-adj-est.getBlockHeaderByHeight", async () => {
		currentBlock = await coreApi.getBlockHeaderByHeight(getblockchaininfo.blocks);
	}, perfResults));
	
	promises.push(utils.timePromise("api.diff-adj-est.getBlockHeaderByHeight2", async () => {
		let h = coinConfig.difficultyAdjustmentBlockCount * difficultyPeriod;
		difficultyPeriodFirstBlockHeader = await coreApi.getBlockHeaderByHeight(h);
	}, perfResults));

	await utils.awaitPromises(promises);
	
	var firstBlockHeader = difficultyPeriodFirstBlockHeader;
	var heightDiff = currentBlock.height - firstBlockHeader.height;
	var blockCount = heightDiff + 1;
	var timeDiff = currentBlock.mediantime - firstBlockHeader.mediantime;
	var timePerBlock = timeDiff / heightDiff;
	var dt = new Date().getTime() / 1000 - firstBlockHeader.time;
	var predictedBlockCount = dt / coinConfig.targetBlockTimeSeconds;
	var timePerBlock2 = dt / heightDiff;

	var blockRatioPercent = new Decimal(blockCount / predictedBlockCount).times(100);
	if (blockRatioPercent > 400) {
		blockRatioPercent = new Decimal(400);
	}
	if (blockRatioPercent < 25) {
		blockRatioPercent = new Decimal(25);
	}
		
	if (predictedBlockCount > blockCount) {
		var diffAdjPercent = new Decimal(100).minus(blockRatioPercent).times(-1);
		//diffAdjPercent = diffAdjPercent * -1;

	} else {
		var diffAdjPercent = blockRatioPercent.minus(new Decimal(100));
	}
	
	res.send(diffAdjPercent.toFixed(2).toString());
}));

router.get("/mining/next-block", asyncHandler(async (req, res, next) => {
	const promises = [];

	const result = {};

	promises.push(utils.timePromise("api/next-block/getblocktemplate", async () => {
		let nextBlockEstimate = await utils.timePromise("api/next-block/getNextBlockEstimate", async () => {
			return await coreApi.getNextBlockEstimate();
		});


		//result.blockTemplate = nextBlockEstimate.blockTemplate;
		//result.feeRateGroups = nextBlockEstimate.feeRateGroups;
		result.txCount = nextBlockEstimate.blockTemplate.transactions.length;

		result.minFeeRate = nextBlockEstimate.minFeeRate;
		result.maxFeeRate = nextBlockEstimate.maxFeeRate;
		result.minFeeTxid = nextBlockEstimate.minFeeTxid;
		result.maxFeeTxid = nextBlockEstimate.maxFeeTxid;

		result.totalFees = nextBlockEstimate.totalFees.toNumber();
	}));

	await utils.awaitPromises(promises);

	res.json(result);
}));

router.get("/mining/next-block/txids", asyncHandler(async (req, res, next) => {
	const promises = [];

	const txids = [];

	promises.push(utils.timePromise("api/next-block/getblocktemplate", async () => {
		let nextBlockEstimate = await utils.timePromise("api/next-block/getNextBlockEstimate", async () => {
			return await coreApi.getNextBlockEstimate();
		});

		nextBlockEstimate.blockTemplate.transactions.forEach(x => {
			txids.push(x.txid);
		});
	}));

	await utils.awaitPromises(promises);

	res.json(txids);
}));

router.get("/mining/next-block/includes/:txid", asyncHandler(async (req, res, next) => {
	const txid = req.params.txid;

	const promises = [];

	let txidIndex = -1;
	let txCount = -1;

	promises.push(utils.timePromise("api/next-block/getblocktemplate", async () => {
		let nextBlockEstimate = await utils.timePromise("api/next-block/getNextBlockEstimate", async () => {
			return await coreApi.getNextBlockEstimate();
		});

		txCount = nextBlockEstimate.blockTemplate.transactions.length;

		for (let i = 0; i < nextBlockEstimate.blockTemplate.transactions.length; i++) {
			if (nextBlockEstimate.blockTemplate.transactions[i].txid == txid) {
				txidIndex = i;

				return;
			}
		}
	}));

	await utils.awaitPromises(promises);

	let response = {included:(txidIndex >= 0)};
	if (txidIndex >= 0) {
		response.index = txidIndex;
		response.txCount = txCount;
	}

	res.json(response);
}));

router.get("/mining/miner-summary", asyncHandler(async (req, res, next) => {
	let startHeight = -1;
	let endHeight = -1;

	if (req.query.since) {
		const regex = /^([0-9]+)d$/;
		const match = req.query.since.match(regex);

		if (match) {
			let days = parseInt(match[1]);
			let getblockchaininfo = await coreApi.getBlockchainInfo();

			startHeight = getblockchaininfo.blocks - 144 * days;
			endHeight = getblockchaininfo.blocks;
		}
	} else if (req.query.startHeight && req.query.endHeight) {
		startHeight = parseInt(req.query.startHeight);
		endHeight = parseInt(req.query.endHeight);
	}

	if (startHeight == -1 || endHeight == -1) {
		res.json({success:false, error:"Unknown start or end height - use either 'since' (e.g. 'since=7d') or 'startHeight'+'endHeight' parameters to specify the blocks to analyze."});

		return;
	}

	const summary = await coreApi.buildMiningSummary(null, startHeight, endHeight, null);

	res.json(summary);
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




/// FUN

router.get("/quotes/random", function(req, res, next) {
	var index = utils.randomInt(0, btcQuotes.items.length);

	let quote = null;
	let done = false;

	while (!done) {
		let quoteIndex = utils.randomInt(0, btcQuotes.items.length);
		quote = btcQuotes.items[quoteIndex];

		done = !utils.objHasProperty(quote, "duplicateIndex");
	}
	
	res.json(quote);

	next();
});

router.get("/quotes/all", function(req, res, next) {
	res.json(btcQuotes.items);

	next();
});

router.get("/quotes/:quoteIndex", function(req, res, next) {
	if (!req.params.quoteIndex.match(/\d+/)) {
		return;
	}

	let index = parseInt(req.params.quoteIndex);
	
	res.json(btcQuotes.items[index]);

	next();
});

router.get("/holidays/all", function(req, res, next) {
	res.json(global.btcHolidays.sortedItems);

	next();
});

router.get("/holidays/today", function(req, res, next) {
	let momentObj = moment.utc(new Date());
	if (req.query.tzOffset) {
		momentObj = momentObj.add(parseInt(req.query.tzOffset), "hours")
	}

	let day = momentObj.format("MM-DD");
	if (global.btcHolidays.byDay[day]) {
		res.json({day: day, holidays: global.btcHolidays.byDay[day]});

	} else {
		res.json({day: day, holidays: []});
	}

	next();
});

router.get("/holidays/:day", function(req, res, next) {
	if (!req.params.day.match(/^(\d{4}-)?\d{2}-\d{2}$/)) {
		return;
	}

	let day = req.params.day;

	if (req.params.day.match(/^\d{4}-\d{2}-\d{2}$/)) {
		// strip off year
		day = day.substring(5);

	} else if (req.params.day.match(/^\d{2}-\d{2}$/)) {
		// already correct format
	}
	
	if (global.btcHolidays.byDay[day]) {
		res.json({day: day, holidays: global.btcHolidays.byDay[day]});

	} else {
		res.json({day: day, holidays: []});
	}

	next();
});


module.exports = router;
