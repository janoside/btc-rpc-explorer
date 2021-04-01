"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:config");

const fs = require('fs');
const crypto = require('crypto');
const url = require('url');

let baseUrl = (process.env.BTCEXP_BASEURL || "/").trim();
if (!baseUrl.startsWith("/")) {
	baseUrl = "/" + baseUrl;
}
if (!baseUrl.endsWith("/")) {
	baseUrl += "/";
}

const coins = require("./coins.js");
const credentials = require("./credentials.js");

const currentCoin = process.env.BTCEXP_COIN || "BTC";
const defaultTheme = process.env.BTCEXP_UI_THEME || "dark";

const rpcCred = credentials.rpc;

if (rpcCred.cookie && !rpcCred.username && !rpcCred.password && fs.existsSync(rpcCred.cookie)) {
	console.log(`Loading RPC cookie file: ${rpcCred.cookie}`);
	
	[ rpcCred.username, rpcCred.password ] = fs.readFileSync(rpcCred.cookie).toString().split(':', 2);
	
	if (!rpcCred.password) {
		throw new Error(`Cookie file ${rpcCred.cookie} in unexpected format`);
	}
}

const cookieSecret = process.env.BTCEXP_COOKIE_SECRET
 || (rpcCred.password && crypto.createHmac('sha256', JSON.stringify(rpcCred))
                               .update('btc-rpc-explorer-cookie-secret').digest('hex'))
 || "0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";


const electrumXServerUriStrings = (process.env.BTCEXP_ELECTRUMX_SERVERS || "").split(',').filter(Boolean);
const electrumXServers = [];
for (let i = 0; i < electrumXServerUriStrings.length; i++) {
	const uri = url.parse(electrumXServerUriStrings[i]);
	
	electrumXServers.push({protocol:uri.protocol.substring(0, uri.protocol.length - 1), host:uri.hostname, port:parseInt(uri.port)});
}

// default=false env vars
[
	"BTCEXP_DEMO",
	"BTCEXP_PRIVACY_MODE",
	"BTCEXP_NO_INMEMORY_RPC_CACHE",
	"BTCEXP_RPC_ALLOWALL",
	"BTCEXP_ELECTRUM_TXINDEX",

].forEach(function(item) {
	if (process.env[item] === undefined) {
		process.env[item] = "false";

		debugLog(`Config(default): ${item}=false`)
	}
});


// default=true env vars
[
	"BTCEXP_NO_RATES",
	"BTCEXP_SLOW_DEVICE_MODE"

].forEach(function(item) {
	if (process.env[item] === undefined) {
		process.env[item] = "true";

		debugLog(`Config(default): ${item}=true`)
	}
});

const slowDeviceMode = (process.env.BTCEXP_SLOW_DEVICE_MODE.toLowerCase() == "true");

module.exports = {
	host: process.env.BTCEXP_HOST || "127.0.0.1",
	port: process.env.PORT || process.env.BTCEXP_PORT || 3002,

	baseUrl: baseUrl,

	coin: currentCoin,
	defaultTheme: defaultTheme,

	cookieSecret: cookieSecret,

	privacyMode: (process.env.BTCEXP_PRIVACY_MODE.toLowerCase() == "true"),
	slowDeviceMode: slowDeviceMode,
	demoSite: (process.env.BTCEXP_DEMO.toLowerCase() == "true"),
	queryExchangeRates: (process.env.BTCEXP_NO_RATES.toLowerCase() != "true"),
	noInmemoryRpcCache: (process.env.BTCEXP_NO_INMEMORY_RPC_CACHE.toLowerCase() == "true"),
	
	rpcConcurrency: (process.env.BTCEXP_RPC_CONCURRENCY || 10),

	noTxIndexSearchDepth: (+process.env.BTCEXP_NOTXINDEX_SEARCH_DEPTH || 3),

	rpcBlacklist:
	  process.env.BTCEXP_RPC_ALLOWALL.toLowerCase() == "true"  ? []
	: process.env.BTCEXP_RPC_BLACKLIST ? process.env.BTCEXP_RPC_BLACKLIST.split(',').filter(Boolean)
	: [
		"addnode",
		"backupwallet",
		"bumpfee",
		"clearbanned",
		"createmultisig",
		"createwallet",
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
		"invalidateblock",
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
		"reconsiderblock",
		"removeprunedfunds",
		"rescanblockchain",
		"savemempool",
		"sendfrom",
		"sendmany",
		"sendtoaddress",
		"setaccount",
		"setban",
		"setmocktime",
		"setnetworkactive",
		"signmessage",
		"signmessagewithprivatekey",
		"signrawtransaction",
		"signrawtransactionwithkey",
		"stop",
		"submitblock",
		"syncwithvalidationinterfacequeue",
		"verifychain",
		"waitforblock",
		"waitforblockheight",
		"waitfornewblock",
		"walletlock",
		"walletpassphrase",
		"walletpassphrasechange",
	],

	addressApi:process.env.BTCEXP_ADDRESS_API,
	electrumTxIndex:process.env.BTCEXP_ELECTRUM_TXINDEX != "false",
	electrumXServers:electrumXServers,

	redisUrl:process.env.BTCEXP_REDIS_URL,

	site: {
		homepage:{
			recentBlocksCount: (process.env.BTCEXP_UI_HOME_PAGE_LATEST_BLOCKS_COUNT || (slowDeviceMode ? 5 : 10))
		},
		blockTxPageSize: (slowDeviceMode ? 10 : 20),
		addressTxPageSize: 10,
		txMaxInput: (slowDeviceMode ? 3 : 15),
		browseBlocksPageSize: (process.env.BTCEXP_UI_BLOCKS_PAGE_BLOCK_COUNT || (slowDeviceMode ? 10 : 0)),
		addressPage:{
			txOutputMaxDefaultDisplay:10
		},
		valueDisplayMaxLargeDigits: 4,
		prioritizedToolIdsList: [0, 10, 11, 9, 3, 4, 12, 2, 5, 1, 6, 7, 13, 8],
	},

	credentials: credentials,

	siteTools:[
	/* 0 */		{name:"Node Status", url:"./node-status", desc:"Summary of this node: version, network, uptime, etc.", fontawesome:"fas fa-broadcast-tower"},
	/* 1 */		{name:"Peers", url:"./peers", desc:"Detailed info about the peers connected to this node.", fontawesome:"fas fa-sitemap"},

	/* 2 */		{name:"Browse Blocks", url:"./blocks", desc:"Browse all blocks in the blockchain.", fontawesome:"fas fa-cubes"},
	/* 3 */		{name:"Transaction Stats", url:"./tx-stats", desc:"See graphs of total transaction volume and transaction rates.", fontawesome:"fas fa-chart-bar"},

	/* 4 */		{name:"Mempool Summary", url:"./mempool-summary", desc:"Detailed summary of the current mempool for this node.", fontawesome:"fas fa-receipt"},
	/* 5 */		{name:"Browse Mempool", url:"./mempool-tx", desc:"Browse unconfirmed/pending transactions.", fontawesome:"fas fa-unlock"},

	/* 6 */		{name:"RPC Browser", url:"./rpc-browser", desc:"Browse the RPC functionality of this node. See docs and execute commands.", fontawesome:"fas fa-book"},
	/* 7 */		{name:"RPC Terminal", url:"./rpc-terminal", desc:"Directly execute RPCs against this node.", fontawesome:"fas fa-terminal"},

	/* 8 */		{name:(coins[currentCoin].name + " Fun"), url:"./fun", desc:"See fun/interesting historical blockchain data.", fontawesome:"fas fa-flag"},

	/* 9 */		{name:"Mining Summary", url:"./mining-summary", desc:"Summary of recent data about miners.", fontawesome:"fas fa-chart-pie"},
	/* 10 */	{name:"Block Stats", url:"./block-stats", desc:"Summary data for blocks in configurable range.", fontawesome:"fas fa-layer-group"},
	/* 11 */	{name:"Block Analysis", url:"./block-analysis", desc:"Summary analysis for all transactions in a block.", fontawesome:"fas fa-angle-double-down"},
	/* 12 */	{name:"Difficulty History", url:"./difficulty-history", desc:"Graph of difficulty changes over time.", fontawesome:"fas fa-chart-line"},

	/* 13 */	{name:"Whitepaper Extracter", url:"./bitcoin-whitepaper", desc:"Tool that extracts the Bitcoin whitepaper from data embedded in the blockchain.", fontawesome:"far fa-file-alt"},
	],

	donations:{
		addresses:{
			coins:["BTC"],
			sites:{"BTC":"https://explorer.btc21.org"}
		},
		btcpayserver:{
			host:"https://donate.btc21.org"
		}
	}
};

debugLog(`Config(final): privacyMode=${module.exports.privacyMode}`);
debugLog(`Config(final): slowDeviceMode=${module.exports.slowDeviceMode}`);
debugLog(`Config(final): demo=${module.exports.demoSite}`);
debugLog(`Config(final): rpcAllowAll=${module.exports.rpcBlacklist.length == 0}`);
