module.exports = {
	cookiePassword: "0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
	demoSite: true,
	coin: "BTC",

	rpcBlacklist:[
		"stop",
		"savemempool",
		"addnode",
		"disconnectnode",
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

	// Edit "rpc" below to target your node.
	// You may delete this section if you wish to connect manually via the UI.

	rpc: {
		host: process.env.RPC_HOST,
		port: process.env.RPC_PORT,
		username: process.env.RPC_USER,
		password: process.env.RPC_PASSWORD
	},

	// Edit "ipWhitelistForRpcCommands" regex to limit access to RPC Browser / Terminal to matching IPs
	ipWhitelistForRpcCommands:/^(127\.0\.0\.1)?(\:\:1)?$/,

	googleAnalyticsTrackingId:"",
	sentryUrl:"",

	donationAddresses:{
		coins:["BTC", "LTC"],
		
		"BTC":{address:"3NPGpNyLLmVKCEcuipBs7G4KpQJoJXjDGe", urlPrefix:"bitcoin:"},
		"LTC":{address:"ME4pXiXuWfEi1ANBDo9irUJVcZBhsTx14i", urlPrefix:"litecoin:"}
	},
};
