var Decimal = require("decimal.js");
Decimal8 = Decimal.clone({ precision:8, rounding:8 });

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

module.exports = {
	doSmartRedirect: doSmartRedirect,
	redirectToConnectPageIfNeeded: redirectToConnectPageIfNeeded,
	hex2ascii: hex2ascii,
	getBlockReward: getBlockReward
};
