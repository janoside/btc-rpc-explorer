"use strict";

const Decimal = require("decimal.js");
const Decimal8 = Decimal.clone({ precision:8, rounding:8 });

const btcFun = require("./btcFun.js");

const blockRewardEras = [ new Decimal8(50) ];
for (let i = 1; i < 34; i++) {
	let previous = blockRewardEras[i - 1];
	blockRewardEras.push(new Decimal8(previous).dividedBy(2));
}

const currencyUnits = [
	{
		type:"native",
		name:"BTC",
		multiplier:1,
		default:true,
		values:["", "btc", "BTC"],
		decimalPlaces:8
	},
	{
		type:"native",
		name:"mBTC",
		multiplier:1000,
		values:["mbtc"],
		decimalPlaces:5
	},
	{
		type:"native",
		name:"bits",
		multiplier:1000000,
		values:["bits"],
		decimalPlaces:2
	},
	{
		type:"native",
		name:"sat",
		multiplier:100000000,
		values:["sat", "satoshi"],
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
	name:"Bitcoin",
	ticker:"BTC",
	logoUrlsByNetwork:{
		"main":"./img/network-mainnet/logo.svg",
		"test":"./img/network-testnet/logo.svg",
		"testnet4":"./img/network-testnet/logo.svg",
		"regtest":"./img/network-regtest/logo.svg",
		"signet":"./img/network-signet/logo.svg"
	},
	coinIconUrlsByNetwork:{
		"main":"./img/network-mainnet/coin-icon.svg",
		"test":"./img/network-testnet/coin-icon.svg",
		"testnet4":"./img/network-testnet/coin-icon.svg",
		"signet":"./img/network-signet/coin-icon.svg",
		"regtest":"./img/network-regtest/coin-icon.svg"
	},
	coinColorsByNetwork: {
		"main": "#F7931A",
		"test": "#8f9a22",
		"testnet4": "#1daf00",
		"signet": "#af008c",
		"regtest": "#777"
	},
	siteTitlesByNetwork: {
		"main":"Bitcoin Explorer",
		"test":"Testnet3 Explorer",
		"testnet4":"Testnet4 Explorer",
		"regtest":"Regtest Explorer",
		"signet":"Signet Explorer",
	},
	demoSiteUrlsByNetwork: {
		"main": "https://bitcoinexplorer.org",
		"test": "https://testnet.bitcoinexplorer.org",
		"testnet4": "https://testnet.bitcoinexplorer.org",
		"signet": "https://signet.bitcoinexplorer.org",
	},
	knownTransactionsByNetwork: {
		main: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
		test: "22e7e860660f368b5c653c272b0445a0625d19fdec02fc158ef9800a5c3a07e8",
		signet: "39332e10af6fe491e8ae4ba1e2dd674698fedf8aa3c8c42bf71572debc1bb5b9"
	},
	miningPoolsConfigUrls:[
		"https://raw.githubusercontent.com/btc21/Bitcoin-Known-Miners/master/miners.json",
		"https://raw.githubusercontent.com/bitcoin-data/mining-pools/generated/pools.json",
		"https://raw.githubusercontent.com/btccom/Blockchain-Known-Pools/master/pools.json",
		"https://raw.githubusercontent.com/blockchain/Blockchain-Known-Pools/master/pools.json"
	],
	maxBlockWeight: 4000000,
	maxBlockSize: 1000000,
	minTxBytes: 166, // ref: https://en.bitcoin.it/wiki/Maximum_transaction_rate
	minTxWeight: 166 * 4, // hack
	difficultyAdjustmentBlockCount: 2016,
	maxSupplyByNetwork: {
		"main": new Decimal(20999817.31308491), // ref: https://bitcoin.stackexchange.com/a/38998
		"test": new Decimal(21000000),
		"testnet4": new Decimal(21000000),
		"regtest": new Decimal(21000000),
		"signet": new Decimal(21000000)
	},
	targetBlockTimeSeconds: 600,
	targetBlockTimeMinutes: 10,
	currencyUnits:currencyUnits,
	currencyUnitsByName:{"BTC":currencyUnits[0], "mBTC":currencyUnits[1], "bits":currencyUnits[2], "sat":currencyUnits[3]},
	baseCurrencyUnit:currencyUnits[3],
	defaultCurrencyUnit:currencyUnits[0],
	feeSatoshiPerByteBucketMaxima: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100, 150],
	
	halvingBlockIntervalsByNetwork: {
		"main": 210000,
		"test": 210000,
		"testnet4": 210000,
		"regtest": 150,
		"signet": 210000
	},

	terminalHalvingCountByNetwork: {
		"main": 32,
		"test": 32,
		"testnet4": 32,
		"regtest": 32,
		"signet": 32
	},

	// used for supply estimates that don't need full gettxoutset accuracy
	coinSupplyCheckpointsByNetwork: {
		"main": [ 675046, new Decimal(18656332.38) ],
		"test": [ 1940614, new Decimal(20963051.112) ],
		"signet": [ 29472, new Decimal(1473600) ],
		"regtest": [ 0, new Decimal(0) ]
	},

	utxoSetCheckpointsByNetwork: {
		// this includes values from running gettxoutsetinfo with both "muhash" and "hash_serialized_2" params
		"main": {
			// "muhash"
			"height": 784796,
			"bestblock": "000000000000000000026ac332dc8ba0d425b844520acc808af88aac52748281",
			"txouts": 87769791,
			"bogosize": 6562752541,
			"muhash": "90dc87ec3d3dc46a9883f1ce675cc8bcc3e6697c6c1dbb8665c192af35144099",
			"total_amount": "19342261.957857",
			"total_unspendable_amount": "219.292143",

			// "hash_serialized_2"
			"transactions": 52250541,
			"disk_size": 5367051020,
			"hash_serialized_2": "89afe21688f3a2cc01ef837c2b0454d4039830433d49c264856b2578eff2d62b",

			"lastUpdated": 1681140656788
		}
	},

	genesisBlockHashesByNetwork:{
		"main":	"000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
		"test":	"000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943",
		"testnet4": "00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043",
		"regtest": "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
		"signet":  "00000008819873e925422c1ff0f99f7cc9bbb232af63a077a480a3633bee1ef6",
	},
	genesisCoinbaseTransactionIdsByNetwork: {
		"main":	"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
		"test":	"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
		"testnet4": "7aa0a7ae1e223414cb807e40cd57e667b718e42aaf9306db9102fe28912b7b4e",
		"regtest": "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
		"signet":  "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
	},
	genesisCoinbaseTransactionsByNetwork:{
		"main": {
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
		"test": {
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
						"reqSigs": 1,
						"type": "pubkey",
						"addresses": [
							"mpXwg4jMtRhuSpVq4xS3HFHmCmWp9NyGKt"
						]
					}
				}
			],
			"blockhash": "000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943",
			"time": 1296688602,
			"blocktime": 1296688602
		},
		"testnet4": {
			"hex": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5504ffff001d01044c4c30332f4d61792f323032342030303030303030303030303030303030303030303165626435386332343439373062336161396437383362623030313031316662653865613865393865303065ffffffff0100f2052a010000002321000000000000000000000000000000000000000000000000000000000000000000ac00000000",
			"txid": "7aa0a7ae1e223414cb807e40cd57e667b718e42aaf9306db9102fe28912b7b4e",
			"hash": "7aa0a7ae1e223414cb807e40cd57e667b718e42aaf9306db9102fe28912b7b4e",
			"version": 1,
			"size": 180,
			"vsize": 180,
			"weight": 720,
			"locktime": 0,
			"vin": [
				{
					"coinbase": "04ffff001d01044c4c30332f4d61792f323032342030303030303030303030303030303030303030303165626435386332343439373062336161396437383362623030313031316662653865613865393865303065",
					"sequence": 4294967295
				}
			],
			"vout": [
				{
					"value": 50.00000000,
					"n": 0,
					"scriptPubKey": {
						"asm": "000000000000000000000000000000000000000000000000000000000000000000 OP_CHECKSIG",
						"desc": "raw(21000000000000000000000000000000000000000000000000000000000000000000ac)#8erpcjk9",
						"hex": "21000000000000000000000000000000000000000000000000000000000000000000ac",
						"type": "nonstandard"
					}
				}
			],
			"blockhash": "00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043",
			"time": 1714777860,
			"blocktime": 1714777860
		},
		"regtest": {
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
			"blockhash": "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
			"time": 1296688602,
			"blocktime": 1296688602
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
			"blockhash": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
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
			"mediantime": 1231006505,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1231006505,
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
			"blockhash": "000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943",
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
		"testnet4": {
			"avgfee": 0,
			"avgfeerate": 0,
			"avgtxsize": 0,
			"blockhash": "00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043",
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
			"mediantime": 1714777860,
			"mediantxsize": 0,
			"minfee": 0,
			"minfeerate": 0,
			"mintxsize": 0,
			"outs": 1,
			"subsidy": 5000000000,
			"swtotal_size": 0,
			"swtotal_weight": 0,
			"swtxs": 0,
			"time": 1714777860,
			"total_out": 0,
			"total_size": 0,
			"total_weight": 0,
			"totalfee": 0,
			"txs": 1,
			"utxo_increase": 1,
			"utxo_size_inc": 85,
			"utxo_increase_actual": 0,
			"utxo_size_inc_actual": 0
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
			"634b57cf0673c50b98560dbdf48d0a8633303b5d9162175e08b304df159c259e" : {
				blockHeight: 694670, blockHash: "0000000000000000000ba61d43854a2460b219b5281db2c731ae03a4347eaf43"
			},
			"f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16" : {
				blockHeight: 170, blockHash: "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee"
			},
			"a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d" : {
				blockHeight: 57043, blockHash: "00000000152340ca42227603908689183edc47355204e7aca59383b0aaac1fd8"
			},
			"7b6e490670a5cfcc9b66d8aab142ac2e9b489ae7f40cadadfc69c19878ae81b0" : {
				blockHeight: 227835, blockHash: "00000000000001aa077d7aa84c532a4d69bdbff519609d1da0835261b7a74eb6"
			},
			"8f7f13d6b56ea9013f13d298bc0e9e9f4f9825f3e7fd96083a564b10b01025d9" : {
				blockHeight: 694521, blockHash: "00000000000000000009974b5f6011d7ec8af460dafcc668c7ede4324896b9ca"
			},
			"3215f4a32a26938ddf9eeb4de7f5f42e751410876500f6e93d943abb2c3cccc4" : {
				blockHeight: 694521, blockHash: "00000000000000000009974b5f6011d7ec8af460dafcc668c7ede4324896b9ca"
			},
			"333d5f27c6fc2d07ef8c19e17d33568706bc3d6875198aba6cff0a996698d46e" : {
				blockHeight: 694521, blockHash: "00000000000000000009974b5f6011d7ec8af460dafcc668c7ede4324896b9ca"
			},
			"a9ceb47b092f703c30b29cb8b864fb8fa895a5999b24aa56ae08a967b643087c" : {
				blockHeight: 694521, blockHash: "00000000000000000009974b5f6011d7ec8af460dafcc668c7ede4324896b9ca"
			},
			"bc968c93c6ff39f022f974504a22d548902fe5a8c4fb294f052f845e4c388fcb" : {
				blockHeight: 694521, blockHash: "00000000000000000009974b5f6011d7ec8af460dafcc668c7ede4324896b9ca"
			},
			"e4bd7949cbf067d17629a5f588bba051b4436d29b5978d674118539356745bd0" : {
				blockHeight: 227835, blockHash: "00000000000001aa077d7aa84c532a4d69bdbff519609d1da0835261b7a74eb6"
			},
			"54e48e5f5c656b26c3bca14a8c95aa583d07ebe84dde3b7dd4a78f4e4186e713" : {
				blockHeight: 230009, blockHash: "00000000000000ecbbff6bafb7efa2f7df05b227d5c73dca8f2635af32a2e949"
			},
			"d29c9c0e8e4d2a9790922af73f0b8d51f0bd4bb19940d9cf910ead8fbe85bc9b" : {
				blockHeight: 268060, blockHash: "000000000000000743aee48cf264e1aa4a05fc3018677be3c1bdbd2429ffeede"
			},
			"143a3d7e7599557f9d63e7f224f34d33e9251b2c23c38f95631b3a54de53f024" : {
				blockHeight: 306204, blockHash: "000000000000000038dea6f503ed3593b1495e135d9ed646c2ebb97a1ff35bd7"
			},
			"8f907925d2ebe48765103e6845c06f1f2bb77c6adc1cc002865865eb5cfd5c1c" : {
				blockHeight: 481824, blockHash: "0000000000000000001c8018d9cb3b742ef25114f27563e3fc4a1902167f9893"
			},
			"8f5834d39a634c1b4c6283b546e16e931cb34d28570c77860de1a86256c4344d" : {
				blockHeight: 629999, blockHash: "0000000000000000000d656be18bb095db1b23bd797266b0ac3ba720b1962b1e"
			},
			"7836d12e741ffc6e50dba9b461e117cfbe444e7daa73df648b3a441d5a9ee958" : {
				blockHeight: 230009, blockHash: "00000000000000ecbbff6bafb7efa2f7df05b227d5c73dca8f2635af32a2e949"
			},
			"29a3efd3ef04f9153d47a990bd7b048a4b2d213daaa5fb8ed670fb85f13bdbcf" : {
				blockHeight: 153509, blockHash: "00000000000000fb62bbadc0a9dcda556925b2d0c1ad8634253ac2e83ab8382f"
			},
			"fe28050b93faea61fa88c4c630f0e1f0a1c24d0082dd0e10d369e13212128f33" : {
				blockHeight: 1000, blockHash: "00000000c937983704a73af28acdec37b049d214adbda81d7e2a3dd146f6ed09"
			},
			"b10c007c60e14f9d087e0291d4d0c7869697c6681d979c6639dbd960792b4d41" : {
				blockHeight: 692261, blockHash: "0000000000000000000f14c35b2d841e986ab5441de8c585d5ffe55ea1e395ad"
			},
			"777c998695de4b7ecec54c058c73b2cab71184cf1655840935cd9388923dc288" : {
				blockHeight: 709632, blockHash: "0000000000000000000687bca986194dc2c1f949318629b44bb54ec0a94d8244"
			},
			"b53e3bc5edbb41b34a963ecf67eb045266cf841cab73a780940ce6845377f141" : {
				blockHeight: 608548, blockHash: "00000000000000000009cf4a72b39c634586e6e328365f0d7293964111148094"
			}
		}
	},
	genesisCoinbaseOutputAddressScripthash:"8b01df4e368ea28f8dc0423bcf7a4923e3a12d307c875e47a0cfbf90b5c39161",
	historicalData: btcFun.items,
	exchangeRateData:{
		jsonUrl:"https://api.coindesk.com/v1/bpi/currentprice.json",
		responseBodySelectorFunction:function(responseBody) {
			//console.log("Exchange Rate Response: " + JSON.stringify(responseBody));

			var exchangedCurrencies = ["USD", "GBP", "EUR"];

			if (responseBody.bpi) {
				var exchangeRates = {};

				for (var i = 0; i < exchangedCurrencies.length; i++) {
					if (responseBody.bpi[exchangedCurrencies[i]]) {
						exchangeRates[exchangedCurrencies[i].toLowerCase()] = responseBody.bpi[exchangedCurrencies[i]].rate_float;
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
	blockRewardFunction:function(blockHeight, chain) {
		let halvingBlockInterval = (chain == "regtest" ? 150 : 210000);
		let index = Math.floor(blockHeight / halvingBlockInterval);

		return blockRewardEras[index];
	}
};
