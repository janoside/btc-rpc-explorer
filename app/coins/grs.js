"use strict";

const Decimal = require("decimal.js");
const Decimal8 = Decimal.clone({ precision:8, rounding:8 });

const btcFun = require("./btcFun.js");

var currencyUnits = [
	{
		type:"native",
		name:"GRS",
		multiplier:1,
		default:true,
		values:["", "grs", "GRS"],
		decimalPlaces:8
	},
	{
		type:"native",
		name:"mGRS",
		multiplier:1000,
		values:["mgrs"],
		decimalPlaces:5
	},
	{
		type:"native",
		name:"groestls",
		multiplier:1000000,
		values:["groestls"],
		decimalPlaces:2
	},
	{
		type:"native",
		name:"gro",
		multiplier:100000000,
		values:["gro"],
		decimalPlaces:0
	},
	{
		type:"exchanged",
		name:"USD",
		multiplier:"usd",
		values:["usd"],
		decimalPlaces:2,
		symbol:"$"
	},
	{
		type:"exchanged",
		name:"EUR",
		multiplier:"eur",
		values:["eur"],
		decimalPlaces:2,
		symbol:"€"
	},
];

module.exports = {
	name:"Groestlcoin",
	ticker:"GRS",
	logoUrlsByNetwork:{
		"main":"./img/logo/logo.svg",
		"test":"./img/logo/logo-testnet.svg",
		"regtest":"./img/logo/logo-regtest.svg",
		"signet":"./img/logo/logo-signet.svg"
	},
	coinIconUrlsByNetwork:{
		"main":"./img/logo/btc.svg",
		"test":"./img/logo/btc-testnet.svg",
		"signet":"./img/logo/btc-signet.svg"
	},
	coinColorsByNetwork: {
		"main": "#00a4bd",
		"test": "#000000",
		"signet": "#ff5b42",
		"regtest": "#777"
	},
	siteTitlesByNetwork: {
		"main":"Groestlcoin Explorer",
		"test":"Testnet Explorer",
		"regtest":"Regtest Explorer",
		"signet":"Signet Explorer",
	},
	demoSiteUrlsByNetwork: {
		"main": "https://rpcexplorer.groestlcoin.org",
		"test": "https://rpcexplorer-test.groestlcoin.org",
		"signet": "https://rpcexplorer-signet.groestlcoin.org",
	},
	knownTransactionsByNetwork: {
		main: "c4d5b7cea3aed136e6e2beabcb4cdc21aa2d32b75a94eb74313154dac0615235",
		test: "73f1a0a89f65311230290d63f9635d165096d4451cc7da7cdb6e1ac2bfc103f7",
		signet: "39332e10af6fe491e8ae4ba1e2dd674698fedf8aa3c8c42bf71572debc1bb5b9"
	},
	miningPoolsConfigUrls:[
		"https://raw.githubusercontent.com/btc21/Bitcoin-Known-Miners/master/miners.json",
		"https://raw.githubusercontent.com/0xB10C/known-mining-pools/master/pools.json",
		"https://raw.githubusercontent.com/btccom/Blockchain-Known-Pools/master/pools.json",
		"https://raw.githubusercontent.com/blockchain/Blockchain-Known-Pools/master/pools.json"
	],
	maxBlockWeight: 4000000,
	maxBlockSize: 1000000,
	minTxBytes: 166, // ref: https://en.bitcoin.it/wiki/Maximum_transaction_rate
	minTxWeight: 166 * 4, // hack
	difficultyAdjustmentBlockCount: 1,
	maxSupplyByNetwork: {
		"main": new Decimal(105000000),
		"test": new Decimal(105000000),
		"regtest": new Decimal(105000000),
		"signet": new Decimal(105000000)
	},
	targetBlockTimeSeconds: 60,
	targetBlockTimeMinutes: 1,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"GRS":currencyUnits[0], "mGRS":currencyUnits[1], "groestls":currencyUnits[2], "gro":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100, 150],

	halvingBlockIntervalsByNetwork: {
		"main": 210000,
		"test": 210000,
		"regtest": 150,
		"signet": 210000
	},

	// used for supply estimates that don't need full gettxoutset accuracy
	coinSupplyCheckpointsByNetwork: {
		"main": [ 3746593, new Decimal(78340838) ],
		"test": [ 2227306, new Decimal(70744418) ],
		"signet": [ 29472, new Decimal(1473600) ],
		"regtest": [ 0, new Decimal(0) ]
	},

	genesisBlockHashesByNetwork:{
		"main":    "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023",
		"test":    "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
		"regtest": "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
		"signet":  "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6"
	},
	genesisCoinbaseTransactionIdsByNetwork: {
		"main":    "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
		"test":    "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
		"regtest": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
		"signet":  "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
	},
	genesisCoinbaseTransactionsByNetwork:{
		"main": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3a04ffff001d0104325072657373757265206d75737420626520707574206f6e20566c6164696d697220507574696e206f766572204372696d6561ffffffff010000000000000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000",
			"txid": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			"hash": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			"size": 185,
			"vsize": 185,
			"version": 1,
			"confirmations":3318814,
			"vin": [
				{
					"coinbase": "04ffff001d0104325072657373757265206d75737420626520707574206f6e20566c6164696d697220507574696e206f766572204372696d6561",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 0.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG",
						"hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
						"reqSigs": 1,
						"type": "pubkey"
					}
				}
			],
			"blockhash": "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023",
			"time": 1395342829,
			"blocktime": 1395342829
		},
		"test": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3a04ffff001d0104325072657373757265206d75737420626520707574206f6e20566c6164696d697220507574696e206f766572204372696d6561ffffffff010000000000000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000",
			"txid": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			"hash": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			"version": 1,
			"size": 266,
			"vsize": 266,
			"weight": 740,
			"locktime": 0,
			"vin": [
				{
					"coinbase": "04ffff001d0104325072657373757265206d75737420626520707574206f6e20566c6164696d697220507574696e206f766572204372696d6561",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 0.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG",
						"hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
						"reqSigs": 1,
						"type": "pubkey"
					}
				}
			],
			"blockhash": "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			"time": 1440000002,
			"blocktime": 1440000002
		},
		"regtest": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3a04ffff001d0104325072657373757265206d75737420626520707574206f6e20566c6164696d697220507574696e206f766572204372696d6561ffffffff010000000000000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000",
			"txid": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			"hash": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			"version": 1,
			"size": 266,
			"vsize": 266,
			"weight": 740,
			"locktime": 0,
			"vin": [
				{
					"coinbase": "04ffff001d0104325072657373757265206d75737420626520707574206f6e20566c6164696d697220507574696e206f766572204372696d6561",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 0.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG",
						"hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
						"type": "pubkey"
					}
				}
			],
			"blockhash": "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			"time": 1395342829,
			"blocktime": 1395342829
		},
		"signet": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000",
			"txid": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			"hash": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			"version": 1,
			"size": 204,
			"vsize": 204,
			"weight": 816,
			"locktime": 0,
			"vin": [
				{
					"coinbase": "04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 50.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f OP_CHECKSIG",
						"hex": "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac",
						"type": "pubkey"
					}
				}
			],
			"blockhash": "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6",
			"time": 1598918400,
			"blocktime": 1598918400
		}
	},
	genesisBlockStatsByNetwork:{
		"main": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023",
			"feerate_percentiles": [
				0,
				0,
				0,
				0,
				0
			],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1395342829,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 0,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1395342829,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		},
		"test": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			"feerate_percentiles": [
				0,
				0,
				0,
				0,
				0
			],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1440000002,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 0,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1440000002,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		},
		"regtest": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
			"feerate_percentiles": [
				0,
				0,
				0,
				0,
				0
			],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1296688602,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1296688602,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		},
		"signet": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6",
			"feerate_percentiles": [
				0,
				0,
				0,
				0,
				0
			],
			"height": 0,
			"ins": 0,
			"maxfee": 0,
			"maxfeerate": 0,
			"maxtxsize": 0,
			"medianfee": 0,
			"mediantime": 1598918400,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1598918400,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 117
		}
	},
	testData: {
		txDisplayTestList: {
			"0dcbd6281bda566912947373a6894708cafddb6641e5727a2a247b0c0575fa7f" : {
				blockHeight: 3700000, blockHash: "00000000000020b8adc9046cea2a85955d330e77e310cbb46986b67329cd2339"
			},
			"fca74998764f3fc8cf3a12989d95c65c280e2a594b5c0722f36d4d89098f8728" : {
				blockHeight: 3000000, blockHash: "0000000000000a409d1ded3df352b4c975e797da43d6024faea7b8794b94fe8f"
			}
		}
	},
	genesisCoinbaseOutputAddressScripthash:"8b01df4e368ea28f8dc0423bcf7a4923e3a12d307c875e47a0cfbf90b5c39161",
	historicalData: btcFun.items,
	exchangeRateData:{
		jsonUrl:"https://api.coingecko.com/api/v3/simple/price?ids=groestlcoin&vs_currencies=usd,eur,gbp",
		responseBodySelectorFunction:function(responseBody) {
			//console.log("Exchange Rate Response: " + JSON.stringify(responseBody));

			var exchangedCurrencies = ["usd", "gbp", "eur"];

			if (responseBody.groestlcoin) {
				var exchangeRates = {};

				for (var i = 0; i < exchangedCurrencies.length; i++) {
					if (responseBody.groestlcoin[exchangedCurrencies[i]]) {
						exchangeRates[exchangedCurrencies[i].toLowerCase()] = responseBody.groestlcoin[exchangedCurrencies[i]];
					}
				}

				return exchangeRates;
			}

			return null;
		}
	},
	goldExchangeRateData:{
		jsonUrl:"https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD",
		responseBodySelectorFunction:function(responseBody) {
			//console.log("Exchange Rate Response: " + JSON.stringify(responseBody));

			if (responseBody[0].topo && responseBody[0].topo.platform == "MT5") {
				var prices = responseBody[0].spreadProfilePrices[0];

				return {
					usd: prices.ask
				};
			}

			return null;
		}
	},
	blockRewardFunction:function(blockHeight) {
		// https://github.com/Groestlcoin/groestlcoin/blob/master/src/groestlcoin.cpp#L59
		var premine = new Decimal8(240640);
		var genesisBlockReward = new Decimal8(0);
		var minimumSubsidy = new Decimal8(5);
		function GetBlockSubsidy() {
			var nSubsidy = new Decimal8(512);
			// Subsidy is reduced by 6% every 10080 blocks, which will occur approximately every 1 week
			var exponent = Math.floor((blockHeight / 10080));
			for (var i = 0; i < exponent; i++){
					nSubsidy = nSubsidy.times(47).dividedBy(50);
			}
			if (nSubsidy.lte(minimumSubsidy)) {
				nSubsidy = minimumSubsidy;
			}
			return nSubsidy;
		}

		function GetBlockSubsidy120000() {
			var nSubsidy = new Decimal8(250);
			// Subsidy is reduced by 10% every day (1440 blocks)
			var exponent = Math.floor(((blockHeight - 120000) / 1440));
			for (var i = 0; i < exponent; i++){
					nSubsidy = nSubsidy.times(45).dividedBy(50);
			}
			if (nSubsidy.lte(minimumSubsidy)) {
				nSubsidy = minimumSubsidy;
			}
			return nSubsidy;
		}

		function GetBlockSubsidy150000() {
			var nSubsidy = new Decimal8(25);
			// Subsidy is reduced by 1% every week (10080 blocks)
			var exponent = Math.floor(((blockHeight - 150000) / 10080));
			for (var i = 0; i < exponent; i++){
					nSubsidy = nSubsidy.times(99).dividedBy(100);
			}
			if (nSubsidy.lte(minimumSubsidy)) {
				nSubsidy = minimumSubsidy;
			}
			return nSubsidy;
		}

		if (blockHeight == 0) {
			return genesisBlockReward;
		}
		if (blockHeight == 1) {
			return premine;
		}
		if (blockHeight >= 150000) {
			return GetBlockSubsidy150000();
		}
		if (blockHeight >= 120000) {
			return GetBlockSubsidy120000();
		}
		return GetBlockSubsidy();
	}
};
