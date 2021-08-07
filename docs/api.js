module.exports = {
	"version": "1.0.0",
	"routes":[
		// blocks
		{
			"category":"blocks",
			"url":"/api/block/:hash",
			"desc":"Returns the details of a block by hash.",
			"returnType":"json",
			"testUrl":"/api/block/0000000000000000001c8018d9cb3b742ef25114f27563e3fc4a1902167f9893"
		},

		{
			"category":"blocks",
			"url":"/api/block/:height",
			"desc":"Returns the details of a block by height.",
			"returnType":"json",
			"testUrl":"/api/block/123456"
		},

		{
			"category":"blocks",
			"url":"/api/blocks/tip/height",
			"desc":"Returns the height of the chain tip.",
			"returnType":"integer"
		},

		{
			"category":"blocks",
			"url":"/api/blocks/tip/hash",
			"desc":"Returns the block hash of the chain tip.",
			"returnType":"string"
		},




		// transactions
		{
			"category":"transactions",
			"url":"/api/tx/:txid",
			"desc":"Returns the details of a transaction.",
			"returnType":"json",
			"testUrl": "/api/tx/f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16"
		},



		// blockchain
		{
			"category":"blockchain",
			"url":"/api/blockchain/coins",
			"desc":"Returns the current supply of Groestlcoin. An estimate using a checkpoint can be returned in 2 cases: on 'slow' devices, and before the UTXO set summary is loaded.",
			"returnType":"number"
		},




		// mining
		{
			"category":"mining",
			"url":"/api/mining/hashrate",
			"desc":"Returns the network hash rate, estimated over the last 1, 7, 30, 90, and 365 days.",
			"returnType":"json"
		},

		{
			"category":"mining",
			"url":"/api/mining/diff-adj-estimate",
			"desc":"Returns the current estimate for the next difficulty adjustment as a percentage.",
			"returnType":"number"
		},



		// mempool
		{
			"category":"mempool",
			"url":"/api/mempool/count",
			"desc":"Returns the number of transactions in Groestlcoin Core's mempool.",
			"returnType":"integer"
		},

		{
			"category":"mempool",
			"url":"/api/mempool/fees",
			"desc":"Returns recommended fee rates in gros/vB for next block, ~30 min, 1 hr, and 1 day.",
			"returnType":"json",
			"example": {"nextBlock":17,"30min":9,"60min":9,"1day":9}
		},




		// util
		{
			"category":"util",
			"url":"/api/util/xyzpub/:extendedPubkey",
			"desc":"Returns details for the specified extended public key, including related keys and addresses.",
			"returnType":"json",
			"optionalParams": {"limit":"The number of addresses to return", "offset":"Offset into the list of addresses"},
			"testUrl": "/api/util/xyzpub/xpub6EuV33a2DXxAhoJTRTnr8qnysu81AA4YHpLY6o8NiGkEJ8KADJ35T64eJsStWsmRf1xXkEANVjXFXnaUKbRtFwuSPCLfDdZwYNZToh4LBCd"
		},



		// price
		{
			"category":"price",
			"url":"/api/price",
			"desc":"Returns the price of 1 BTC, in USD, EUR, GBP, and XAU",
			"returnType":"json"
		},

		{
			"category":"price",
			"url":"/api/price/:currency",
			"desc":"Returns the price of 1 BTC, in one of USD, EUR, GBP, XAU",
			"params":[{name: "currency", "options": ["usd", "eur", "gbp", "xau"]}],
			"returnType":"number",
			"testUrl": "/api/price/usd"
		},

		{
			"category":"price",
			"url":"/api/price/:currency/marketcap",
			"desc":"Returns the market cap of Groestlcoin, in one of USD, EUR, GBP, XAU",
			"params":[{name: "currency", "options": ["usd", "eur", "gbp", "xau"]}],
			"returnType":"number",
			"testUrl": "/api/price/usd/marketcap"
		},

		{
			"category":"price",
			"url":"/api/price/:currency/sats",
			"desc":"Returns the price of 1 unit in 'currency' (e.g. $1) in gros",
			"params":[{name: "currency", "options": ["usd", "eur", "gbp", "xau"]}],
			"returnType":"number",
			"testUrl": "/api/price/usd/sats"
		},




		// fun
		{
			"category":"fun",
			"url":"/api/quotes/all",
			"desc":"Returns the full curated list of Groestlcoin quotes.",
			"returnType":"json"
		},

		{
			"category":"fun",
			"url":"/api/quotes/:index",
			"desc":"Returns the Groestlcoin quote with the given index from the curated list.",
			"returnType":"json",
			"testUrl": "/api/quotes/0"
		},

		{
			"category":"fun",
			"url":"/api/quotes/random",
			"desc":"Returns a random Groestlcoin quote from the curated list.",
			"returnType":"json"
		},




		// admin
		{
			"category":"admin",
			"url":"/api/version",
			"desc":"Returns the semantic version of the public API, which is maintained separate from the app version.",
			"returnType":"string",
		},

	]
}
