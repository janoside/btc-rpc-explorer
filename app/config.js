var credentials = require("./credentials.js");
var coins = require("./coins.js");

var currentCoin = "BTC";

module.exports = {
	cookiePassword: "0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
	demoSite: true,
	coin: currentCoin,

	rpcBlacklist:[
		"addnode",
		"backupwallet",
		"bumpfee",
		"clearbanned",
		"createmultisig",
		"disconnectnode",
		"dumpprivkey",
		"dumpwallet",
		"encryptwallet",
		"generate",
		"generatetoaddress",
		"getaccountaddrss",
		"getaddressesbyaccount",
		"getbalance",
		"getnewaddress",
		"getrawchangeaddress",
		"getreceivedbyaccount",
		"getreceivedbyaddress",
		"gettransaction",
		"getunconfirmedbalance",
		"getwalletinfo",
		"importaddress",
		"importmulti",
		"importprivkey",
		"importprunedfunds",
		"importpubkey",
		"importwallet",
		"keypoolrefill",
		"listaccounts",
		"listaddressgroupings",
		"listlockunspent",
		"listreceivedbyaccount",
		"listreceivedbyaddress",
		"listsinceblock",
		"listtransactions",
		"listunspent",
		"listwallets",
		"lockunspent",
		"logging",
		"move",
		"preciousblock",
		"pruneblockchain",
		"removeprunedfunds",
		"rescanblockchain",
		"savemempool",
		"sendfrom",
		"sendmany",
		"sendtoaddress",
		"sendrawtransaction",
		"setaccount",
		"setban",
		"setnetworkactive",
		"signmessage",
		"signmessagewithprivatekey",
		"signrawtransaction",
		"stop",
		"submitblock",
		"verifychain",
		"walletlock",
		"walletpassphrase",
		"walletpassphrasechange",
	],

	// https://uasf.saltylemon.org/electrum
	electrumXServers:[
		// {host: "electrum.example.com", port:50002}, ...
		{ host: "127.0.0.1", port:50002 }
		// { host: "electrumx", port:50002 }
	],

	site: {
		blockTxPageSize:20,
		addressTxPageSize:20,
		txMaxInput:15,
		browseBlocksPageSize:20
	},

	credentials: credentials,

	// Edit "ipWhitelistForRpcCommands" regex to limit access to RPC Browser / Terminal to matching IPs
	ipWhitelistForRpcCommands:/^(127\.0\.0\.1)?(\:\:1)?$/,

	siteTools:[
		{name:"Node Status", url:"/node-status", desc:"Summary of this node: version, network, uptime, etc.", fontawesome:"fas fa-broadcast-tower"},
		{name:"Peers", url:"/peers", desc:"Detailed info about the peers connected to this node.", fontawesome:"fas fa-sitemap"},

		{name:"Browse Blocks", url:"/blocks", desc:"Browse all blocks in the blockchain.", fontawesome:"fas fa-cubes"},
		{name:"Transaction Stats", url:"/tx-stats", desc:"See graphs of total transaction volume and transaction rates.", fontawesome:"fas fa-chart-bar"},

		{name:"Mempool Summary", url:"/mempool-summary", desc:"Detailed summary of the current mempool for this node.", fontawesome:"fas fa-clipboard-list"},
		{name:"Unconfirmed Transactions", url:"/unconfirmed-tx", desc:"Browse unconfirmed/pending transactions.", fontawesome:"fas fa-unlock-alt"},

		{name:"RPC Browser", url:"/rpc-browser", desc:"Browse the RPC functionality of this node. See docs and execute commands.", fontawesome:"fas fa-book"},
		{name:"RPC Terminal", url:"/rpc-terminal", desc:"Directly execute RPCs against this node.", fontawesome:"fas fa-terminal"},
		
		{name:(coins[currentCoin].name + " Fun"), url:"/fun", desc:"See fun/interesting historical blockchain data.", fontawesome:"fas fa-certificate"}
	],

	donationAddresses:{
		coins:["BTC", "LTC"],
		sites:{"BTC":"https://explorer.goopen.si", "LTC":"https://ltc.chaintools.io"},

		"BTC":{address:"3QmhE7msgPgyoieCyoFapEzzRE5gp2cC9P"},
		"LTC":{address:"MSvBJDjv4eVqBA6seL29nXJ6hCzNpVVp9C"}
	},

	headerDropdownLinks: {
		title:"Related Sites",
		links:[
			{name: "Bitcoin Explorer", url:"https://explorer.goopen.si", imgUrl:"/img/logo/btc.svg"},
			{name: "Litecoin Explorer", url:"https://ltc.chaintools.io", imgUrl:"/img/logo/ltc.svg"},
			{name: "Lightning Explorer", url:"https://lightning.chaintools.io", imgUrl:"/img/logo/lightning.svg"},
		]
	}
};
