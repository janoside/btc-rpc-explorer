"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const fs = require('fs');
const v8 = require('v8');

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


const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");


const statTracker = require("./../app/statTracker.js");
const appStats = require("./../app/appStats.js");

const forceCsrf = csurf({ ignoreMethods: [] });




router.get("/dashboard", function(req, res, next) {
	res.locals.appStartTime = global.appStartTime;
	res.locals.memstats = v8.getHeapStatistics();
	res.locals.rpcStats = global.rpcStats;
	res.locals.electrumStats = global.electrumStats;
	res.locals.cacheStats = global.cacheStats;
	res.locals.errorStats = global.errorStats;

	res.locals.cacheSizes = {
		misc: {
			length: global.miscLruCache.length,
			itemCount: global.miscLruCache.itemCount
		},
		block: {
			length: global.blockLruCache.length,
			itemCount: global.blockLruCache.itemCount
		},
		tx: {
			length: global.txLruCache.length,
			itemCount: global.txLruCache.itemCount
		},
		mining: {
			length: global.miningSummaryLruCache.length,
			itemCount: global.miningSummaryLruCache.itemCount
		}
	};

	res.locals.appConfig = {
		privacyMode: config.privacyMode,
		slowDeviceMode: config.slowDeviceMode,
		demoSite: config.demoSite,
		rpcConcurrency: config.rpcConcurrency,
		addressApi: config.addressApi,
		ipStackComApiAccessKey: !!config.credentials.ipStackComApiAccessKey,
		mapBoxComApiAccessKey: !!config.credentials.mapBoxComApiAccessKey,
		redisCache: !!config.redisUrl,
		noInmemoryRpcCache: config.noInmemoryRpcCache
	};

	res.render("admin/dashboard");

	next();
});

router.get("/stats", function(req, res, next) {
	res.locals.stats = statTracker.currentStats();
	res.locals.appStats = appStats.getAllAppStats();
	res.locals.appStatNames = appStats.statNames;

	res.locals.performanceStats = [];
	for (const [key, value] of Object.entries(res.locals.stats.performance)) {
		res.locals.performanceStats.push([key, value]);
	}

	res.locals.performanceStats.sort((a, b) => {
		return a[0].localeCompare(b[0]);
	});


	res.locals.eventStats = [];
	for (const [key, value] of Object.entries(res.locals.stats.event)) {
		res.locals.eventStats.push([key, value]);
	}

	res.locals.eventStats.sort((a, b) => {
		return a[0].localeCompare(b[0]);
	});


	res.locals.valueStats = [];
	for (const [key, value] of Object.entries(res.locals.stats.value)) {
		res.locals.valueStats.push([key, value]);
	}

	res.locals.valueStats.sort((a, b) => {
		return a[0].localeCompare(b[0]);
	});
	

	res.render("admin/stats");

	next();
});


router.get('/resetUserSettings', (req, res) => {
	req.session.userSettings = {};

	var userSettings = {};

	res.cookie("user-settings", JSON.stringify(userSettings));

	res.redirect(req.headers.referer);
});


router.get('/heapdump', (req, res) => {
	const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

	debugLog(`Heap dump requested by IP ${ip}...`);

	if (ip == "127.0.0.1") {
		const filename = `./heapDump-${Date.now()}.heapsnapshot`;
		const heapdumpStream = v8.getHeapSnapshot();
		const fileStream = fs.createWriteStream(filename);
		heapdumpStream.pipe(fileStream);
		
		debugLog("Heap dump at startup written to", filename);

		res.status(200).send({msg: "successfully took a heap dump"});
	}
});



module.exports = router;
