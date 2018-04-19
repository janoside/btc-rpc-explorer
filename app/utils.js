var Decimal = require("decimal.js");
Decimal8 = Decimal.clone({ precision:8, rounding:8 });

var env = require("./env.js");
var coins = require("./coins.js");

function doSmartRedirect(req, res, defaultUrl) {
	if (req.session.redirectUrl) {
		res.redirect(req.session.redirectUrl);
		req.session.redirectUrl = null;
		
	} else {
		res.redirect(defaultUrl);
	}
	
	res.end();
}

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

function getBlockReward(blockHeight) {
	var eras = [ new Decimal8(50) ];
	for (var i = 1; i < 34; i++) {
		var previous = eras[i - 1];
		eras.push(new Decimal8(previous).dividedBy(2));
	}

	var index = Math.floor(blockHeight / 210000);

	return eras[index];
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

	return bytesInt + " B";
}

var formatCurrencyCache = {};

function formatCurrencyAmount(amount, formatType) {
	if (formatCurrencyCache[formatType]) {
		var dec = new Decimal(amount);
		dec = dec.times(formatCurrencyCache[formatType].multiplier);

		var decimalPlaces = formatCurrencyCache[formatType].decimalPlaces;

		return addThousandsSeparators(dec.toDecimalPlaces(decimalPlaces)) + " " + formatCurrencyCache[formatType].name;
	}

	for (var x = 0; x < coins[env.coin].currencyUnits.length; x++) {
		var currencyUnit = coins[env.coin].currencyUnits[x];

		for (var y = 0; y < currencyUnit.values.length; y++) {
			var currencyUnitValue = currencyUnit.values[y];

			if (currencyUnitValue == formatType) {
				formatCurrencyCache[formatType] = currencyUnit;

				var dec = new Decimal(amount);
				dec = dec.times(currencyUnit.multiplier);

				var decimalPlaces = currencyUnit.decimalPlaces;

				return addThousandsSeparators(dec.toDecimalPlaces(decimalPlaces)) + " " + currencyUnit.name;
			}
		}
	}
	
	return amount;
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

		return addThousandsSeparators(dec.toDecimalPlaces(2)) + " " + coins[env.coin].exchangeRateData.exchangedCurrencyName;
	}

	return "";
}


module.exports = {
	doSmartRedirect: doSmartRedirect,
	redirectToConnectPageIfNeeded: redirectToConnectPageIfNeeded,
	hex2ascii: hex2ascii,
	getBlockReward: getBlockReward,
	splitArrayIntoChunks: splitArrayIntoChunks,
	getRandomString: getRandomString,
	formatBytes: formatBytes,
	formatCurrencyAmount: formatCurrencyAmount,
	formatExchangedCurrency: formatExchangedCurrency
};
