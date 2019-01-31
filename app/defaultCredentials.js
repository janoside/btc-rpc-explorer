module.exports = {
	rpc: {
		host:"127.0.0.1",
		port:8332,
		username:"rpc_username",
		password:"rpc_password"
	},

	influxdb:{
		active:false,
		host:"127.0.0.1",
		port:8086,
		database:"influxdb",
		username:"admin",
		password:"admin"
	},

	// optional: enter your api access key from ipstack.com below
	// to include a map of the estimated locations of your node's
	// peers
	// format: "ID_FROM_IPSTACK"
	ipStackComApiAccessKey:null,

	// optional: GA tracking code
	// format: "UA-..."
	googleAnalyticsTrackingId:null,

	// optional: sentry.io error-tracking url
	// format: "SENTRY_IO_URL"
	sentryUrl:null,
};
