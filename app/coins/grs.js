var Decimal = require("decimal.js");
Decimal8 = Decimal.clone({ precision:8, rounding:8 });

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
		"main":"/img/logo/grs.svg",
		"test":"/img/logo/tgrs.svg",
		"regtest":"/img/logo/tgrs.svg"
	},
	siteTitlesByNetwork: {
		"main":"Groestlcoin Explorer",
		"test":"Testnet Explorer",
		"regtest":"Regtest Explorer"
	},
	siteDescriptionHtml:"<b>GRS Explorer</b> is <a href='https://github.com/groestlcoin/grs-rpc-explorer). If you run your own [Groestlcoin Full Node](https://www.groestlcoin.org/groestlcoin-core-wallet/), **GRS Explorer** can easily run alongside it, communicating via RPC calls. See the project [ReadMe](https://github.com/groestlcoin/grs-rpc-explorer) for a list of features and instructions for running.",
	nodeTitle:"Groestlcoin Full Node",
	nodeUrl:"https://www.groestlcoin.org/groestlcoin-core-wallet/",
	demoSiteUrl: "https://rpcexplorer.groestlcoin.org",
	miningPoolsConfigUrls:[
		"https://raw.githubusercontent.com/btccom/Blockchain-Known-Pools/master/pools.json",
		"https://raw.githubusercontent.com/blockchain/Blockchain-Known-Pools/master/pools.json"
	],
	maxBlockWeight: 4000000,
	maxBlockSize: 1000000,
	difficultyAdjustmentBlockCount: 2016,
	maxSupplyByNetwork: {
		"main": new Decimal(105000000),
		"test": new Decimal(105000000),
		"regtest": new Decimal(105000000)
	},
	targetBlockTimeSeconds: 600,
	targetBlockTimeMinutes: 10,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"GRS":currencyUnits[0], "mGRS":currencyUnits[1], "groestls":currencyUnits[2], "gro":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100, 150],
	genesisBlockHashesByNetwork:{
		"main":    "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023",
		"test":    "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
		"regtest": "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36"
	},
	genesisCoinbaseTransactionIdsByNetwork: {
		"main":    "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
		"test":    "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
		"regtest": "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb"
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
		}
	},
	genesisCoinbaseOutputAddressScripthash:"8b01df4e368ea28f8dc0423bcf7a4923e3a12d307c875e47a0cfbf90b5c39161",
	historicalData: [
		{
			type: "blockheight",
			date: "2014-03-22",
			chain: "main",
			blockHeight: 0,
			blockHash: "00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023",
			summary: "The Groestlcoin Genesis Block.",
			alertBodyHtml: "This is the first block in the Groestlcoin blockchain, known as the 'Genesis Block'.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2014-03-22",
			chain: "main",
			txid: "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='/block/00000ac5927c594d49cc0bdb81759d0da8297eb614683d3acb62f0703b639023'>Groestlcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},

		// testnet
		{
			type: "blockheight",
			date: "2015-08-19",
			chain: "test",
			blockHeight: 0,
			blockHash: "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			summary: "The Groestlcoin (regtest) Genesis Block.",
			alertBodyHtml: "This is the first block in the Groestlcoin blockchain, known as the 'Genesis Block'. You can read more about <a href='https://en.bitcoin.it/wiki/Genesis_block'>the genesis block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2015-08-19",
			chain: "test",
			txid: "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='/block/000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36'>Groestlcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},


		// regtest
		{
			type: "blockheight",
			date: "2014-03-22",
			chain: "regtest",
			blockHeight: 0,
			blockHash: "000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36",
			summary: "The groestlcoin (regtest) Genesis Block.",
			alertBodyHtml: "This is the first block in the Bitcoin blockchain, known as the 'Genesis Block'. You can read more about <a href='https://en.bitcoin.it/wiki/Genesis_block'>the genesis block</a>.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2014-03-22",
			chain: "regtest",
			txid: "3ce968df58f9c8a752306c4b7264afab93149dbc578bd08a42c446caaa6628bb",
			summary: "The coinbase transaction of the Genesis Block.",
			alertBodyHtml: "This transaction doesn't really exist! This is the coinbase transaction of the <a href='/block/000000ffbb50fc9898cdd36ec163e6ba23230164c0052a28876255b7dcf2cd36'>Groestlcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},
	],
	exchangeRateData:{
		jsonUrl:"https://api.coingecko.com/api/v3/simple/price?ids=groestlcoin&vs_currencies=usd,eur",
		responseBodySelectorFunction:function(responseBody) {
			//console.log("Exchange Rate Response: " + JSON.stringify(responseBody));

			var exchangedCurrencies = ["usd", "eur"];

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
