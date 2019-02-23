var basicAuth = require('basic-auth');

module.exports = pass => (req, res, next) => {
	var cred = basicAuth(req);

	if (cred && cred.pass === pass) {
		req.authenticated = true;
		return next();
	}

	res.set('WWW-Authenticate', `Basic realm="Private Area"`)
		.sendStatus(401);
}
