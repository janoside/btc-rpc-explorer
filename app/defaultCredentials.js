var os = require('os');
var path = require('path');

module.exports = {
	rpc: {
		host: process.env.BTCEXP_BITCOIND_HOST || "127.0.0.1",
		port: process.env.BTCEXP_BITCOIND_PORT || 8332,
		username: process.env.BTCEXP_BITCOIND_USER,
		password: process.env.BTCEXP_BITCOIND_PASS,
		cookie: process.env.BTCEXP_BITCOIND_COOKIE || path.join(os.homedir(), '.bitcoin', '.cookie'),
	},

	influxdb:{
		active: !!process.env.BTCEXP_ENABLE_INFLUXDB,
		host: process.env.BTCEXP_INFLUXDB_HOST || "127.0.0.1",
		port: process.env.BTCEXP_INFLUXDB_PORT || 8086,
		database: process.env.BTCEXP_INFLUXDB_DBNAME || "influxdb",
		username: process.env.BTCEXP_INFLUXDB_USER || "admin",
		password: process.env.BTCEXP_INFLUXDB_PASS || "admin"
	},

	// optional: enter your api access key from ipstack.com below
	// to include a map of the estimated locations of your node's
	// peers
	// format: "ID_FROM_IPSTACK"
	ipStackComApiAccessKey: process.env.BTCEXP_IPSTACK_KEY,

	// optional: GA tracking code
	// format: "UA-..."
	googleAnalyticsTrackingId: process.env.BTCEXP_GANALYTICS_TRACKING,

	// optional: sentry.io error-tracking url
	// format: "SENTRY_IO_URL"
	sentryUrl: process.env.BTCEXP_SENTRY_URL,
};
