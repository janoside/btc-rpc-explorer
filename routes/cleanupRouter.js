"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:cleanup");

const express = require('express');
const csrfApi = require('csurf');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const qrcode = require('qrcode');
const bitcoinjs = require('bitcoinjs-lib');
const bip32 = require('bip32');
const bs58check = require('bs58check');
const { bech32, bech32m } = require("bech32");
const sha256 = require("crypto-js/sha256");
const hexEnc = require("crypto-js/enc-hex");
const Decimal = require("decimal.js");
const semver = require("semver");
const markdown = require("markdown-it")();
const asyncHandler = require("express-async-handler");

const utils = require('./../app/utils.js');
const coins = require("./../app/coins.js");
const config = require("./../app/config.js");
const coreApi = require("./../app/api/coreApi.js");
const addressApi = require("./../app/api/addressApi.js");
const rpcApi = require("./../app/api/rpcApi.js");
const btcQuotes = require("./../app/coins/btcQuotes.js");



function logUrlError(req, type) {
	let userAgent = req.headers['user-agent'];

	utils.logError(`DoubleUrl`, null, {"type": "block/block", "userAgent":userAgent}, false);
}



router.get("/block/block/:blockHash", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block/block");

	res.redirect(301, `${config.baseUrl}block/${req.params.blockHash}`);

	return;
}));

router.get("/block/address/:address", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block/address");

	res.redirect(301, `${config.baseUrl}address/${req.params.address}`);

	return;
}));

router.get("/block/tx/:txid", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block/tx");

	res.redirect(301, `${config.baseUrl}tx/${req.params.txid}`);

	return;
}));





router.get("/tx/tx/:transactionId", asyncHandler(async (req, res, next) => {
	logUrlError(req, "tx/tx");

	res.redirect(301, `${config.baseUrl}tx/${req.params.transactionId}`);

	return;
}));

router.get("/tx/block/:blockHash", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block/tx");

	res.redirect(301, `${config.baseUrl}block/${req.params.blockHash}`);

	return;
}));






router.get("/block-height/address/:address", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block-height/address");

	res.redirect(301, `${config.baseUrl}address/${req.params.address}`);

	return;
}));

router.get("/block-height/tx/:txid", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block-height/tx");

	res.redirect(301, `${config.baseUrl}tx/${req.params.txid}`);

	return;
}));

router.get("/block-height/block-height/:blockHeight", asyncHandler(async (req, res, next) => {
	logUrlError(req, "block-height/block-height");

	res.redirect(301, `${config.baseUrl}block-height/${req.params.blockHeight}`);

	return;
}));



module.exports = router;
