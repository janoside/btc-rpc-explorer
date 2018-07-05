var credentials = require("./credentials.js");

module.exports = {
	cookiePassword: "0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
	demoSite: true,
	coin: "BTC",

	rpcBlacklist:[
		"stop",
		"savemempool",
		"addnode",
		"disconnectnode",
		"dumpprivkey",
		"dumpwallet",
		"setban",
		"setnetworkactive",
		"lockunspent",
		"move",
		"removeprunedfunds",
		"rescanblockchain",
		"encryptwallet",
		"backupwallet",
		"importwallet",
		"walletlock",
		"walletpassphrase",
		"walletpassphrasechange"
	],

	site: {
		blockTxPageSize:20,
		browseBlocksPageSize:20
	},

	credentials: credentials,

	// Edit "ipWhitelistForRpcCommands" regex to limit access to RPC Browser / Terminal to matching IPs
	ipWhitelistForRpcCommands:/^(127\.0\.0\.1)?(\:\:1)?$/,

	googleAnalyticsTrackingId:"",
	sentryUrl:"",

	donationAddresses:{
		coins:["BTC", "LTC"],

		"BTC":{address:"3NPGpNyLLmVKCEcuipBs7G4KpQJoJXjDGe", urlPrefix:"bitcoin:"},
		"LTC":{address:"ME4pXiXuWfEi1ANBDo9irUJVcZBhsTx14i", urlPrefix:"litecoin:"}
	},

	headerDropdownLinks: {
		title:"Related Tools",
		links:[
			{name: "Bitcoin Explorer", url:"https://btc.chaintools.io", imgUrl:"/img/logo/btc.svg"},
			{name: "Litecoin Explorer", url:"https://ltc.chaintools.io", imgUrl:"/img/logo/ltc.svg"},
			{name: "Lightning Explorer", url:"https://lightning.chaintools.io", imgUrl:"/img/logo/lightning.svg"},
		]
	}
};
