"use strict";

const btc = require("./coins/btc.js");
const ltc = require("./coins/ltc.js");

module.exports = {
	"BTC": btc,
	"LTC": ltc,

	"coins":["BTC", "LTC"]
};