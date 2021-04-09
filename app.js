#!/usr/bin/env node

"use strict";

const os = require('os');
const path = require('path');
const dotenv = require("dotenv");
const fs = require('fs');

const configPaths = [ path.join(os.homedir(), '.config', 'btc-rpc-explorer.env'), path.join(process.cwd(), '.env') ];
configPaths.filter(fs.existsSync).forEach(path => {
	console.log('Loading env file:', path);
	dotenv.config({ path });
});

global.cacheStats = {};

// debug module is already loaded by the time we do dotenv.config
// so refresh the status of DEBUG env var
const debug = require("debug");
debug.enable(process.env.DEBUG || "btcexp:app,btcexp:error");

const debugLog = debug("btcexp:app");
const debugErrorLog = debug("btcexp:error");
const debugPerfLog = debug("btcexp:actionPerformace");

const express = require('express');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require("express-session");
const csurf = require("csurf");
const config = require("./app/config.js");
const simpleGit = require('simple-git');
const utils = require("./app/utils.js");
const moment = require("moment");
const Decimal = require('decimal.js');
const bitcoinCore = require("bitcoin-core");
const pug = require("pug");
const momentDurationFormat = require("moment-duration-format");
const coreApi = require("./app/api/coreApi.js");
const coins = require("./app/coins.js");
const request = require("request");
const qrcode = require("qrcode");
const addressApi = require("./app/api/addressApi.js");
const electrumAddressApi = require("./app/api/electrumAddressApi.js");
const auth = require('./app/auth.js');
const sso = require('./app/sso.js');
const markdown = require("markdown-it")();
const v8 = require("v8");
const axios = require("axios");
var compression = require("compression");

require("./app/currencies.js");

const package_json = require('./package.json');
global.appVersion = package_json.version;

global.btcNodeSemver = "0.0.0";


const baseActionsRouter = require('./routes/baseRouter.js');
const apiActionsRouter = require('./routes/apiRouter.js');
const snippetActionsRouter = require('./routes/snippetRouter.js');
const adminActionsRouter = require('./routes/adminRouter.js');

const expressApp = express();


const statTracker = require("./app/statTracker.js");

const statsProcessFunction = (name, stats) => {
	if (process.env.STATS_API_URL) {
		const data = Object.assign({}, stats);
		data.name = name;

		axios.post(process.env.STATS_API_URL, data)
		.then(res => { /*console.log(res.data);*/ })
		.catch(error => {
			utils.logError("38974wrg9w7dsgfe", error);
		});
	}
};

const processStatsInterval = setInterval(() => {
	statTracker.processAndReset(
		statsProcessFunction,
		statsProcessFunction,
		statsProcessFunction);

}, process.env.STATS_PROCESS_INTERVAL || (5 * 60 * 1000));
	
// Don't keep Node.js process up
processStatsInterval.unref();



const systemMonitor = require("./app/systemMonitor.js");

const normalizeActions = require("./app/normalizeActions.js");
expressApp.use(require("./app/actionPerformanceMonitor.js")(statTracker, {
	ignoredEndsWithActions: "\.js|\.css|\.svg|\.png|\.woff2",
	ignoredStartsWithActions: `${config.baseUrl}snippet`,
	normalizeAction: (action) => {
		return normalizeActions(config.baseUrl, action);
	},
}));

// view engine setup
expressApp.set('views', path.join(__dirname, 'views'));

// ref: https://blog.stigok.com/post/disable-pug-debug-output-with-expressjs-web-app
expressApp.engine('pug', (path, options, fn) => {
	options.debug = false;
	return pug.__express.call(null, path, options, fn);
});

expressApp.set('view engine', 'pug');

if (process.env.NODE_ENV != "local") {
	// enable view cache regardless of env (development/production)
	// ref: https://pugjs.org/api/express.html
	expressApp.enable('view cache');
}

expressApp.use(cookieParser());

expressApp.disable('x-powered-by');


if (process.env.BTCEXP_BASIC_AUTH_PASSWORD) {
	// basic http authentication
	expressApp.use(auth(process.env.BTCEXP_BASIC_AUTH_PASSWORD));

} else if (process.env.BTCEXP_SSO_TOKEN_FILE) {
	// sso authentication
	expressApp.use(sso(process.env.BTCEXP_SSO_TOKEN_FILE, process.env.BTCEXP_SSO_LOGIN_REDIRECT_URL));
}

// uncomment after placing your favicon in /public
//expressApp.use(favicon(__dirname + '/public/favicon.ico'));
//expressApp.use(logger('dev'));
expressApp.use(bodyParser.json());
expressApp.use(bodyParser.urlencoded({ extended: false }));
expressApp.use(session({
	secret: config.cookieSecret,
	resave: false,
	saveUninitialized: false
}));

expressApp.use(compression());

expressApp.use(config.baseUrl, express.static(path.join(__dirname, 'public'), {
	maxAge: 60 * 60 * 1000
}));


if (config.baseUrl != '/') {
	expressApp.get('/', (req, res) => res.redirect(config.baseUrl));
}

process.on("unhandledRejection", (reason, p) => {
	debugLog("Unhandled Rejection at: Promise", p, "reason:", reason, "stack:", (reason != null ? reason.stack : "null"));
});

function loadMiningPoolConfigs() {
	debugLog("Loading mining pools config");

	global.miningPoolsConfigs = [];

	var miningPoolsConfigDir = path.join(__dirname, "public", "txt", "mining-pools-configs", global.coinConfig.ticker);

	fs.readdir(miningPoolsConfigDir, function(err, files) {
		if (err) {
			utils.logError("3ufhwehe", err, {configDir:miningPoolsConfigDir, desc:"Unable to scan directory"});

			return;
		}

		files.forEach(function(file) {
			var filepath = path.join(miningPoolsConfigDir, file);

			var contents = fs.readFileSync(filepath, 'utf8');

			global.miningPoolsConfigs.push(JSON.parse(contents));
		});

		for (var i = 0; i < global.miningPoolsConfigs.length; i++) {
			for (var x in global.miningPoolsConfigs[i].payout_addresses) {
				if (global.miningPoolsConfigs[i].payout_addresses.hasOwnProperty(x)) {
					global.specialAddresses[x] = {type:"minerPayout", minerInfo:global.miningPoolsConfigs[i].payout_addresses[x]};
				}
			}
		}
	});
}

function getSourcecodeProjectMetadata() {
	var options = {
		url: "https://api.github.com/repos/janoside/btc-rpc-explorer",
		headers: {
			'User-Agent': 'request'
		}
	};

	request(options, function(error, response, body) {
		if (error == null && response && response.statusCode && response.statusCode == 200) {
			var responseBody = JSON.parse(body);

			global.sourcecodeProjectMetadata = responseBody;

		} else {
			utils.logError("3208fh3ew7eghfg", {error:error, response:response, body:body});
		}
	});
}

function loadChangelog() {
	var filename = "CHANGELOG.md";
	
	fs.readFile(path.join(__dirname, filename), 'utf8', function(err, data) {
		if (err) {
			utils.logError("2379gsd7sgd334", err);

		} else {
			global.changelogMarkdown = data;
		}
	});
}

function loadHistoricalDataForChain(chain) {
	debugLog(`Loading historical data for chain=${chain}`);

	if (global.coinConfig.historicalData) {
		global.coinConfig.historicalData.forEach(function(item) {
			if (item.chain == chain) {
				if (item.type == "blockheight") {
					global.specialBlocks[item.blockHash] = item;

				} else if (item.type == "tx") {
					global.specialTransactions[item.txid] = item;

				} else if (item.type == "address" || item.address) {
					global.specialAddresses[item.address] = {type:"fun", addressInfo:item};
				}
			}
		});
	}
}

function verifyRpcConnection() {
	if (!global.activeBlockchain) {
		debugLog(`Verifying RPC connection...`);

		Promise.all([
			coreApi.getNetworkInfo(),
			coreApi.getBlockchainInfo(),
		]).then(([ getnetworkinfo, getblockchaininfo ]) => {
			global.activeBlockchain = getblockchaininfo.chain;

			// we've verified rpc connection, no need to keep trying
			clearInterval(global.verifyRpcConnectionIntervalId);

			onRpcConnectionVerified(getnetworkinfo, getblockchaininfo);

		}).catch(function(err) {
			utils.logError("32ugegdfsde", err);
		});
	}
}

async function onRpcConnectionVerified(getnetworkinfo, getblockchaininfo) {
	// localservicenames introduced in 0.19
	var services = getnetworkinfo.localservicesnames ? ("[" + getnetworkinfo.localservicesnames.join(", ") + "]") : getnetworkinfo.localservices;

	global.getnetworkinfo = getnetworkinfo;

	if (getblockchaininfo.pruned) {
		global.prunedBlockchain = true;
		global.pruneHeight = getblockchaininfo.pruneheight;
	}

	var bitcoinCoreVersionRegex = /^.*\/Satoshi\:(.*)\/.*$/;

	var match = bitcoinCoreVersionRegex.exec(getnetworkinfo.subversion);
	if (match) {
		global.btcNodeVersion = match[1];

		var semver4PartRegex = /^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/;

		var semver4PartMatch = semver4PartRegex.exec(global.btcNodeVersion);
		if (semver4PartMatch) {
			var p0 = semver4PartMatch[1];
			var p1 = semver4PartMatch[2];
			var p2 = semver4PartMatch[3];
			var p3 = semver4PartMatch[4];

			// drop last segment, which usually indicates a bug fix release which is (hopefully) irrelevant for RPC API versioning concerns
			global.btcNodeSemver = `${p0}.${p1}.${p2}`;

		} else {
			var semver3PartRegex = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/;

			var semver3PartMatch = semver3PartRegex.exec(global.btcNodeVersion);
			if (semver3PartMatch) {
				var p0 = semver3PartMatch[1];
				var p1 = semver3PartMatch[2];
				var p2 = semver3PartMatch[3];

				global.btcNodeSemver = `${p0}.${p1}.${p2}`;

			} else {
				// short-circuit: force all RPC calls to pass their version checks - this will likely lead to errors / instability / unexpected results
				global.btcNodeSemver = "1000.1000.0"
			}
		}
	} else {
		// short-circuit: force all RPC calls to pass their version checks - this will likely lead to errors / instability / unexpected results
		global.btcNodeSemver = "1000.1000.0"

		debugErrorLog(`Unable to parse node version string: ${getnetworkinfo.subversion} - RPC versioning will likely be unreliable. Is your node a version of Bitcoin Core?`);
	}
	
	debugLog(`RPC Connected: version=${getnetworkinfo.version} subversion=${getnetworkinfo.subversion}, parsedVersion(used for RPC versioning)=${global.btcNodeSemver}, protocolversion=${getnetworkinfo.protocolversion}, chain=${getblockchaininfo.chain}, services=${services}`);

	
	// load historical/fun items for this chain
	loadHistoricalDataForChain(global.activeBlockchain);

	if (global.activeBlockchain == "main") {
		if (global.exchangeRates == null) {
			utils.refreshExchangeRates();
		}

		// refresh exchange rate periodically
		setInterval(utils.refreshExchangeRates, 1800000);
	}

	// UTXO pull
	refreshUtxoSetSummary();
	setInterval(refreshUtxoSetSummary, 30 * 60 * 1000);


	// 1d / 7d volume
	refreshNetworkVolumes();
	setInterval(refreshNetworkVolumes, 30 * 60 * 1000);


	assessTxindexAvailability();
}

async function assessTxindexAvailability() {
	// Here we try to call getindexinfo to assess availability of txindex
	// However, getindexinfo RPC is only available in v0.21+, so the call
	// may return an "unsupported" error. If/when it does, we will fall back
	// to assessing txindex availability by querying a known txid
	debugLog("txindex check: trying getindexinfo");
	global.getindexinfo = await coreApi.getIndexInfo();

	debugLog(`txindex check: getindexinfo=${JSON.stringify(global.getindexinfo)}`);

	if (global.getindexinfo.txindex) {
		// getindexinfo was available, and txindex is also available...easy street
		
		global.txindexAvailable = true;

		debugLog("txindex check: available!");

	} else if (global.getindexinfo.minRpcVersionNeeded) {
		// here we find out that getindexinfo is unavailable on our node because
		// we're running pre-v0.21, so we fall back to querying a known txid
		// to assess txindex availability

		debugLog("txindex check: getindexinfo unavailable, trying txid lookup");

		try {
			// lookup a known TXID as a test for whether txindex is available
			let knownTx = await coreApi.getRawTransaction(coinConfig.knownTransactionsByNetwork[global.activeBlockchain]);

			// if we get here without an error being thrown, we know we're able to look up by txid
			// thus, txindex is available
			global.txindexAvailable = true;

			debugLog("txindex check: available! (pre-v0.21)");

		} catch (e) {
			// here we were unable to query by txid, so we believe txindex is unavailable
			global.txindexAvailable = false;

			debugLog("txindex check: unavailable");
		}
	} else {
		// here getindexinfo is available (i.e. we're on v0.21+), but txindex is NOT available
		global.txindexAvailable = false;

		debugLog("txindex check: unavailable");
	}
}

function refreshUtxoSetSummary() {
	if (config.slowDeviceMode) {
		global.utxoSetSummary = null;
		global.utxoSetSummaryPending = false;

		debugLog("Skipping performance-intensive task: fetch UTXO set summary. This is skipped due to the flag 'slowDeviceMode' which defaults to 'true' to protect slow nodes. Set this flag to 'false' to enjoy UTXO set summary details.");

		return;
	}

	// flag that we're working on calculating UTXO details (to differentiate cases where we don't have the details and we're not going to try computing them)
	global.utxoSetSummaryPending = true;

	coreApi.getUtxoSetSummary().then(function(result) {
		global.utxoSetSummary = result;

		result.lastUpdated = Date.now();

		debugLog("Refreshed utxo summary: " + JSON.stringify(result));
	});
}

function refreshNetworkVolumes() {
	if (config.slowDeviceMode) {
		debugLog("Skipping performance-intensive task: fetch last 24 hrs of blockstats to calculate transaction volume. This is skipped due to the flag 'slowDeviceMode' which defaults to 'true' to protect slow nodes. Set this flag to 'false' to enjoy UTXO set summary details.");

		return;
	}

	var cutoff1d = new Date().getTime() - (60 * 60 * 24 * 1000);
	var cutoff7d = new Date().getTime() - (60 * 60 * 24 * 7 * 1000);

	coreApi.getBlockchainInfo().then(function(result) {
		var promises = [];

		var blocksPerDay = 144 + 20; // 20 block padding

		for (var i = 0; i < (blocksPerDay * 1); i++) {
			if (result.blocks - i >= 0) {
				promises.push(coreApi.getBlockStatsByHeight(result.blocks - i));
			}
		}

		var startBlock = result.blocks;

		var endBlock1d = result.blocks;
		var endBlock7d = result.blocks;

		var endBlockTime1d = 0;
		var endBlockTime7d = 0;

		Promise.all(promises).then(function(results) {
			var volume1d = new Decimal(0);
			var volume7d = new Decimal(0);

			var blocks1d = 0;
			var blocks7d = 0;

			if (results && results.length > 0 && results[0] != null) {
				for (var i = 0; i < results.length; i++) {
					if (results[i].time * 1000 > cutoff1d) {
						volume1d = volume1d.plus(new Decimal(results[i].total_out));
						volume1d = volume1d.plus(new Decimal(results[i].subsidy));
						volume1d = volume1d.plus(new Decimal(results[i].totalfee));
						blocks1d++;

						endBlock1d = results[i].height;
						endBlockTime1d = results[i].time;
					}

					if (results[i].time * 1000 > cutoff7d) {
						volume7d = volume7d.plus(new Decimal(results[i].total_out));
						volume7d = volume7d.plus(new Decimal(results[i].subsidy));
						volume7d = volume7d.plus(new Decimal(results[i].totalfee));
						blocks7d++;

						endBlock7d = results[i].height;
						endBlockTime7d = results[i].time;
					}
				}

				volume1d = volume1d.dividedBy(coinConfig.baseCurrencyUnit.multiplier);
				volume7d = volume7d.dividedBy(coinConfig.baseCurrencyUnit.multiplier);

				global.networkVolume = {d1:{amt:volume1d, blocks:blocks1d, startBlock:startBlock, endBlock:endBlock1d, startTime:results[0].time, endTime:endBlockTime1d}};

				debugLog(`Network volume: ${JSON.stringify(global.networkVolume)}`);

			} else {
				debugLog("Unable to load network volume, likely due to bitcoind version older than 0.17.0 (the first version to support getblockstats).");
			}
		});
	});
}


expressApp.onStartup = function() {
	global.appStartTime = new Date().getTime();
	
	global.config = config;
	global.coinConfig = coins[config.coin];
	global.coinConfigs = coins;

	global.specialTransactions = {};
	global.specialBlocks = {};
	global.specialAddresses = {};

	loadChangelog();

	global.nodeVersion = process.version;
	debugLog(`Environment(${expressApp.get("env")}) - Node: ${process.version}, Platform: ${process.platform}, Versions: ${JSON.stringify(process.versions)}`);


	// dump "startup" heap after 5sec
	if (false) {
		(function () {
			var callback = function() {
				debugLog("Waited 5 sec after startup, now dumping 'startup' heap...");

				const filename = `./heapDumpAtStartup-${Date.now()}.heapsnapshot`;
				const heapdumpStream = v8.getHeapSnapshot();
				const fileStream = fs.createWriteStream(filename);
				heapdumpStream.pipe(fileStream);

				debugLog("Heap dump at startup written to", filename);
			};

			setTimeout(callback, 5000);
		})();
	}
	

	if (global.sourcecodeVersion == null && fs.existsSync('.git')) {
		simpleGit(".").log(["-n 1"], function(err, log) {
			if (err) {
				utils.logError("3fehge9ee", err, {desc:"Error accessing git repo"});

				debugLog(`Starting ${global.coinConfig.ticker} RPC Explorer, v${global.appVersion} (code: unknown commit) at http://${config.host}:${config.port}${config.baseUrl}`);

			} else {
				global.sourcecodeVersion = log.all[0].hash.substring(0, 10);
				global.sourcecodeDate = log.all[0].date.substring(0, "0000-00-00".length);

				debugLog(`Starting ${global.coinConfig.ticker} RPC Explorer, v${global.appVersion} (commit: '${global.sourcecodeVersion}', date: ${global.sourcecodeDate}) at http://${config.host}:${config.port}${config.baseUrl}`);
			}

			expressApp.continueStartup();
		});

	} else {
		debugLog(`Starting ${global.coinConfig.ticker} RPC Explorer, v${global.appVersion} at http://${config.host}:${config.port}${config.baseUrl}`);

		expressApp.continueStartup();
	}
}

expressApp.continueStartup = function() {
	var rpcCred = config.credentials.rpc;
	debugLog(`Connecting to RPC node at ${rpcCred.host}:${rpcCred.port}`);

	var rpcClientProperties = {
		host: rpcCred.host,
		port: rpcCred.port,
		username: rpcCred.username,
		password: rpcCred.password,
		timeout: rpcCred.timeout
	};

	global.rpcClient = new bitcoinCore(rpcClientProperties);

	var rpcClientNoTimeoutProperties = {
		host: rpcCred.host,
		port: rpcCred.port,
		username: rpcCred.username,
		password: rpcCred.password,
		timeout: 0
	};

	global.rpcClientNoTimeout = new bitcoinCore(rpcClientNoTimeoutProperties);

	// default values - after we connect via RPC, we update this
	global.txindexAvailable = false;
	global.prunedBlockchain = false;
	global.pruneHeight = -1;


	// keep trying to verify rpc connection until we succeed
	// note: see verifyRpcConnection() for associated clearInterval() after success
	verifyRpcConnection();
	global.verifyRpcConnectionIntervalId = setInterval(verifyRpcConnection, 30000);


	if (config.addressApi) {
		var supportedAddressApis = addressApi.getSupportedAddressApis();
		if (!supportedAddressApis.includes(config.addressApi)) {
			utils.logError("32907ghsd0ge", `Unrecognized value for BTCEXP_ADDRESS_API: '${config.addressApi}'. Valid options are: ${supportedAddressApis}`);
		}

		if (config.addressApi == "electrum" || config.addressApi == "electrumx") {
			if (config.electrumServers && config.electrumServers.length > 0) {
				electrumAddressApi.connectToServers().then(function() {
					global.electrumAddressApi = electrumAddressApi;
					
				}).catch(function(err) {
					utils.logError("31207ugf4e0fed", err, {electrumServers:config.electrumServers});
				});
			} else {
				utils.logError("327hs0gde", "You must set the 'BTCEXP_ELECTRUM_SERVERS' environment variable when BTCEXP_ADDRESS_API=electrum.");
			}
		}
	}


	loadMiningPoolConfigs();


	if (config.demoSite) {
		getSourcecodeProjectMetadata();
		setInterval(getSourcecodeProjectMetadata, 3600000);
	}


	utils.logMemoryUsage();
	setInterval(utils.logMemoryUsage, 5000);
};

expressApp.use(function(req, res, next) {
	req.startTime = Date.now();

	next();
});

expressApp.use(function(req, res, next) {
	// make session available in templates
	res.locals.session = req.session;

	if (config.credentials.rpc && req.session.host == null) {
		req.session.host = config.credentials.rpc.host;
		req.session.port = config.credentials.rpc.port;
		req.session.username = config.credentials.rpc.username;
	}

	var userAgent = req.headers['user-agent'];
	var crawler = utils.getCrawlerFromUserAgentString(userAgent);
	if (crawler) {
		res.locals.crawlerBot = true;
	}

	// make a bunch of globals available to templates
	res.locals.config = global.config;
	res.locals.coinConfig = global.coinConfig;
	res.locals.activeBlockchain = global.activeBlockchain;
	res.locals.exchangeRates = global.exchangeRates;
	res.locals.utxoSetSummary = global.utxoSetSummary;
	res.locals.utxoSetSummaryPending = global.utxoSetSummaryPending;
	res.locals.networkVolume = global.networkVolume;
	
	res.locals.host = req.session.host;
	res.locals.port = req.session.port;

	res.locals.genesisBlockHash = coreApi.getGenesisBlockHash();
	res.locals.genesisCoinbaseTransactionId = coreApi.getGenesisCoinbaseTransactionId();

	res.locals.pageErrors = [];


	if (!req.session.userSettings) {
		req.session.userSettings = JSON.parse(req.cookies["user-settings"] || "{}");
	}

	const userSettings = req.session.userSettings;
	res.locals.userSettings = userSettings;



	if (!userSettings.displayCurrency) {
		userSettings.displayCurrency = "btc";
	}

	if (!userSettings.localCurrency) {
		userSettings.localCurrency = "usd";
	}

	// theme
	if (!userSettings.uiTheme) {
		userSettings.uiTheme = config.defaultTheme;
	}


	res.locals.displayCurrency = userSettings.displayCurrency;
	res.locals.localCurrency = userSettings.localCurrency;


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

expressApp.use(csurf(), (req, res, next) => {
	res.locals.csrfToken = req.csrfToken();

	next();
});

expressApp.use(config.baseUrl, baseActionsRouter);
expressApp.use(config.baseUrl + 'api/', apiActionsRouter);
expressApp.use(config.baseUrl + 'snippet/', snippetActionsRouter);
expressApp.use(config.baseUrl + 'admin/', adminActionsRouter);

expressApp.use(function(req, res, next) {
	var time = Date.now() - req.startTime;
	
	debugPerfLog("Finished action '%s' in %d ms", req.path, time);

	if (!res.headersSent) {
		next();
	}
});

/// catch 404 and forwarding to error handler
expressApp.use(function(req, res, next) {
	var err = new Error(`Not Found: ${req ? req.url : 'unknown url'}`);
	err.status = 404;

	next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (expressApp.get("env") === "development" || expressApp.get("env") === "local") {
	expressApp.use(function(err, req, res, next) {
		if (err) {
			utils.logError("3289023yege", err);
		}

		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
expressApp.use(function(err, req, res, next) {
	if (err) {
		utils.logError("2309832hcxwgeeew", err);
	}

	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

expressApp.locals.moment = moment;
expressApp.locals.Decimal = Decimal;
expressApp.locals.utils = utils;
expressApp.locals.markdown = src => markdown.render(src);



module.exports = expressApp;
