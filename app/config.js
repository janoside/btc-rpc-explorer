var credentials = require("./credentials.js");
var coins = require("./coins.js");

var currentCoin = "BSV";

module.exports = {
	cookiePassword: "0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
	demoSite: false,
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
		// set host & port of electrum servers to connect to
		// protocol can be "tls" or "tcp", it defaults to "tcp" if port is 50001 and "tls" otherwise
		{host: "sv1.hsmiths.com", port:60004, protocol: "ssl"},
	    {host: "satoshi.vision.cash", port:50002, protocol: "ssl"},
		// {host: "electrum.qtornado.com", port:50001, protocol: "tcp"},
		// {host: "electrum.coinucopia.io", port:50001, protocol: "tcp"},

	],

	site: {
		blockTxPageSize:10,
		addressTxPageSize:10,
		txMaxInput:10,
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

		{name:"Notifications", url:"/notifications", desc:"Get notifications on slack, twitter, telegram...", fontawesome:"fas fa-bullhorn"},

		// {name:"RPC Browser", url:"/rpc-browser", desc:"Browse the RPC functionality of this node. See docs and execute commands.", fontawesome:"fas fa-book"},
		// {name:"RPC Terminal", url:"/rpc-terminal", desc:"Directly execute RPCs against this node.", fontawesome:"fas fa-terminal"},
		// {name:(coins[currentCoin].name + " Fun"), url:"/fun", desc:"See fun/interesting historical blockchain data.", fontawesome:"fas fa-certificate"}

	],

	donationAddresses:{
		coins:["BSV"],
		sites:{"BSV":"https://whatsonchain.com"},

		"BSV":{address:"bitcoincash:qq7su5mghkkamjss3g87g3eejxf8f3excuekujtlev"},
	},

//	headerDropdownLinks: {
		// title:"Related Sites",
		// links:[
		// 	{name: "Bitcoin Explorer", url:"https://btc.chaintools.io", imgUrl:"/img/logo/btc.svg"},
		// 	{name: "Litecoin Explorer", url:"https://ltc.chaintools.io", imgUrl:"/img/logo/ltc.svg"},
		// 	{name: "Lightning Explorer", url:"https://lightning.chaintools.io", imgUrl:"/img/logo/lightning.svg"},
		// ]
//	}
};
