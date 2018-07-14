var Decimal = require("decimal.js");
var request = require("request");

var config = require("./config.js");
var coins = require("./coins.js");
var coinConfig = coins[config.coin];

function redirectToConnectPageIfNeeded(req, res) {
	if (!req.session.host) {
		req.session.redirectUrl = req.originalUrl;
		
		res.redirect("/");
		res.end();
		
		return true;
	}
	
	return false;
}

function hex2ascii(hex) {
	var str = "";
	for (var i = 0; i < hex.length; i += 2) {
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	}
	
	return str;
}

function splitArrayIntoChunks(array, chunkSize) {
	var j = array.length;
	var chunks = [];
	
	for (var i = 0; i < j; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
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

function formatBytes(bytesInt) {
	var scales = [ {val:1000000000000000, name:"PB"}, {val:1000000000000, name:"TB"}, {val:1000000000, name:"GB"}, {val:1000000, name:"MB"}, {val:1000, name:"KB"} ];
	for (var i = 0; i < scales.length; i++) {
		var item = scales[i];

		var fraction = Math.floor(bytesInt / item.val);
		if (fraction >= 1) {
			return fraction.toLocaleString() + " " + item.name;
		}
	}

	return Math.floor(bytesInt) + " B";
}

var formatCurrencyCache = {};

function formatCurrencyAmount(amount, formatType) {
	if (formatCurrencyCache[formatType]) {
		var dec = new Decimal(amount);
		dec = dec.times(formatCurrencyCache[formatType].multiplier);

		var decimalPlaces = formatCurrencyCache[formatType].decimalPlaces;
		if (decimalPlaces == 0 && dec < 1) {
			decimalPlaces = 5;
		}

		return addThousandsSeparators(dec.toDecimalPlaces(decimalPlaces)) + " " + formatCurrencyCache[formatType].name;
	}

	for (var x = 0; x < coins[config.coin].currencyUnits.length; x++) {
		var currencyUnit = coins[config.coin].currencyUnits[x];

		for (var y = 0; y < currencyUnit.values.length; y++) {
			var currencyUnitValue = currencyUnit.values[y];

			if (currencyUnitValue == formatType) {
				formatCurrencyCache[formatType] = currencyUnit;

				var dec = new Decimal(amount);
				dec = dec.times(currencyUnit.multiplier);

				var decimalPlaces = currencyUnit.decimalPlaces;
				if (decimalPlaces == 0 && dec < 1) {
					decimalPlaces = 5;
				}

				return addThousandsSeparators(dec.toDecimalPlaces(decimalPlaces)) + " " + currencyUnit.name;
			}
		}
	}
	
	return amount;
}

function formatCurrencyAmountInSmallestUnits(amount) {
	return formatCurrencyAmount(amount, coins[config.coin].currencyUnits[coins[config.coin].currencyUnits.length - 1].name);
}

// ref: https://stackoverflow.com/a/2901298/673828
function addThousandsSeparators(x) {
	var parts = x.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return parts.join(".");
}

function formatExchangedCurrency(amount) {
	if (global.exchangeRate != null) {
		var dec = new Decimal(amount);
		dec = dec.times(global.exchangeRate);

		return addThousandsSeparators(dec.toDecimalPlaces(2)) + " " + coins[config.coin].exchangeRateData.exchangedCurrencyName;
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

function logMemoryUsage() {
	var mbUsed = process.memoryUsage().heapUsed / 1024 / 1024;
	mbUsed = Math.round(mbUsed * 100) / 100;

	var mbTotal = process.memoryUsage().heapTotal / 1024 / 1024;
	mbTotal = Math.round(mbTotal * 100) / 100;

	console.log("memoryUsage: heapUsed=" + mbUsed + ", heapTotal=" + mbTotal + ", ratio=" + parseInt(mbUsed / mbTotal * 100));
}

function getMinerFromCoinbaseTx(tx) {
	if (tx == null || tx.vin == null || tx.vin.length == 0) {
		return null;
	}
	
	if (global.miningPoolsConfig) {
		for (var payoutAddress in global.miningPoolsConfig.payout_addresses) {
			if (global.miningPoolsConfig.payout_addresses.hasOwnProperty(payoutAddress)) {
				if (tx.vout && tx.vout.length > 0 && tx.vout[0].scriptPubKey && tx.vout[0].scriptPubKey.addresses && tx.vout[0].scriptPubKey.addresses.length > 0) {
					if (tx.vout[0].scriptPubKey.addresses[0] == payoutAddress) {
						var minerInfo = global.miningPoolsConfig.payout_addresses[payoutAddress];
						minerInfo.identifiedBy = "payout address " + payoutAddress;

						return minerInfo;
					}
				}
			}
		}

		for (var coinbaseTag in global.miningPoolsConfig.coinbase_tags) {
			if (global.miningPoolsConfig.coinbase_tags.hasOwnProperty(coinbaseTag)) {
				if (hex2ascii(tx.vin[0].coinbase).indexOf(coinbaseTag) != -1) {
					var minerInfo = global.miningPoolsConfig.coinbase_tags[coinbaseTag];
					minerInfo.identifiedBy = "coinbase tag '" + coinbaseTag + "'";

					return minerInfo;
				}
			}
		}
	}

	return null;
}

function getBlockTotalFeesFromCoinbaseTxAndBlockHeight(coinbaseTx, blockHeight) {
	if (coinbaseTx == null) {
		return 0;
	}

	var blockReward = coinConfig.blockRewardFunction(blockHeight);

	var totalOutput = new Decimal(0);
	for (var i = 0; i < coinbaseTx.vout.length; i++) {
		var outputValue = coinbaseTx.vout[i].value;
		if (outputValue > 0) {
			totalOutput = totalOutput.plus(new Decimal(outputValue));
		}
	}

	return totalOutput.minus(new Decimal(blockReward));
}

function refreshExchangeRate() {
	if (coins[config.coin].exchangeRateData) {
		request(coins[config.coin].exchangeRateData.jsonUrl, function(error, response, body) {
			if (!error && response && response.statusCode && response.statusCode == 200) {
				var responseBody = JSON.parse(body);

				var exchangeRate = coins[config.coin].exchangeRateData.responseBodySelectorFunction(responseBody);
				if (exchangeRate > 0) {
					global.exchangeRate = exchangeRate;
					global.exchangeRateUpdateTime = new Date();

					console.log("Using exchange rate: " + global.exchangeRate + " USD/" + coins[config.coin].name + " starting at " + global.exchangeRateUpdateTime);

				} else {
					console.log("Unable to get exchange rate data");
				}
			} else {
				console.log("Error:");
				console.log(error);
				console.log("Response:");
				console.log(response);
			}
		});
	}
}


module.exports = {
	redirectToConnectPageIfNeeded: redirectToConnectPageIfNeeded,
	hex2ascii: hex2ascii,
	splitArrayIntoChunks: splitArrayIntoChunks,
	getRandomString: getRandomString,
	formatBytes: formatBytes,
	formatCurrencyAmount: formatCurrencyAmount,
	formatExchangedCurrency: formatExchangedCurrency,
	addThousandsSeparators: addThousandsSeparators,
	formatCurrencyAmountInSmallestUnits: formatCurrencyAmountInSmallestUnits,
	seededRandom: seededRandom,
	seededRandomIntBetween: seededRandomIntBetween,
	logMemoryUsage: logMemoryUsage,
	getMinerFromCoinbaseTx: getMinerFromCoinbaseTx,
	getBlockTotalFeesFromCoinbaseTxAndBlockHeight: getBlockTotalFeesFromCoinbaseTxAndBlockHeight,
	refreshExchangeRate: refreshExchangeRate
};
