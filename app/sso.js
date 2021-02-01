const crypto = require('crypto');
const fs = require('fs');

const authCookieName = "btcexp_auth";

function generateToken() {
	// Normally we would use 16 => 128 bits of entropy which is sufficiennt
	// But since we're going to base64 it and there would be padding (==),
	// It's a wasted space, why not use padding for some additional entropy? :)
	// The replacing is to make it URL-safe
	return crypto.randomBytes(18).toString("base64").replace(/\+/g, '-').replace(/\//g, '_')
}

function updateToken(tokenFile) {
	var newToken = generateToken();
	var tmpFileName = tokenFile + ".tmp";
	fs.writeFileSync(tmpFileName, newToken);
	fs.renameSync(tmpFileName, tokenFile);
	
	return newToken;
}

module.exports = (tokenFile, loginRedirect) => {
	var token = updateToken(tokenFile);
	var cookies = new Set();

	return (req, res, next) => {
		if (req.cookies && cookies.has(req.cookies[authCookieName])) {
			req.authenticated = true;

			return next();
		}

		if (req.query.token === token) {
			req.authenticated = true;
			token = updateToken(tokenFile);
			cookie = generateToken();
			cookies.add(cookie);
			res.cookie(authCookieName, cookie);

			return next();
		}

		if (loginRedirect) {
			res.redirect(loginRedirect);

		} else {
			res.sendStatus(401);
		}
	};
}
