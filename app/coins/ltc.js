var Decimal = require("decimal.js");
Decimal8 = Decimal.clone({ precision:8, rounding:8 });

var currencyUnits = [
	{
		type:"native",
		name:"LTC",
		multiplier:1,
		default:true,
		values:["", "ltc", "LTC"],
		decimalPlaces:8
	},
	{
		type:"native",
		name:"lite",
		multiplier:1000,
		values:["lite"],
		decimalPlaces:5
	},
	{
		type:"native",
		name:"photon",
		multiplier:1000000,
		values:["photon"],
		decimalPlaces:2
	},
	{
		type:"native",
		name:"litoshi",
		multiplier:100000000,
		values:["litoshi", "lit"],
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
];

module.exports = {
	name:"Litecoin",
	ticker:"LTC",
	logoUrl:"/img/logo/ltc.svg",
	siteTitle:"Litecoin Explorer",
	nodeTitle:"Litecoin Full Node",
	nodeUrl:"https://litecoin.org/",
	demoSiteUrl: "https://ltc.chaintools.io",
	miningPoolsConfigUrls:[
		"https://raw.githubusercontent.com/hashstream/pools/master/pools.json",
	],
	maxBlockWeight: 4000000,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"LTC":currencyUnits[0], "lite":currencyUnits[1], "photon":currencyUnits[2], "litoshi":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [5, 10, 25, 50, 100, 150, 200, 250],
	genesisBlockHash: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2",
	genesisCoinbaseTransactionId: "97ddfbbae6be97fd6cdf3e7ca13232a3afff2353e29badfab7f73011edd4ced9",
	genesisCoinbaseTransaction: {
		"txid":"97ddfbbae6be97fd6cdf3e7ca13232a3afff2353e29badfab7f73011edd4ced9",
		"hash":"97ddfbbae6be97fd6cdf3e7ca13232a3afff2353e29badfab7f73011edd4ced9",
		"blockhash":"12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2",
		"version":1,
		"locktime":0,
		"size":199,
		"vsize":199,
		"time":1317972665,
		"blocktime":1317972665,
		"vin":[
			{
				"prev_out":{
					"hash":"0000000000000000000000000000000000000000000000000000000000000000",
					"n":4294967295
				},
				"coinbase":"04ffff001d0104404e592054696d65732030352f4f63742f32303131205374657665204a6f62732c204170706c65e280997320566973696f6e6172792c2044696573206174203536"
			}
		],
		"vout":[
			{
				"value":"50.00000000",
				"n":0,
				"scriptPubKey":{
					"hex":"040184710fa689ad5023690c80f3a49c8f13f8d45b8c857fbcbc8bc4a8e4d3eb4b10f4d4604fa08dce601aaf0f470216fe1b51850b4acf21b179c45070ac7b03a9 OP_CHECKSIG",
					"type":"pubkey",
					"reqSigs":1,
					"addresses":[
						"Ler4HNAEfwYhBmGXcFP2Po1NpRUEiK8km2"
					]
				}
			}
		]
	},
	historicalData: [
		{
			type: "blockheight",
			date: "2011-10-07",
			blockHeight: 0,
			blockHash: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2",
			summary: "The Litecoin genesis block.",
			alertBodyHtml: "This is the first block in the Litecoin blockchain.",
			referenceUrl: "https://medium.com/@SatoshiLite/satoshilite-1e2dad89a017"
		},
		{
			type: "tx",
			date: "2017-05-10",
			txid: "ce385e55fb2a73fa438426145b074f08314812fa3396472dc572b3079e26e0f9",
			summary: "First SegWit transaction.",
			referenceUrl: "https://twitter.com/satoshilite/status/862345830082138113"
		},
		{
			type: "blockheight",
			date: "2011-10-13",
			blockHeight: 448,
			blockHash: "6995d69ce2cb7768ef27f55e02dd1772d452deb44e1716bb1dd9c29409edf252",
			summary: "The first block containing a (non-coinbase) transaction.",
			referenceUrl: ""
		},
		{
			type: "link",
			date: "2016-05-02",
			url: "/rpc-browser?method=verifymessage&args%5B0%5D=Ler4HNAEfwYhBmGXcFP2Po1NpRUEiK8km2&args%5B1%5D=G7W57QZ1jevRhBp7SajpcUgJiGs998R4AdBjcIgJq5BOECh4jHNatZKCFLQeo9PvZLf60ykR32XjT4IrUi9PtCU%3D&args%5B2%5D=I%2C+Charlie+Lee%2C+am+the+creator+of+Litecoin&execute=Execute",
			summary: "Litecoin's Proof-of-Creator",
			referenceUrl: "https://medium.com/@SatoshiLite/satoshilite-1e2dad89a017"
		}
	],
	exchangeRateData:{
		jsonUrl:"https://api.coinmarketcap.com/v1/ticker/Litecoin/",
		exchangedCurrencyName:"usd",
		responseBodySelectorFunction:function(responseBody) {
			if (responseBody[0] && responseBody[0].price_usd) {
				return {"usd":responseBody[0].price_usd};
			}
			
			return null;
		}
	},
	blockRewardFunction:function(blockHeight) {
		var eras = [ new Decimal8(50) ];
		for (var i = 1; i < 34; i++) {
			var previous = eras[i - 1];
			eras.push(new Decimal8(previous).dividedBy(2));
		}

		var index = Math.floor(blockHeight / 840000);

		return eras[index];
	}
};