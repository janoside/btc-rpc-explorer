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
const Decimal = require("decimal.js");

const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");
const btcQuotes = require("./../app/coins/btcQuotes.js");

const forceCsrf = csurf({ ignoreMethods: [] });





router.get("/formatCurrencyAmount/:amt", function(req, res, next) {
	res.locals.currencyValue = req.params.amt;

	res.render("includes/value-display");

	next();
});

router.get("/quote/random", function(req, res, next) {
	res.locals.quoteIndex = utils.randomInt(0, btcQuotes.items.length);
	res.locals.quote = btcQuotes.items[res.locals.quoteIndex];

	res.render("snippets/quote");

	next();
});


module.exports = router;
