module.exports = {
	
	// Edit "rpc" below to target your node.
	// You may delete this section if you wish to connect manually via the UI.
	rpc: {
		host: process.env.BTCEXP_RPC_HOST || "localhost",
		port: parseInt(process.env.BTCEXP_RPC_PORT) || 8332,
		username: process.env.BTCEXP_RPC_USERNAME || "username",
		password: process.env.BTCEXP_RPC_PASSWORD || "password"
	},

	// optional: enter your api access key from ipstack.com below
	// to include a map of the estimated locations of your node's
	// peers
	ipStackComApiAccessKey: process.env.BTCEXP_IPSTACK_KEY || "",

	// optional: GA tracking code
	googleAnalyticsTrackingId: process.env.BTCEXP_GANALYTICS_TRACKING || "",

	// optional: sentry.io error-tracking url
	sentryUrl:"",
};
