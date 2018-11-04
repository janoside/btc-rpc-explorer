module.exports = {
	
	// Edit "rpc" below to target your node.
	// You may delete this section if you wish to connect manually via the UI.

	rpc: {
		host: "127.0.0.1",
		// host: "bitcoind",
		port: 18332,
		username: "bitcoinrpc",
		password: "rpcpass"
	},

	// optional: enter your api access key from ipstack.com below
	// to include a map of the estimated locations of your node's
	// peers
	ipStackComApiAccessKey:"",

	// optional: GA tracking code
	googleAnalyticsTrackingId:"",

	// optional: sentry.io error-tracking url
	sentryUrl:"",
};
