var basicAuth = require('basic-auth');

module.exports = (app, pass, demo = false) => (req, res, next) => {
	if (demo) return next();
	if (!pass) return res.status(401).send("This section of the site requires authentication. Set an authentication password via the 'BTCEXP_BASIC_AUTH_PASSWORD' environment variable (see .env-sample file for more info).");

	app.disable('x-powered-by');

	var cred = basicAuth(req);

	if (cred && cred.pass === pass) {
		req.authenticated = true;
		return next();
	}

	res.set('WWW-Authenticate', `Basic realm="Private Area"`)
		.sendStatus(401);
}
