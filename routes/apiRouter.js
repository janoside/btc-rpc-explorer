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

const mempoolTxSummaryCache = {};


router.get("/mempool-summary", asyncHandler(async (req, res, next) => {
	try {
		const txids = await utils.timePromise("promises.mempool-summary.getAllMempoolTxids", coreApi.getAllMempoolTxids());

		const promises = [];
		const results = [];

		for (var i = 0; i < txids.length; i++) {
			const txid = txids[i];
			const key = txid.substring(0, 6);

			if (mempoolTxSummaryCache[key]) {
				results.push(mempoolTxSummaryCache[key]);

			} else {
				promises.push(new Promise(async (resolve, reject) => {
					try {
						const item = await coreApi.getMempoolTxDetails(txid, false);
						const itemSummary = {
							f: item.entry.fees.modified,
							sz: item.entry.vsize ? item.entry.vsize : item.entry.size,
							af: item.entry.fees.ancestor,
							df: item.entry.fees.descendant,
							t: item.entry.time
						};

						mempoolTxSummaryCache[key] = itemSummary;

						results.push(mempoolTxSummaryCache[key]);
						
						resolve();

					} catch (e) {
						// don't care
						resolve();
					}
				}));
			}
		}

		await Promise.all(promises);


		var summary = [];

		var maxFee = 0;
		var maxFeePerByte = 0;
		var maxAge = 0;
		var maxSize = 0;
		var ages = [];
		var sizes = [];

		for (var i = 0; i < results.length; i++) {
			var txMempoolInfo = results[i];

			var fee = txMempoolInfo.f;
			var size = txMempoolInfo.sz;
			var feePerByte = txMempoolInfo.f / size;
			var age = Date.now() / 1000 - txMempoolInfo.t;

			if (fee > maxFee) {
				maxFee = fee;
			}

			if (feePerByte > maxFeePerByte) {
				maxFeePerByte = feePerByte;
			}

			ages.push({age:age, txid:"abc"});
			sizes.push({size:size, txid:"abc"});

			if (age > maxAge) {
				maxAge = age;
			}

			if (size > maxSize) {
				maxSize = size;
			}
		}

		ages.sort(function(a, b) {
			if (a.age != b.age) {
				return b.age - a.age;

			} else {
				return a.txid.localeCompare(b.txid);
			}
		});

		sizes.sort(function(a, b) {
			if (a.size != b.size) {
				return b.size - a.size;

			} else {
				return a.txid.localeCompare(b.txid);
			}
		});

		maxSize = 2000;

		const satoshiPerByteBucketMaxima = coinConfig.feeSatoshiPerByteBucketMaxima;

		var bucketCount = satoshiPerByteBucketMaxima.length + 1;

		var satoshiPerByteBuckets = [];
		var satoshiPerByteBucketLabels = [];

		satoshiPerByteBucketLabels[0] = ("[0 - " + satoshiPerByteBucketMaxima[0] + ")");
		for (var i = 0; i < bucketCount; i++) {
			satoshiPerByteBuckets[i] = {"count":0, "totalFees":0, "totalBytes":0};

			if (i > 0 && i < bucketCount - 1) {
				satoshiPerByteBucketLabels[i] = ("[" + satoshiPerByteBucketMaxima[i - 1] + " - " + satoshiPerByteBucketMaxima[i] + ")");
			}
		}

		var ageBucketCount = 150;
		var ageBucketTxCounts = [];
		var ageBucketLabels = [];

		var sizeBucketCount = 150;
		var sizeBucketTxCounts = [];
		var sizeBucketLabels = [];

		for (var i = 0; i < ageBucketCount; i++) {
			var rangeMin = i * maxAge / ageBucketCount;
			var rangeMax = (i + 1) * maxAge / ageBucketCount;

			ageBucketTxCounts.push(0);

			if (maxAge > 600) {
				var rangeMinutesMin = new Decimal(rangeMin / 60).toFixed(1);
				var rangeMinutesMax = new Decimal(rangeMax / 60).toFixed(1);

				ageBucketLabels.push(rangeMinutesMin + " - " + rangeMinutesMax + " min");

			} else {
				ageBucketLabels.push(parseInt(rangeMin) + " - " + parseInt(rangeMax) + " sec");
			}
		}

		for (var i = 0; i < sizeBucketCount; i++) {
			sizeBucketTxCounts.push(0);

			if (i == sizeBucketCount - 1) {
				sizeBucketLabels.push(parseInt(i * maxSize / sizeBucketCount) + "+");

			} else {
				sizeBucketLabels.push(parseInt(i * maxSize / sizeBucketCount) + " - " + parseInt((i + 1) * maxSize / sizeBucketCount));
			}
		}

		satoshiPerByteBucketLabels[bucketCount - 1] = (satoshiPerByteBucketMaxima[satoshiPerByteBucketMaxima.length - 1] + "+");

		var summary = {
			"count":0,
			"totalFees":0,
			"totalBytes":0,
			"satoshiPerByteBuckets":satoshiPerByteBuckets,
			"satoshiPerByteBucketLabels":satoshiPerByteBucketLabels,
			"ageBucketTxCounts":ageBucketTxCounts,
			"ageBucketLabels":ageBucketLabels,
			"sizeBucketTxCounts":sizeBucketTxCounts,
			"sizeBucketLabels":sizeBucketLabels
		};

		for (var x = 0; x < results.length; x++) {
			var txMempoolInfo = results[x];
			var fee = txMempoolInfo.f;
			var size = txMempoolInfo.sz;
			var feePerByte = txMempoolInfo.f / size;
			var satoshiPerByte = feePerByte * 100000000; // TODO: magic number - replace with coinConfig.baseCurrencyUnit.multiplier
			var age = Date.now() / 1000 - txMempoolInfo.t;

			var addedToBucket = false;
			for (var i = 0; i < satoshiPerByteBucketMaxima.length; i++) {
				if (satoshiPerByteBucketMaxima[i] > satoshiPerByte) {
					satoshiPerByteBuckets[i]["count"]++;
					satoshiPerByteBuckets[i]["totalFees"] += fee;
					satoshiPerByteBuckets[i]["totalBytes"] += size;

					addedToBucket = true;

					break;
				}
			}

			if (!addedToBucket) {
				satoshiPerByteBuckets[bucketCount - 1]["count"]++;
				satoshiPerByteBuckets[bucketCount - 1]["totalFees"] += fee;
				satoshiPerByteBuckets[bucketCount - 1]["totalBytes"] += size;
			}

			summary["count"]++;
			summary["totalFees"] += fee;
			summary["totalBytes"] += size;

			var ageBucketIndex = Math.min(ageBucketCount - 1, parseInt(age / (maxAge / ageBucketCount)));
			var sizeBucketIndex = Math.min(sizeBucketCount - 1, parseInt(size / (maxSize / sizeBucketCount)));

			ageBucketTxCounts[ageBucketIndex]++;
			sizeBucketTxCounts[sizeBucketIndex]++;
		}

		summary["averageFee"] = summary["totalFees"] / summary["count"];
		summary["averageFeePerByte"] = summary["totalFees"] / summary["totalBytes"];

		summary["satoshiPerByteBucketMaxima"] = satoshiPerByteBucketMaxima;
		summary["satoshiPerByteBucketCounts"] = [];
		summary["satoshiPerByteBucketTotalFees"] = [];

		for (var i = 0; i < bucketCount; i++) {
			summary["satoshiPerByteBucketCounts"].push(summary["satoshiPerByteBuckets"][i]["count"]);
			summary["satoshiPerByteBucketTotalFees"].push(summary["satoshiPerByteBuckets"][i]["totalFees"]);
		}

		res.json(summary);

		next();

	} catch (err) {
		utils.logError("329r7whegee", err);

		res.json({success:false, error:err});

		next();
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

			if (mempoolTxSummaryCache[key]) {
				results.push(mempoolTxSummaryCache[key]);

			} else {
				promises.push(new Promise(async (resolve, reject) => {
					try {
						const item = await coreApi.getMempoolTxDetails(txid, false);
						const itemSummary = {
							f: item.entry.fees.modified,
							sz: item.entry.vsize ? item.entry.vsize : item.entry.size,
							af: item.entry.fees.ancestor,
							df: item.entry.fees.descendant,
							t: item.entry.time
						};

						mempoolTxSummaryCache[key] = itemSummary;

						results.push(mempoolTxSummaryCache[key]);
						
						resolve();

					} catch (e) {
						// don't care
						resolve();
					}
				}));
			}
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



module.exports = router;
