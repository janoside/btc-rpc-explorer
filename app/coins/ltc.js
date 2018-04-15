module.exports = {
	name:"Litecoin",
	logoUrl:"/img/logo/ltc.svg",
	siteTitle:"LTC Explorer",
	nodeTitle:"Litecoin Full Node",
	nodeUrl:"https://litecoin.org/",
	currencyUnits:[
		{
			name:"LTC",
			multiplier:1,
			default:true,
			values:["", "btc", "BTC"]
		},
		{
			name:"mLTC",
			multiplier:1000,
			values:["mltc"]
		}
	],
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
	specialBlocks:{
		"12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2":{
			"noteTitle":"Litecoin Genesis Block",
			"noteBodyHtml":"This is the first block in the Litecoin blockchain."
		}
	},
	specialTransactions:{
	},
	historicalData: [
		{
			type: "block",
			date: "2011-10-07",
			blockHash: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2",
			note: "The Litecoin genesis block.",
			referenceUrl: "https://medium.com/@SatoshiLite/satoshilite-1e2dad89a017"
		}
	]
};