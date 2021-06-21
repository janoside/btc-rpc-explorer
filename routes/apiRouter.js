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



module.exports = router;
