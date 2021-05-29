module.exports = {
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
			"desc":"Returns the current supply of Bitcoin. An estimate using a checkpoint can be returned in 2 cases: on 'slow' devices, and before the UTXO set summary is loaded.",
			"returnType":"number"
		},




		// mining
		{
			"category":"mining",
			"url":"/api/mining/hashrate",
			"desc":"Returns the network hash rate, estimated over the last 1, 7, and 30 days.",
			"returnType":"json",
			"example": {"1Day":174.1,"7Day":165.9,"30Day":158.5, "unit":"exa"}
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
			"desc":"Returns the number of transactions in Bitcoin Core's mempool.",
			"returnType":"integer"
		},

		{
			"category":"mempool",
			"url":"/api/mempool/fees",
			"desc":"Returns recommended fee rates in sats/vB for next block, ~30 min, 1 hr, and 1 day.",
			"returnType":"json",
			"example": {"nextBlock":17,"30min":9,"60min":9,"1day":9}
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
			"desc":"Returns the market cap of Bitcoin, in one of USD, EUR, GBP, XAU",
			"params":[{name: "currency", "options": ["usd", "eur", "gbp", "xau"]}],
			"returnType":"number",
			"testUrl": "/api/price/usd/marketcap"
		},

		{
			"category":"price",
			"url":"/api/price/:currency/sats",
			"desc":"Returns the price of 1 unit in 'currency' (e.g. $1) in satoshis",
			"params":[{name: "currency", "options": ["usd", "eur", "gbp", "xau"]}],
			"returnType":"number",
			"testUrl": "/api/price/usd/sats"
		},




		// fun
		{
			"category":"fun",
			"url":"/api/fun/quote",
			"desc":"Returns a random Bitcoin quote from a curated list.",
			"returnType":"json"
		},

		{
			"category":"fun",
			"url":"/api/fun/allquotes",
			"desc":"Returns a curated list of Bitcoin quotes.",
			"returnType":"json"
		},

	]
}