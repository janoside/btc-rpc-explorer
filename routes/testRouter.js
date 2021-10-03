"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:router");

const express = require('express');
const csurf = require('csurf');
const router = express.Router();
const util = require('util');
const moment = require('moment');
const bitcoinCore = require("btc-rpc-client");
const qrcode = require('qrcode');
const bitcoinjs = require('groestlcoinjs-lib');
const bip32 = require('bip32grs');
const bs58check = require('bs58grscheck');
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


router.get("/tx-display", asyncHandler(async (req, res, next) => {
	res.locals.transactions = [];
	res.locals.txInputsByTransaction = {};
	res.locals.blockHeightsByTxid = {};

	var txidOrder = [];

	const promises = [];
	for (const [txid, data] of Object.entries(global.coinConfig.testData.txDisplayTestList)) {
		txidOrder.push(txid);

		const blockHash = data.blockHash;

		res.locals.blockHeightsByTxid[txid] = data.blockHeight;

		promises.push(utils.timePromise("test.tx-display.getRawTransactionsWithInputs", async () => {
			const transactionData = await coreApi.getRawTransactionsWithInputs([txid], 5, blockHash);

			res.locals.transactions.push(transactionData.transactions[0]);

			for (const [resultTxid, resultData] of Object.entries(transactionData.txInputsByTransaction)) {
				res.locals.txInputsByTransaction[resultTxid] = resultData;
			}
			//console.log(JSON.stringify(transactionData.txInputsByTransaction));
		}));
	}

	res.locals.maxTxOutputDisplayCount = 12;

	// todo: include a random mempool tx

	await Promise.all(promises);

	res.locals.transactions.sort((a, b) => {
		return txidOrder.indexOf(a.txid) - txidOrder.indexOf(b.txid);
	});

	res.render("test/tx-display.pug");

	next();
}));

module.exports = router;
