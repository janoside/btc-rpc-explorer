var basicAuth = require('basic-auth');

module.exports = (app, pass) => (req, res, next) => {
	app.disable('x-powered-by');

	var cred = basicAuth(req);

	if (cred && cred.pass === pass) {
		req.authenticated = true;
		return next();
	}

	res.set('WWW-Authenticate', `Basic realm="Private Area"`)
		.sendStatus(401);
}
