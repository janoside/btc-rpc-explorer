#!/usr/bin/env node

'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require("express-session");
var config = require("./app/config.js");
var simpleGit = require('simple-git');
var utils = require("./app/utils.js");
var moment = require("moment");
var Decimal = require('decimal.js');
var bitcoinCore = require("bitcoin-core");
var pug = require("pug");
var momentDurationFormat = require("moment-duration-format");
var coreApi = require("./app/api/coreApi.js");
var coins = require("./app/coins.js");
var request = require("request");
var qrcode = require("qrcode");
var fs = require('fs');
var electrumApi = require("./app/api/electrumApi.js");

var crawlerBotUserAgentStrings = [ "Googlebot", "Bingbot", "Slurp", "DuckDuckBot", "Baiduspider", "YandexBot", "Sogou", "Exabot", "facebot", "ia_archiver" ];


var baseActionsRouter = require('./routes/baseActionsRouter');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

// ref: https://blog.stigok.com/post/disable-pug-debug-output-with-expressjs-web-app
app.engine('pug', (path, options, fn) => {
	options.debug = false;
	return pug.__express.call(null, path, options, fn);
});

app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
	secret: config.cookiePassword,
	resave: false,
	saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

process.on("unhandledRejection", (reason, p) => {
	console.log("Unhandled Rejection at: Promise", p, "reason:", reason, "stack:", reason.stack);
});



app.runOnStartup = function() {
	global.config = config;
	global.coinConfig = coins[config.coin];
	global.coinConfigs = coins;

	console.log("Running RPC Explorer for " + global.coinConfig.name);

	var rpcCredentials = null;
	if (config.credentials.rpc) {
		rpcCredentials = config.credentials.rpc;

	} else if (process.env.RPC_HOST) {
		rpcCredentials = {
			host: process.env.RPC_HOST,
			port: process.env.RPC_PORT,
			username: process.env.RPC_USERNAME,
			password: process.env.RPC_PASSWORD
		};
	}

	if (rpcCredentials) {
		console.log("Connecting via RPC to node at " + config.credentials.rpc.host + ":" + config.credentials.rpc.port);

		global.client = new bitcoinCore({
			host: rpcCredentials.host,
			port: rpcCredentials.port,
			username: rpcCredentials.username,
			password: rpcCredentials.password,
			timeout: 5000
		});
	}

	if (config.donationAddresses) {
		var getDonationAddressQrCode = function(coinId) {
			qrcode.toDataURL(config.donationAddresses[coinId].address, function(err, url) {
				global.donationAddressQrCodeUrls[coinId] = url;
			});
		};

		global.donationAddressQrCodeUrls = {};

		config.donationAddresses.coins.forEach(function(item) {
			getDonationAddressQrCode(item);
		});
	}

	global.specialTransactions = {};
	global.specialBlocks = {};
	global.specialAddresses = {};

	if (global.coinConfig.historicalData) {
		global.coinConfig.historicalData.forEach(function(item) {
			if (item.type == "blockheight") {
				global.specialBlocks[item.blockHash] = item;

			} else if (item.type == "tx") {
				global.specialTransactions[item.txid] = item;
			}
		});
	}

	if (config.electrumXServers && config.electrumXServers.length > 0) {
		electrumApi.connectToServers();

		global.electrumApi = electrumApi;
	}

	if (global.coinConfig.miningPoolsConfigUrls) {
		var promises = [];

		for (var i = 0; i < global.coinConfig.miningPoolsConfigUrls.length; i++) {
			promises.push(new Promise(function(resolve, reject) {
				request(global.coinConfig.miningPoolsConfigUrls[i], function(error, response, body) {
					if (!error && response && response.statusCode && response.statusCode == 200) {
						var responseBody = JSON.parse(body);

						resolve(responseBody);
						
					} else {
						console.log("Error:");
						console.log(error);
						console.log("Response:");
						console.log(response);

						resolve({"coinbase_tags" : {}, "payout_addresses":{}});
					}
				});
			}));
		}

		Promise.all(promises).then(function(results) {
			global.miningPoolsConfigs = results;

			for (var i = 0; i < global.miningPoolsConfigs.length; i++) {
				for (var x in global.miningPoolsConfigs[i].payout_addresses) {
					if (global.miningPoolsConfigs[i].payout_addresses.hasOwnProperty(x)) {
						global.specialAddresses[x] = global.miningPoolsConfigs[i].payout_addresses[x];
					}
				}
			}
		});
	}

	if (global.sourcecodeVersion == null) {
		simpleGit(".").log(["-n 1"], function(err, log) {
			global.sourcecodeVersion = log.all[0].hash.substring(0, 10);
			global.sourcecodeDate = log.all[0].date.substring(0, "0000-00-00".length);
		});
	}

	if (global.exchangeRate == null) {
		utils.refreshExchangeRate();
	}

	// refresh exchange rate periodically
	setInterval(utils.refreshExchangeRate, 1800000);

	utils.logMemoryUsage();
	setInterval(utils.logMemoryUsage, 5000);
};

app.use(function(req, res, next) {
	// make session available in templates
	res.locals.session = req.session;

	if (config.credentials.rpc && req.session.host == null) {
		req.session.host = config.credentials.rpc.host;
		req.session.port = config.credentials.rpc.port;
		req.session.username = config.credentials.rpc.username;
	}

	var userAgent = req.headers['user-agent'];
	for (var i = 0; i < crawlerBotUserAgentStrings.length; i++) {
		if (userAgent.indexOf(crawlerBotUserAgentStrings[i]) != -1) {
			res.locals.crawlerBot = true;
		}
	}

	res.locals.config = global.config;
	res.locals.coinConfig = global.coinConfig;
	
	res.locals.host = req.session.host;
	res.locals.port = req.session.port;

	res.locals.genesisBlockHash = coreApi.getGenesisBlockHash();
	res.locals.genesisCoinbaseTransactionId = coreApi.getGenesisCoinbaseTransactionId();


	// currency format type
	if (!req.session.currencyFormatType) {
		var cookieValue = req.cookies['user-setting-currencyFormatType'];

		if (cookieValue) {
			req.session.currencyFormatType = cookieValue;

		} else {
			req.session.currencyFormatType = "";
		}
	}

	// theme
	if (!req.session.uiTheme) {
		var cookieValue = req.cookies['user-setting-uiTheme'];

		if (cookieValue) {
			req.session.uiTheme = cookieValue;

		} else {
			req.session.uiTheme = "";
		}
	}

	// homepage banner
	if (!req.session.hideHomepageBanner) {
		var cookieValue = req.cookies['user-setting-hideHomepageBanner'];

		if (cookieValue) {
			req.session.hideHomepageBanner = cookieValue;

		} else {
			req.session.hideHomepageBanner = "false";
		}
	}

	// electrum trust warnings on address pages
	if (!req.session.hideElectrumTrustWarnings) {
		var cookieValue = req.cookies['user-setting-hideElectrumTrustWarnings'];

		if (cookieValue) {
			req.session.hideElectrumTrustWarnings = cookieValue;

		} else {
			req.session.hideElectrumTrustWarnings = "false";
		}
	}

	res.locals.currencyFormatType = req.session.currencyFormatType;


	if (!["/", "/connect"].includes(req.originalUrl)) {
		if (utils.redirectToConnectPageIfNeeded(req, res)) {
			return;
		}
	}

	if (req.session.userMessage) {
		res.locals.userMessage = req.session.userMessage;
		
		if (req.session.userMessageType) {
			res.locals.userMessageType = req.session.userMessageType;
			
		} else {
			res.locals.userMessageType = "warning";
		}

		req.session.userMessage = null;
		req.session.userMessageType = null;
	}

	if (req.session.query) {
		res.locals.query = req.session.query;

		req.session.query = null;
	}

	// make some var available to all request
	// ex: req.cheeseStr = "cheese";

	next();
});

app.use('/', baseActionsRouter);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

app.locals.moment = moment;
app.locals.Decimal = Decimal;
app.locals.utils = utils;



module.exports = app;
