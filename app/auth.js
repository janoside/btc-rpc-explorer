var basicAuth = require('basic-auth');

module.exports = (app, pass, demo = false) => (req, res, next) => {
	if (demo) return next();

	app.disable('x-powered-by');

	var cred = basicAuth(req);

	if (cred && cred.pass === pass) {
		req.authenticated = true;
		return next();
	}

	res.set('WWW-Authenticate', `Basic realm="Private Area"`)
		.sendStatus(401);
}
