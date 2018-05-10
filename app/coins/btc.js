var Decimal = require("decimal.js");
Decimal8 = Decimal.clone({ precision:8, rounding:8 });

module.exports = {
	name:"Bitcoin",
	logoUrl:"/img/logo/btc.svg",
	siteTitle:"Bitcoin Explorer",
	siteDescriptionHtml:"<b>BTC Explorer</b> is <a href='https://github.com/janoside/btc-rpc-explorer). If you run your own [Bitcoin Full Node](https://bitcoin.org/en/full-node), **BTC Explorer** can easily run alongside it, communicating via RPC calls. See the project [ReadMe](https://github.com/janoside/btc-rpc-explorer) for a list of features and instructions for running.",
	nodeTitle:"Bitcoin Full Node",
	nodeUrl:"https://bitcoin.org/en/full-node",
	currencyUnits:[
		{
			name:"BTC",
			multiplier:1,
			default:true,
			values:["", "btc", "BTC"],
			decimalPlaces:8
		},
		{
			name:"mBTC",
			multiplier:1000,
			values:["mbtc"],
			decimalPlaces:5
		},
		{
			name:"bits",
			multiplier:1000000,
			values:["bits"],
			decimalPlaces:2
		},
		{
			name:"sat",
			multiplier:100000000,
			values:["sat"],
			decimalPlaces:0
		}
	],
	genesisBlockHash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
	genesisCoinbaseTransactionId: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
	genesisCoinbaseTransaction: {
		"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0804ffff001d02fd04ffffffff0100f2052a01000000434104f5eeb2b10c944c6b9fbcfff94c35bdeecd93df977882babc7f3a2cf7f5c81d3b09a68db7f0e04f21de5d4230e75e6dbe7ad16eefe0d4325a62067dc6f369446aac00000000",
		"txid": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
		"hash": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
		"size": 204,
		"vsize": 204,
		"version": 1,
		"confirmations":475000,
		"vin": [
			{
				"coinbase": "04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73",
				"sequence": 4294967295
			}
		],
		"vout": [
			{
				"value": 50,
				"n": 0,
				"scriptPubKey": {
					"asm": "04f5eeb2b10c944c6b9fbcfff94c35bdeecd93df977882babc7f3a2cf7f5c81d3b09a68db7f0e04f21de5d4230e75e6dbe7ad16eefe0d4325a62067dc6f369446a OP_CHECKSIG",
					"hex": "4104f5eeb2b10c944c6b9fbcfff94c35bdeecd93df977882babc7f3a2cf7f5c81d3b09a68db7f0e04f21de5d4230e75e6dbe7ad16eefe0d4325a62067dc6f369446aac",
					"reqSigs": 1,
					"type": "pubkey",
					"addresses": [
						"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
					]
				}
			}
		],
		"blockhash": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
		"time": 1230988505,
		"blocktime": 1230988505
	},
	specialBlocks:{
		"000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f":{
			"noteTitle":"Bitcoin Genesis Block",
			"noteBodyHtml":"This is the first block in the Bitcoin blockchain. This block was mined by Bitcoin's anonymous/pseudonymous creator Satoshi Nakamoto. If you're interested, you can <a href='https://en.bitcoin.it/wiki/Genesis_block'>read more about the genesis block</a>."
		}
	},
	specialTransactions:{
		"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b":{
			"noteTitle":"This transaction doesn't really exist!",
			"noteBodyHtml":"This is the coinbase transaction of the <a href='/block/000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'>Bitcoin Genesis Block</a>. For more background about this special-case transaction, you can read <a href='https://github.com/bitcoin/bitcoin/issues/3303'>this brief discussion</a> among some of the <a href='https://bitcoin.org'>Bitcoin</a> developers."
		}
	},
	historicalData: [
		{
			type: "block",
			date: "2009-01-03",
			blockHash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
			note: "The bitcoin genesis block.",
			referenceUrl: "https://en.bitcoin.it/wiki/Genesis_block"
		},
		{
			type: "tx",
			date: "2009-01-03",
			txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
			note: "The coinbase transaction of the genesis block.",
			referenceUrl: "https://github.com/bitcoin/bitcoin/issues/3303"
		},
		{
			type: "tx",
			date: "2009-10-12",
			txid: "7dff938918f07619abd38e4510890396b1cef4fbeca154fb7aafba8843295ea2",
			note: "First bitcoin traded for fiat currency.",
			referenceUrl: "https://twitter.com/marttimalmi/status/423455561703624704"
		},
		{
			type: "block",
			date: "2017-08-24",
			blockHash: "0000000000000000001c8018d9cb3b742ef25114f27563e3fc4a1902167f9893",
			note: "First SegWit block.",
			referenceUrl: "https://twitter.com/conio/status/900722226911219712"
		},
		{
			type: "tx",
			date: "2017-08-24",
			txid: "8f907925d2ebe48765103e6845C06f1f2bb77c6adc1cc002865865eb5cfd5c1c",
			note: "First SegWit transaction.",
			referenceUrl: "https://twitter.com/KHS9NE/status/900553902923362304"
		},
		{
			type: "tx",
			date: "2014-06-16",
			txid: "143a3d7e7599557f9d63e7f224f34d33e9251b2c23c38f95631b3a54de53f024",
			note: "Star Wars: A New Hope",
			referenceUrl: ""
		},
		{
			type: "tx",
			date: "2010-05-22",
			txid: "a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d",
			note: "The 'Bitcoin Pizza' transaction.",
			referenceUrl: "https://bitcointalk.org/index.php?topic=137.0"
		},
		{
			type: "tx",
			date: "2011-05-18",
			txid: "5d80a29be1609db91658b401f85921a86ab4755969729b65257651bb9fd2c10d",
			note: "Destroyed bitcoin.",
			referenceUrl: "https://www.reddit.com/r/Bitcoin/comments/7mhoks/til_in_2011_a_user_running_a_modified_mining/"
		},
		{
			type: "block",
			date: "2009-01-12",
			blockHash: "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee",
			note: "First block containing a (non-coinbase) transaction.",
			referenceUrl: "https://bitcointalk.org/index.php?topic=91806.msg1012234#msg1012234"
		},
		{
			type: "block",
			date: "2017-08-25",
			blockHash: "00000000000000000139cb443e16442fcd07a4a0e0788dd045ee3cf268982016",
			note: "First block mined that was greater than 1MB.",
			referenceUrl: "https://en.bit.news/bitfury-mined-first-segwit-block-size-1-mb/"
		}
	],
	exchangeRateData:{
		jsonUrl:"https://api.coinmarketcap.com/v1/ticker/Bitcoin/",
		exchangedCurrencyName:"usd",
		responseBodySelectorFunction:function(responseBody) {
			if (responseBody[0] && responseBody[0].price_usd) {
				return responseBody[0].price_usd;
			}
			
			return -1;
		}
	},
	blockRewardFunction:function(blockHeight) {
		var eras = [ new Decimal8(50) ];
		for (var i = 1; i < 34; i++) {
			var previous = eras[i - 1];
			eras.push(new Decimal8(previous).dividedBy(2));
		}

		var index = Math.floor(blockHeight / 210000);

		return eras[index];
	}
};