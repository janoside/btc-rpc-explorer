const fs = require('fs');
const path = require('path');
const onHeaders = require('on-headers');
const os = require('os');
const v8 = require('v8');
const debug = require("debug");
const debugLog = debug("monitor");


const onHeadersListener = (config, req, statusCode, startTime, statTracker) => {
	try {
		const diff = process.hrtime(startTime);
		const responseTime = parseInt(((diff[0] * 1e3) + diff[1]) * 1e-6);
		const category = Math.floor(statusCode / 100);

		let action = req.baseUrl + req.path;

		if (config.ignoredEndsWithActionsRegex.test(action)) {
			return;
		}

		if (config.ignoredStartsWithActionsRegex.test(action)) {
			return;
		}

		let allActions = "*";
		if (config.normalizeAction) {
			action = config.normalizeAction(action);
			allActions = config.normalizeAction(allActions);
		}

		statTracker.trackPerformance(`action.${action}`, responseTime);
		statTracker.trackPerformance("action.*", responseTime);

		statTracker.trackEvent(`action-status.${action}.${category}00`);
		statTracker.trackEvent(`action-status.*.${category}00`);

		var userAgent = req.headers['user-agent'];
		var crawler = utils.getCrawlerFromUserAgentString(userAgent);
		if (crawler) {
			statTracker.trackEvent(`site-crawl.${crawler}`);
		}

	} catch (err) {
		debugLog(err);
	}
};

const validateConfig = (cfg) => {
	const config = (cfg || {});

	if (!config.ignoredEndsWithActions) {
		config.ignoredEndsWithActions = "\.js|\.css|\.svg|\.png";
	}

	config.ignoredEndsWithActionsRegex = new RegExp(config.ignoredEndsWithActions + "$", "i");


	if (!config.ignoredStartsWithActions) {
		config.ignoredStartsWithActions = "ignoreStartsWithThis|andIgnoreStartsWithThis";
	}

	config.ignoredStartsWithActionsRegex = new RegExp("^" + config.ignoredStartsWithActions, "i");

	return config;
};

const middlewareWrapper = (statTracker, cfg) => {
	const config = validateConfig(cfg);

	const middleware = (req, res, next) => {
		const startTime = process.hrtime();

		onHeaders(res, () => {
			onHeadersListener(config, req, res.statusCode, startTime, statTracker);
		});

		next();
	};

	middleware.middleware = middleware;

	return middleware;
};

module.exports = middlewareWrapper;


