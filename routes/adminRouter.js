var debug = require("debug");
var debugLog = debug("btcexp:router");

const fs = require('fs');
const v8 = require('v8');

var express = require('express');
var csurf = require('csurf');
var router = express.Router();
var util = require('util');
var moment = require('moment');
var bitcoinCore = require("bitcoin-core");
var qrcode = require('qrcode');
var bitcoinjs = require('bitcoinjs-lib');
var sha256 = require("crypto-js/sha256");
var hexEnc = require("crypto-js/enc-hex");
var Decimal = require("decimal.js");

var utils = require('./../app/utils.js');
var coins = require("./../app/coins.js");
var config = require("./../app/config.js");
var coreApi = require("./../app/api/coreApi.js");
var addressApi = require("./../app/api/addressApi.js");

const forceCsrf = csurf({ ignoreMethods: [] });




router.get("/dashboard", function(req, res, next) {
	res.locals.appStartTime = global.appStartTime;
	res.locals.memstats = v8.getHeapStatistics();
	res.locals.rpcStats = global.rpcStats;
	res.locals.electrumStats = global.electrumStats;
	res.locals.cacheStats = global.cacheStats;
	res.locals.errorStats = global.errorStats;

	res.locals.appConfig = {
		privacyMode: config.privacyMode,
		slowDeviceMode: config.slowDeviceMode,
		demoSite: config.demoSite,
		rpcConcurrency: config.rpcConcurrency,
		addressApi: config.addressApi,
		ipStackComApiAccessKey: !!config.credentials.ipStackComApiAccessKey,
		redisCache: !!config.redisUrl,
		noInmemoryRpcCache: config.noInmemoryRpcCache
	};

	res.render("admin/dashboard");

	next();
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
