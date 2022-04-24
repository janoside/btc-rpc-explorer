"use strict";

const fs = require("fs");

const debug = require("debug");
const debugLog = debug("btcexp:utils");
const debugErrorLog = debug("btcexp:error");
const debugErrorVerboseLog = debug("btcexp:errorVerbose");

const Decimal = require("decimal.js");
const axios = require("axios");
const qrcode = require("qrcode");
const bs58check = require("bs58check");
const bip32 = require('bip32');
const bitcoinjs = require('bitcoinjs-lib');

const config = require("./config.js");
const coins = require("./coins.js");
const coinConfig = coins[config.coin];
const redisCache = require("./redisCache.js");
const statTracker = require("./statTracker.js");


const exponentScales = [
	{val:1000000000000000000000000000000000, name:"?", abbreviation:"V", exponent:"33"},
	{val:1000000000000000000000000000000, name:"?", abbreviation:"W", exponent:"30"},
	{val:1000000000000000000000000000, name:"?", abbreviation:"X", exponent:"27"},
	{val:1000000000000000000000000, name:"yotta", abbreviation:"Y", exponent:"24"},
	{val:1000000000000000000000, name:"zetta", abbreviation:"Z", exponent:"21"},
	{val:1000000000000000000, name:"exa", abbreviation:"E", exponent:"18"},
	{val:1000000000000000, name:"peta", abbreviation:"P", exponent:"15", textDesc:"Q"},
	{val:1000000000000, name:"tera", abbreviation:"T", exponent:"12", textDesc:"T"},
	{val:1000000000, name:"giga", abbreviation:"G", exponent:"9", textDesc:"B"},
	{val:1000000, name:"mega", abbreviation:"M", exponent:"6", textDesc:"M"},
	{val:1000, name:"kilo", abbreviation:"K", exponent:"3", textDesc:"thou"}
];

const crawlerBotUserAgentStrings = {
	"google": new RegExp("adsbot-google|Googlebot|mediapartners-google", "i"),
	"microsoft": new RegExp("Bingbot|bingpreview|msnbot", "i"),
	"yahoo": new RegExp("Slurp", "i"),
	"duckduckgo": new RegExp("DuckDuckBot", "i"),
	"baidu": new RegExp("Baidu", "i"),
	"yandex": new RegExp("YandexBot", "i"),
	"teoma": new RegExp("teoma", "i"),
	"sogou": new RegExp("Sogou", "i"),
	"exabot": new RegExp("Exabot", "i"),
	"facebook": new RegExp("facebot", "i"),
	"alexa": new RegExp("ia_archiver", "i"),
	"aol": new RegExp("aolbuild", "i"),
	"moz": new RegExp("dotbot", "i"),
	"semrush": new RegExp("SemrushBot", "i"),
	"majestic": new RegExp("MJ12bot", "i")
};

const ipMemoryCache = {};

let ipRedisCache = null;
if (redisCache.active) {
	const onRedisCacheEvent = function(cacheType, eventType, cacheKey) {
		global.cacheStats.redis[eventType]++;
		//debugLog(`cache.${cacheType}.${eventType}: ${cacheKey}`);
	}

	ipRedisCache = redisCache.createCache("v0", onRedisCacheEvent);
}

let ipMemoryCacheNewItems = false;
const ipCacheFile = `${config.filesystemCacheDir}/ip-address-cache.json`;

if (fs.existsSync(ipCacheFile)) {
	try {
		let rawData = fs.readFileSync(ipCacheFile);

		ipMemoryCache = JSON.parse(rawData);

		debugLog(`Loaded ip address cache (${rawData.length.toLocaleString()} bytes)`);

	} catch (err) {
		// failed to read cache file, delete it in case it's corrupted
		fs.unlinkSync(ipCacheFile);
	}
}

setInterval(() => {
	if (ipMemoryCacheNewItems) {
		try {
			if (!fs.existsSync(config.filesystemCacheDir)){
				fs.mkdirSync(config.filesystemCacheDir);
			}

			debugLog(`Saved updated ip address cache`);

			fs.writeFileSync(ipCacheFile, JSON.stringify(ipMemoryCache, null, 4));

		} catch (e) {
			utils.logError("24308tew7hgde", e);
		}

		ipMemoryCacheNewItems = false;
	}
}, 60000);

const ipCache = {
	get:function(key) {
		return new Promise(function(resolve, reject) {
			if (ipMemoryCache[key] != null) {
				resolve({key:key, value:ipMemoryCache[key]});

				return;
			}

			if (ipRedisCache != null) {
				ipRedisCache.get("ip-" + key).then(function(redisResult) {
					if (redisResult != null) {
						resolve({key:key, value:redisResult});

						return;
					}

					resolve({key:key, value:null});
				});

			} else {
				resolve({key:key, value:null});
			}
		});
	},
	set:function(key, value, expirationMillis) {
		ipMemoryCache[key] = value;

		ipMemoryCacheNewItems = true;

		if (ipRedisCache != null) {
			ipRedisCache.set("ip-" + key, value, expirationMillis);
		}
	}
};



function redirectToConnectPageIfNeeded(req, res) {
	if (!req.session.host) {
		req.session.redirectUrl = req.originalUrl;
		
		res.redirect("/");
		res.end();
		
		return true;
	}
	
	return false;
}

function formatHex(hex, outputFormat="utf8") {
	return Buffer.from(hex, "hex").toString(outputFormat);
}

function splitArrayIntoChunks(array, chunkSize) {
	var j = array.length;
	var chunks = [];
	
	for (var i = 0; i < j; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}

	return chunks;
}

function splitArrayIntoChunksByChunkCount(array, chunkCount) {
	var bigChunkSize = Math.ceil(array.length / chunkCount);
	var bigChunkCount = chunkCount - (chunkCount * bigChunkSize - array.length);

	var chunks = [];

	var chunkStart = 0;
	for (var chunk = 0; chunk < chunkCount; chunk++) {
		var chunkSize = (chunk < bigChunkCount ? bigChunkSize : (bigChunkSize - 1));

		chunks.push(array.slice(chunkStart, chunkStart + chunkSize));

		chunkStart += chunkSize;
	}

	return chunks;
}

function getRandomString(length, chars) {
	var mask = '';
	
	if (chars.indexOf('a') > -1) {
		mask += 'abcdefghijklmnopqrstuvwxyz';
	}
	
	if (chars.indexOf('A') > -1) {
		mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	}
	
	if (chars.indexOf('#') > -1) {
		mask += '0123456789';
	}
	
	if (chars.indexOf('!') > -1) {
		mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
	}
	
	var result = '';
	for (var i = length; i > 0; --i) {
		result += mask[Math.floor(Math.random() * mask.length)];
	}
	
	return result;
}

function formatCurrencyAmountWithForcedDecimalPlaces(amount, formatType, forcedDecimalPlaces) {
	formatType = formatType.toLowerCase();

	var currencyType = global.currencyTypes[formatType];

	if (currencyType == null) {
		throw `Unknown currency type: ${formatType}`;
	}

	var dec = new Decimal(amount);

	var decimalPlaces = currencyType.decimalPlaces;
	//if (decimalPlaces == 0 && dec < 1) {
	//	decimalPlaces = 5;
	//}

	if (forcedDecimalPlaces >= 0) {
		decimalPlaces = forcedDecimalPlaces;
	}

	if (currencyType.type == "native") {
		dec = dec.times(currencyType.multiplier);

		if (forcedDecimalPlaces >= 0) {
			// toFixed will keep trailing zeroes
			var baseStr = addThousandsSeparators(dec.toFixed(decimalPlaces));

			return {val:baseStr, currencyUnit:currencyType.name, simpleVal:baseStr, intVal:parseInt(dec)};

		} else {
			// toDP excludes trailing zeroes but doesn't "fix" numbers like 1e-8
			// instead, we use toFixed and manually strip trailing zeroes
			// old method is kept for reference since this is sensitive, high-volume code
			var baseStr = addThousandsSeparators(dec.toFixed(decimalPlaces).replace(/0+$/, "").replace(/\.$/, ""));
			//var baseStr = addThousandsSeparators(dec.toDP(decimalPlaces)); // old version, failed to properly format "1e-8" (left unchanged)

			var returnVal = {currencyUnit:currencyType.name, simpleVal:baseStr, intVal:parseInt(dec)};

			// max digits in "val"
			var maxValDigits = config.site.valueDisplayMaxLargeDigits;

			// todo: make this section locale-aware (don't hardcode ".")

			if (baseStr.indexOf(".") == -1) {
				returnVal.val = baseStr;
				
			} else {
				if (baseStr.length - baseStr.indexOf(".") - 1 > maxValDigits) {
					returnVal.val = baseStr.substring(0, baseStr.indexOf(".") + maxValDigits + 1);
					returnVal.lessSignificantDigits = baseStr.substring(baseStr.indexOf(".") + maxValDigits + 1);

				} else {
					returnVal.val = baseStr;
				}
			}

			return returnVal;
		}
	} else if (currencyType.type == "exchanged") {
		//console.log(JSON.stringify(global.exchangeRates) + " - " + currencyType.name);
		if (global.exchangeRates != null && global.exchangeRates[currencyType.id] != null) {
			dec = dec.times(global.exchangeRates[currencyType.id]);

			var baseStr = addThousandsSeparators(dec.toDecimalPlaces(decimalPlaces));

			return {val:baseStr, currencyUnit:currencyType.name, simpleVal:baseStr, intVal:parseInt(dec)};

		} else {
			return formatCurrencyAmountWithForcedDecimalPlaces(amount, coinConfig.defaultCurrencyUnit.name, forcedDecimalPlaces);
		}
	} else {
		throw `Unknown currency type: ${currencyType.type}`;
	}
}

function formatCurrencyAmount(amount, formatType) {
	return formatCurrencyAmountWithForcedDecimalPlaces(amount, formatType, -1);
}

function formatCurrencyAmountInSmallestUnits(amount, forcedDecimalPlaces) {
	return formatCurrencyAmountWithForcedDecimalPlaces(amount, coins[config.coin].baseCurrencyUnit.name, forcedDecimalPlaces);
}

// ref: https://stackoverflow.com/a/2901298/673828
function addThousandsSeparators(x) {
	var parts = x.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return parts.join(".");
}

function satoshisPerUnitOfLocalCurrency(localCurrency) {
	if (global.exchangeRates != null) {
		var exchangeType = localCurrency;

		if (!global.exchangeRates[localCurrency]) {
			// if current display currency is a native unit, default to USD for exchange values
			exchangeType = "usd";
		}

		var dec = new Decimal(1);
		var one = new Decimal(1);
		dec = dec.times(global.exchangeRates[exchangeType]);
		
		// USD/BTC -> BTC/USD
		dec = one.dividedBy(dec);

		var unitName = coins[config.coin].baseCurrencyUnit.name;
		var satCurrencyType = global.currencyTypes["sat"];
		var localCurrencyType = global.currencyTypes[localCurrency];

		// BTC/USD -> sat/USD
		dec = dec.times(satCurrencyType.multiplier);

		var exchangedAmt = parseInt(dec);

		return {amt:addThousandsSeparators(exchangedAmt),amtRaw:exchangedAmt, unit:`sat/${localCurrencyType.symbol}`}
	}

	return null;
}

function getExchangedCurrencyFormatData(amount, exchangeType, includeUnit=true) {
	if (global.exchangeRates != null && global.exchangeRates[exchangeType.toLowerCase()] != null) {
		var dec = new Decimal(amount);
		dec = dec.times(global.exchangeRates[exchangeType.toLowerCase()]);
		var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(2);

		return {
			symbol: global.currencySymbols[exchangeType],
			value: addThousandsSeparators(exchangedAmt),
			unit: exchangeType
		}
		
	} else if (exchangeType == "au") {
		if (global.exchangeRates != null && global.goldExchangeRates != null) {
			var dec = new Decimal(amount);
			dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
			var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(2);

			return {
				symbol: "AU",
				value: addThousandsSeparators(exchangedAmt),
				unit: "oz"
			}
		}
	}

	return "";
}

function formatExchangedCurrency(amount, exchangeType, decimals=2) {
	if (global.exchangeRates != null && global.exchangeRates[exchangeType.toLowerCase()] != null) {
		var dec = new Decimal(amount);
		dec = dec.times(global.exchangeRates[exchangeType.toLowerCase()]);
		var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(decimals);

		return {
			val: addThousandsSeparators(exchangedAmt),
			symbol: global.currencyTypes[exchangeType].symbol,
			unit: exchangeType,
			valRaw: exchangedAmt
		};
	} else if (exchangeType == "au") {
		if (global.exchangeRates != null && global.goldExchangeRates != null) {
			var dec = new Decimal(amount);
			dec = dec.times(global.exchangeRates.usd).dividedBy(global.goldExchangeRates.usd);
			var exchangedAmt = parseFloat(Math.round(dec * 100) / 100).toFixed(decimals);

			return {
				val: addThousandsSeparators(exchangedAmt),
				unit: "oz",
				symbol: "AU",
				valRaw: exchangedAmt
			};
		}
	}

	return "";
}

function seededRandom(seed) {
	var x = Math.sin(seed++) * 10000;
	return x - Math.floor(x);
}

function seededRandomIntBetween(seed, min, max) {
	var rand = seededRandom(seed);
	return (min + (max - min) * rand);
}

function randomInt(min, max) {
	return min + Math.floor(Math.random() * max);
}

function ellipsize(str, length, ending="…") {
	if (str.length <= length) {
		return str;

	} else {
		return str.substring(0, length - ending.length) + ending;
	}
}

function ellipsizeMiddle(str, length, replacement="…", extraCharAtStart=true) {
	if (str.length <= length) {
		return str;

	} else {
		//"abcde"(3)->"a…e"
		//"abcdef"(3)->"a…f"
		//"abcdef"(5)->"ab…ef"
		//"abcdef"(4)->"ab…f"
		if ((length - replacement.length) % 2 == 0) {
			return str.substring(0, (length - replacement.length) / 2) + replacement + str.slice(-(length - replacement.length) / 2);

		} else {
			if (extraCharAtStart) {
				return str.substring(0, Math.ceil((length - replacement.length) / 2)) + replacement + str.slice(-Math.floor((length - replacement.length) / 2));

			} else {
				return str.substring(0, Math.floor((length - replacement.length) / 2)) + replacement + str.slice(-Math.ceil((length - replacement.length) / 2));
			}
			
		}
	}
}

function shortenTimeDiff(str) {
	str = str.replace(" years", "y");
	str = str.replace(" year", "y");

	str = str.replace(" months", "mo");
	str = str.replace(" month", "mo");

	str = str.replace(" weeks", "w");
	str = str.replace(" week", "w");

	str = str.replace(" days", "d");
	str = str.replace(" day", "d");

	str = str.replace(" hours", "hr");
	str = str.replace(" hour", "hr");

	str = str.replace(" minutes", "min");
	str = str.replace(" minute", "min");

	return str;
}

function logMemoryUsage() {
	var mbUsed = process.memoryUsage().heapUsed / 1024 / 1024;
	mbUsed = Math.round(mbUsed * 100) / 100;

	var mbTotal = process.memoryUsage().heapTotal / 1024 / 1024;
	mbTotal = Math.round(mbTotal * 100) / 100;

	//debugLog("memoryUsage: heapUsed=" + mbUsed + ", heapTotal=" + mbTotal + ", ratio=" + parseInt(mbUsed / mbTotal * 100));
}

function identifyMiner(coinbaseTx, blockHeight) {
	if (coinbaseTx == null || coinbaseTx.vin == null || coinbaseTx.vin.length == 0) {
		return null;
	}
	
	if (global.miningPoolsConfigs) {
		for (var i = 0; i < global.miningPoolsConfigs.length; i++) {
			var miningPoolsConfig = global.miningPoolsConfigs[i];

			for (var payoutAddress in miningPoolsConfig.payout_addresses) {
				if (miningPoolsConfig.payout_addresses.hasOwnProperty(payoutAddress)) {
					if (coinbaseTx.vout && coinbaseTx.vout.length > 0) {
						if (getVoutAddresses(coinbaseTx.vout[0]).includes(payoutAddress)) {
							var minerInfo = miningPoolsConfig.payout_addresses[payoutAddress];
							minerInfo.identifiedBy = "payout address " + payoutAddress;

							return minerInfo;
						}
					}
				}
			}

			for (var coinbaseTag in miningPoolsConfig.coinbase_tags) {
				if (miningPoolsConfig.coinbase_tags.hasOwnProperty(coinbaseTag)) {
					if (formatHex(coinbaseTx.vin[0].coinbase, "utf8").indexOf(coinbaseTag) != -1) {
						var minerInfo = miningPoolsConfig.coinbase_tags[coinbaseTag];
						minerInfo.identifiedBy = "coinbase tag '" + coinbaseTag + "'";

						return minerInfo;
					}
				}
			}

			for (var blockHash in miningPoolsConfig.block_hashes) {
				if (blockHash == coinbaseTx.blockhash) {
					var minerInfo = miningPoolsConfig.block_hashes[blockHash];
					minerInfo.identifiedBy = "known block hash '" + blockHash + "'";

					return minerInfo;
				}
			}

			if (global.activeBlockchain == "main" && miningPoolsConfig.block_heights) {
				for (var minerName in miningPoolsConfig.block_heights) {
					var minerInfo = miningPoolsConfig.block_heights[minerName];
					minerInfo.name = minerName;

					if (minerInfo.heights.includes(blockHeight)) {
						minerInfo.identifiedBy = "known block height #" + blockHeight;

						return minerInfo;
					}
				}
			}
		}
	}

	if (coinbaseTx.vout && coinbaseTx.vout.length > 0) {
		for (var i = 0; i < coinbaseTx.vout.length; i++) {
			const vout = coinbaseTx.vout[i];

			const voutValue = new Decimal(vout.value);
			if (voutValue > 0) {
				const address = getVoutAddress(vout);

				if (address) {
					return {
						name: address,
						type: "address-only",
						identifiedBy: "payout address " + address,
					};
				}
			}
		}
	}

	return null;
}

function getTxTotalInputOutputValues(tx, txInputs, blockHeight) {
	var totalInputValue = new Decimal(0);
	var totalOutputValue = new Decimal(0);

	try {
		if (txInputs) {
			for (var i = 0; i < tx.vin.length; i++) {
				if (tx.vin[i].coinbase) {
					totalInputValue = totalInputValue.plus(new Decimal(coinConfig.blockRewardFunction(blockHeight, global.activeBlockchain)));

				} else {
					var txInput = txInputs[i];

					if (txInput) {
						try {
							var vout = txInput;

							if (vout.value) {
								totalInputValue = totalInputValue.plus(new Decimal(vout.value));
							}
						} catch (err) {
							logError("2397gs0gsse", err, {txid:tx.txid, vinIndex:i});
						}
					}
				}
			}
		} else {
			totalInputValue = null
		}

		for (var i = 0; i < tx.vout.length; i++) {
				totalOutputValue = totalOutputValue.plus(new Decimal(tx.vout[i].value));
			}
	} catch (err) {
		logError("2308sh0sg44", err, {tx:tx, txInputs:txInputs, blockHeight:blockHeight});
	}

	return {input:totalInputValue, output:totalOutputValue};
}

function getBlockTotalFeesFromCoinbaseTxAndBlockHeight(coinbaseTx, blockHeight) {
	if (coinbaseTx == null) {
		return 0;
	}

	var blockReward = coinConfig.blockRewardFunction(blockHeight, global.activeBlockchain);

	var totalOutput = new Decimal(0);
	for (var i = 0; i < coinbaseTx.vout.length; i++) {
		var outputValue = coinbaseTx.vout[i].value;
		if (outputValue > 0) {
			totalOutput = totalOutput.plus(new Decimal(outputValue));
		}
	}

	if (blockReward < 1e-8 || blockReward == null) {
		return totalOutput;
		
	} else {
		return totalOutput.minus(new Decimal(blockReward));
	}
}

function estimatedSupply(height) {
	const checkpoint = coinConfig.utxoSetCheckpointsByNetwork[global.activeBlockchain];

	let checkpointHeight = 0;
	let checkpointSupply = new Decimal(50);

	if (checkpoint && checkpoint.height <= height) {
		//console.log("using checkpoint");
		checkpointHeight = checkpoint.height;
		checkpointSupply = new Decimal(checkpoint.total_amount);
	}

	let halvingBlockInterval = coinConfig.halvingBlockIntervalsByNetwork[global.activeBlockchain];

	let supply = checkpointSupply;

	let i = checkpointHeight;
	while (i < height) {
		let nextHalvingHeight = halvingBlockInterval * Math.floor(i / halvingBlockInterval) + halvingBlockInterval;
		
		if (height < nextHalvingHeight) {
			let heightDiff = height - i;

			//console.log(`adding(${heightDiff}): ` + new Decimal(heightDiff).times(coinConfig.blockRewardFunction(i, global.activeBlockchain)));
			return supply.plus(new Decimal(heightDiff).times(coinConfig.blockRewardFunction(i, global.activeBlockchain)));
		}

		let heightDiff = nextHalvingHeight - i;

		supply = supply.plus(new Decimal(heightDiff).times(coinConfig.blockRewardFunction(i, global.activeBlockchain)));
		
		i += heightDiff;
	}

	return supply;
}

async function refreshExchangeRates() {
	if (!config.queryExchangeRates) {
		return;
	}

	if (coins[config.coin].exchangeRateData) {
		try {
			const response = await axios.get(coins[config.coin].exchangeRateData.jsonUrl);

			var exchangeRates = coins[config.coin].exchangeRateData.responseBodySelectorFunction(response.data);
			if (exchangeRates != null) {
				global.exchangeRates = exchangeRates;
				global.exchangeRatesUpdateTime = new Date();

				debugLog("Using exchange rates: " + JSON.stringify(global.exchangeRates) + " starting at " + global.exchangeRatesUpdateTime);

			} else {
				debugLog("Unable to get exchange rate data");
			}
		} catch (err) {
			logError("39r7h2390fgewfgds", err);
		}
	}

	if (coins[config.coin].goldExchangeRateData) {
		if (process.env.NODE_ENV == "local") {
			global.goldExchangeRates = {usd: 1731.2};
			global.goldExchangeRatesUpdateTime = new Date();

			debugLog("Using DEBUG gold exchange rates: " + JSON.stringify(global.goldExchangeRates) + " starting at " + global.goldExchangeRatesUpdateTime);

		} else {
			try {
				const response = await axios.get(coins[config.coin].goldExchangeRateData.jsonUrl);

				var exchangeRates = coins[config.coin].goldExchangeRateData.responseBodySelectorFunction(response.data);
				if (exchangeRates != null) {
					global.goldExchangeRates = exchangeRates;
					global.goldExchangeRatesUpdateTime = new Date();

					debugLog("Using gold exchange rates: " + JSON.stringify(global.goldExchangeRates) + " starting at " + global.goldExchangeRatesUpdateTime);

				} else {
					debugLog("Unable to get gold exchange rate data");
				}
			} catch (err) {
				logError("34082yt78yewewe", err);
			}
		}
	}
}

// Uses ipstack.com API
function geoLocateIpAddresses(ipAddresses, provider) {
	return new Promise(function(resolve, reject) {
		if (config.privacyMode || config.credentials.ipStackComApiAccessKey === undefined) {
			resolve({});

			return;
		}

		var ipDetails = {ips:ipAddresses, detailsByIp:{}};

		var promises = [];
		for (var i = 0; i < ipAddresses.length; i++) {
			var ipStr = ipAddresses[i];

			if (ipStr.endsWith(".onion")) {
				// tor, no location possible
				continue;
			}

			if (ipStr == "127.0.0.1") {
				// skip
				continue;
			}

			if (!ipStr.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
				// non-IPv4, skip it
				continue;
			}
			
			promises.push(new Promise(function(resolve2, reject2) {
				ipCache.get(ipStr).then(async function(result) {
					if (result.value == null) {
						var apiUrl = "http://api.ipstack.com/" + result.key + "?access_key=" + config.credentials.ipStackComApiAccessKey;
						
						try {
							const response = await axios.get(apiUrl);

							var ip = response.data.ip;

							ipDetails.detailsByIp[ip] = response.data;

							if (response.data.latitude && response.data.longitude) {
								debugLog(`Successful IP-geo-lookup: ${ip} -> (${response.data.latitude}, ${response.data.longitude})`);

							} else {
								debugLog(`Unknown location for IP-geo-lookup: ${ip}`);
							}									

							ipCache.set(ip, response.data, 1000 * 60 * 60 * 24 * 365);

							resolve2();

						} catch (err) {
							debugLog("Failed IP-geo-lookup: " + result.key);

							logError("39724gdge33a", error, {ip: result.key});

							// we failed to get what we wanted, but there's no meaningful recourse,
							// so we log the failure and continue without objection
							resolve2();
						}

					} else {
						ipDetails.detailsByIp[result.key] = result.value;

						resolve2();
					}
				});
			}));
		}

		Promise.all(promises).then(function(results) {
			resolve(ipDetails);

		}).catch(function(err) {
			logError("80342hrf78wgehdf07gds", err);

			reject(err);
		});
	});
}

function parseExponentStringDouble(val) {
	var [lead,decimal,pow] = val.toString().split(/e|\./);
	return +pow <= 0 
		? "0." + "0".repeat(Math.abs(pow)-1) + lead + decimal
		: lead + ( +pow >= decimal.length ? (decimal + "0".repeat(+pow-decimal.length)) : (decimal.slice(0,+pow)+"."+decimal.slice(+pow)));
}

function formatLargeNumber(n, decimalPlaces) {
	try {
		for (var i = 0; i < exponentScales.length; i++) {
			var item = exponentScales[i];

			var fraction = new Decimal(n / item.val);
			if (fraction >= 1) {
				return [fraction.toDP(decimalPlaces), item];
			}
		}

		return [new Decimal(n).toDP(decimalPlaces), {}];

	} catch (err) {
		logError("ru92huefhew", err, { n:n, decimalPlaces:decimalPlaces });

		throw err;
	}
}

function formatLargeNumberSignificant(n, significantDigits) {
	try {
		for (var i = 0; i < exponentScales.length; i++) {
			var item = exponentScales[i];

			var fraction = new Decimal(n / item.val);
			if (fraction >= 1) {
				return [fraction.toDP(Math.max(0, significantDigits - `${Math.floor(fraction)}`.length)), item];
			}
		}

		return [new Decimal(n).toDP(significantDigits), {}];

	} catch (err) {
		logError("38fhcdugdeogwe", err, { n:n, significantDigits:significantDigits });

		throw err;
	}
}

function rgbToHsl(r, g, b) {
	r /= 255, g /= 255, b /= 255;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if(max == min){
		h = s = 0; // achromatic
	}else{
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch(max){
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}

	return {h:h, s:s, l:l};
}

function colorHexToRgb(hex) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, function(m, r, g, b) {
		return r + r + g + g + b + b;
	});

	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function colorHexToHsl(hex) {
	var rgb = colorHexToRgb(hex);
	return rgbToHsl(rgb.r, rgb.g, rgb.b);
}


// https://stackoverflow.com/a/31424853/673828
const reflectPromise = p => p.then(v => ({v, status: "resolved" }),
							e => ({e, status: "rejected" }));


global.errorStats = {};

function logError(errorId, err, optionalUserData = {}, logStacktrace=true) {
	debugErrorLog("Error " + errorId + ": " + err + ", json: " + JSON.stringify(err) + (optionalUserData != null ? (", userData: " + optionalUserData + " (json: " + JSON.stringify(optionalUserData) + ")") : ""));
	
	if (err && err.stack && logStacktrace) {
		debugErrorVerboseLog("Stack: " + err.stack);
	}


	if (!global.errorLog) {
		global.errorLog = [];
	}

	if (!global.errorStats[errorId]) {
		global.errorStats[errorId] = {
			count: 0,
			firstSeen: new Date().getTime(),
			properties: {}
		};
	}

	if (optionalUserData && err.message) {
		optionalUserData.errorMsg = err.message;
	}

	if (optionalUserData) {
		for (const [key, value] of Object.entries(optionalUserData)) {
			if (!global.errorStats[errorId].properties[key]) {
				global.errorStats[errorId].properties[key] = {};
			}

			if (!global.errorStats[errorId].properties[key][value]) {
				global.errorStats[errorId].properties[key][value] = 0;
			}

			global.errorStats[errorId].properties[key][value]++;
		}
	}

	statTracker.trackEvent(`errors.${errorId}`);
	statTracker.trackEvent(`errors.*`);

	global.errorStats[errorId].count++;
	global.errorStats[errorId].lastSeen = new Date().getTime();

	global.errorLog.push({errorId:errorId, error:err, userData:optionalUserData, date:new Date()});
	while (global.errorLog.length > 100) {
		global.errorLog.splice(0, 1);
	}

	
	var returnVal = {errorId:errorId, error:err};
	if (optionalUserData) {
		returnVal.userData = optionalUserData;
	}

	return returnVal;
}

function buildQrCodeUrls(strings) {
	return new Promise(function(resolve, reject) {
		var promises = [];
		var qrcodeUrls = {};

		for (var i = 0; i < strings.length; i++) {
			promises.push(new Promise(function(resolve2, reject2) {
				buildQrCodeUrl(strings[i], qrcodeUrls).then(function() {
					resolve2();

				}).catch(function(err) {
					reject2(err);
				});
			}));
		}

		Promise.all(promises).then(function(results) {
			resolve(qrcodeUrls);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function buildQrCodeUrl(str, results) {
	return new Promise(function(resolve, reject) {
		qrcode.toDataURL(str, function(err, url) {
			if (err) {
				logError("2q3ur8fhudshfs", err, str);

				reject(err);

				return;
			}

			results[str] = url;

			resolve();
		});
	});
}

function outputTypeAbbreviation(outputType) {
	var map = {
		"pubkey": "P2PK",
		"pubkeyhash": "P2PKH",
		"scripthash": "P2SH",
		"witness_v0_keyhash": "P2WPKH",
		"witness_v0_scripthash": "P2WSH",
		"witness_v1_taproot": "P2TR",
		"nonstandard": "nonstandard",
		"nulldata": "nulldata"
	};

	if (map[outputType]) {
		return map[outputType];

	} else {
		return "???";
	}
}

function outputTypeName(outputType) {
	var map = {
		"pubkey": "Pay to Public Key",
		"pubkeyhash": "Pay to Public Key Hash",
		"scripthash": "Pay to Script Hash",
		"witness_v0_keyhash": "Witness, v0 Key Hash",
		"witness_v0_scripthash": "Witness, v0 Script Hash",
		"witness_v1_taproot": "Witness, v1 Taproot",
		"nonstandard": "Non-Standard",
		"nulldata": "Null Data"
	};

	if (map[outputType]) {
		return map[outputType];

	} else {
		return "???";
	}
}

function asHash(value) {
	return value.replace(/[^a-f0-9]/gi, "");
}

function asHashOrHeight(value) {
	return +value || asHash(value);
}

function asAddress(value) {
	return value.replace(/[^a-z0-9]/gi, "");
}

const arrayFromHexString = hexString =>
	new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const getCrawlerFromUserAgentString = userAgentString => {
	for (const [name, regex] of Object.entries(crawlerBotUserAgentStrings)) {
		if (regex.test(userAgentString)) {
			return name;
		}
	}

	return null;
};

const safePromise = async (uid, promise) => {
	try {
		const response = await promise();

		return response;

	} catch (e) {
		logError(uid, e);
	}
};

const timePromise = async (name, promise, perfResults=null) => {
	const startTime = startTimeNanos();

	try {
		const response = await promise();

		const responseTimeMillis = dtMillis(startTime);

		statTracker.trackPerformance(name, responseTimeMillis);

		if (perfResults) {
			perfResults[name] = Math.max(1, parseInt(responseTimeMillis));
		}

		return response;

	} catch (e) {
		const responseTimeMillis = dtMillis(startTime);

		statTracker.trackPerformance(`${name}_error`, responseTimeMillis);

		if (perfResults) {
			perfResults[`${name}_error`] = Math.max(1, parseInt(responseTimeMillis));
		}

		throw e;
	}
};

const timeFunction = (uid, f, perfResults=null) => {
	const startTime = startTimeNanos();

	f();

	const responseTimeMillis = dtMillis(startTime);

	statTracker.trackPerformance(uid, responseTimeMillis);

	if (perfResults) {
		perfResults[uid] = responseTimeMillis;
	}
};

const fileCache = (cacheDir, filename) => {
	const filepath = `${cacheDir}/${filename}`;

	return {
		tryLoadJson: () => {
			if (fs.existsSync(filepath)) {
				let rawData = fs.readFileSync(filepath);

				try {
					return JSON.parse(rawData);

				} catch (e) {
					logError("378y43edewe", e);

					fs.unlinkSync(filepath);

					return null;
				}
			}

			return null;
		},
		writeJson: (obj) => {
			if (!fs.existsSync(cacheDir)) {
				fs.mkdirSync(cacheDir);
			}

			fs.writeFileSync(filepath, JSON.stringify(obj));
		}
	};
};

const startTimeNanos = () => {
	return process.hrtime.bigint();
};

const dtMillis = (startTimeNanos) => {
	const dtNanos = process.hrtime.bigint() - startTimeNanos;

	return parseInt(dtNanos) * 1e-6;
};

function objectProperties(obj) {
	const props = [];
	for (const prop in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, prop)) {
			props.push(prop);
		}
	}

	return props;
}

function objHasProperty(obj, name) {
	return Object.prototype.hasOwnProperty.call(obj, name);
}

function iterateProperties(obj, action) {
	for (const [key, value] of Object.entries(obj)) {
		action([key, value]);
	}
}

function stringifySimple(object) {
	var simpleObject = {};
	for (var prop in object) {
			if (!object.hasOwnProperty(prop)) {
					continue;
			}

			if (typeof(object[prop]) == 'object') {
					continue;
			}

			if (typeof(object[prop]) == 'function') {
					continue;
			}

			simpleObject[prop] = object[prop];
	}

	return JSON.stringify(simpleObject); // returns cleaned up JSON
}

function getVoutAddress(vout) {
	if (vout && vout.scriptPubKey) {
		if (vout.scriptPubKey.address) {
			return vout.scriptPubKey.address;

		} else if (vout.scriptPubKey.addresses && vout.scriptPubKey.addresses.length > 0) {
			return vout.scriptPubKey.addresses[0];
		}
	}

	return null;
}

function getVoutAddresses(vout) {
	if (vout && vout.scriptPubKey) {
		if (vout.scriptPubKey.address) {
			return [vout.scriptPubKey.address];

		} else if (vout.scriptPubKey.addresses) {
			return vout.scriptPubKey.addresses;
		}
	}

	return [];
}

const xpubPrefixes = new Map([
	['xpub', '0488b21e'],
	['ypub', '049d7cb2'],
	['Ypub', '0295b43f'],
	['zpub', '04b24746'],
	['Zpub', '02aa7ed3'],
	['tpub', '043587cf'],
	['upub', '044a5262'],
	['Upub', '024289ef'],
	['vpub', '045f1cf6'],
	['Vpub', '02575483'],
]);

const bip32TestnetNetwork = {
	messagePrefix: '\x18Bitcoin Signed Message:\n',
	bech32: 'tb',
	bip32: {
		public: 0x043587cf,
		private: 0x04358394,
	},
	pubKeyHash: 0x6f,
	scriptHash: 0xc4,
	wif: 0xEF,
};

// ref: https://github.com/ExodusMovement/xpub-converter/blob/master/src/index.js
function xpubChangeVersionBytes(xpub, targetFormat) {
	if (!xpubPrefixes.has(targetFormat)) {
		throw new Error("Invalid target version");
	}

	// trim whitespace
	xpub = xpub.trim();

	var data = bs58check.decode(xpub);
	data = data.slice(4);
	data = Buffer.concat([Buffer.from(xpubPrefixes.get(targetFormat), 'hex'), data]);

	return bs58check.encode(data);
}

// HD wallet addresses
function bip32Addresses(extPubkey, addressType, account, limit=10, offset=0) {
	let network = null;
	if (!extPubkey.match(/^(xpub|ypub|zpub|Ypub|Zpub).*$/)) {
		network = bip32TestnetNetwork;
	}

	let bip32object = bip32.fromBase58(extPubkey, network);

	let addresses = [];
	for (let i = offset; i < (offset + limit); i++) {
		let bip32Child = bip32object.derive(account).derive(i);
		let publicKey = bip32Child.publicKey;

		if (addressType == "p2pkh") {
			addresses.push(bitcoinjs.payments.p2pkh({ pubkey: publicKey, network: network }).address);

		} else if (addressType == "p2sh(p2wpkh)") {
			addresses.push(bitcoinjs.payments.p2sh({ redeem: bitcoinjs.payments.p2wpkh({ pubkey: publicKey, network: network })}).address);

		} else if (addressType == "p2wpkh") {
			addresses.push(bitcoinjs.payments.p2wpkh({ pubkey: publicKey, network: network }).address);

		} else {
			throw new Error(`Unknown address type: "${addressType}" (should be one of ["p2pkh", "p2sh(p2wpkh)", "p2wpkh"])`)
		}
	}

	return addresses;
}


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const awaitPromises = async (promises) => {
	const promiseResults = await Promise.allSettled(promises);

	promiseResults.forEach(x => {
		if (x.status == "rejected") {
			if (x.reason) {
				logError("awaitPromises_rejected", x.reason);
			}
		}
	});

	return promiseResults;
};

const perfLog = [];
let perfLogItemCount = 0;
const perfLogMaxItems = 100;
const perfLogNewItem = (tags) => {
	const newItem = tags;

	newItem.id = getRandomString(12, "aA#");
	newItem.date = new Date();
	newItem.results = {};
	newItem.index = perfLogItemCount;

	perfLogItemCount++;

	perfLog.splice(0, 0, newItem);

	while (perfLog.length > perfLogMaxItems) {
		perfLog.splice(perfLog.length - 1, 1);
	}

	return {
		perfId:newItem.id,
		perfResults:newItem.results
	};
};

module.exports = {
	reflectPromise: reflectPromise,
	redirectToConnectPageIfNeeded: redirectToConnectPageIfNeeded,
	formatHex: formatHex,
	splitArrayIntoChunks: splitArrayIntoChunks,
	splitArrayIntoChunksByChunkCount: splitArrayIntoChunksByChunkCount,
	getRandomString: getRandomString,
	formatCurrencyAmount: formatCurrencyAmount,
	formatCurrencyAmountWithForcedDecimalPlaces: formatCurrencyAmountWithForcedDecimalPlaces,
	formatExchangedCurrency: formatExchangedCurrency,
	getExchangedCurrencyFormatData: getExchangedCurrencyFormatData,
	satoshisPerUnitOfLocalCurrency: satoshisPerUnitOfLocalCurrency,
	addThousandsSeparators: addThousandsSeparators,
	formatCurrencyAmountInSmallestUnits: formatCurrencyAmountInSmallestUnits,
	seededRandom: seededRandom,
	seededRandomIntBetween: seededRandomIntBetween,
	randomInt: randomInt,
	logMemoryUsage: logMemoryUsage,
	identifyMiner: identifyMiner,
	getBlockTotalFeesFromCoinbaseTxAndBlockHeight: getBlockTotalFeesFromCoinbaseTxAndBlockHeight,
	estimatedSupply: estimatedSupply,
	refreshExchangeRates: refreshExchangeRates,
	parseExponentStringDouble: parseExponentStringDouble,
	formatLargeNumber: formatLargeNumber,
	formatLargeNumberSignificant: formatLargeNumberSignificant,
	geoLocateIpAddresses: geoLocateIpAddresses,
	getTxTotalInputOutputValues: getTxTotalInputOutputValues,
	rgbToHsl: rgbToHsl,
	colorHexToRgb: colorHexToRgb,
	colorHexToHsl: colorHexToHsl,
	logError: logError,
	buildQrCodeUrls: buildQrCodeUrls,
	ellipsize: ellipsize,
	ellipsizeMiddle: ellipsizeMiddle,
	shortenTimeDiff: shortenTimeDiff,
	outputTypeAbbreviation: outputTypeAbbreviation,
	outputTypeName: outputTypeName,
	asHash: asHash,
	asHashOrHeight: asHashOrHeight,
	asAddress: asAddress,
	arrayFromHexString: arrayFromHexString,
	getCrawlerFromUserAgentString: getCrawlerFromUserAgentString,
	timePromise: timePromise,
	timeFunction: timeFunction,
	startTimeNanos: startTimeNanos,
	dtMillis: dtMillis,
	objectProperties: objectProperties,
	objHasProperty: objHasProperty,
	stringifySimple: stringifySimple,
	safePromise: safePromise,
	getVoutAddress: getVoutAddress,
	getVoutAddresses: getVoutAddresses,
	xpubChangeVersionBytes: xpubChangeVersionBytes,
	bip32Addresses: bip32Addresses,
	sleep: sleep,
	awaitPromises: awaitPromises,
	perfLogNewItem: perfLogNewItem,
	perfLog: perfLog,
	fileCache: fileCache
};
