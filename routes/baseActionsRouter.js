var express = require('express');
var router = express.Router();
var util = require('util');
var moment = require('moment');
var bitcoinCore = require("bitcoin-core");
var qrcode = require('qrcode');
var bitcoinjs = require('bitcoinjs-lib');

var utils = require('./../app/utils.js');
var coins = require("./../app/coins.js");
var config = require("./../app/config.js");
var coreApi = require("./../app/api/coreApi.js");

router.get("/", function(req, res) {
	if (req.session.host == null || req.session.host.trim() == "") {
		if (req.cookies['rpc-host']) {
			res.locals.host = req.cookies['rpc-host'];
		}

		if (req.cookies['rpc-port']) {
			res.locals.port = req.cookies['rpc-port'];
		}

		if (req.cookies['rpc-username']) {
			res.locals.username = req.cookies['rpc-username'];
		}

		res.render("connect");
		res.end();

		return;
	}

	var promises = [];

	promises.push(coreApi.getMempoolInfo());
	promises.push(coreApi.getMiningInfo());

	var chainTxStatsIntervals = [ 144, 144 * 7, 144 * 30, 144 * 265 ];
	res.locals.chainTxStatsLabels = [ "24 hours", "1 week", "1 month", "1 year", "All time" ];
	for (var i = 0; i < chainTxStatsIntervals.length; i++) {
		promises.push(coreApi.getChainTxStats(chainTxStatsIntervals[i]));
	}

	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.getblockchaininfo = getblockchaininfo;

		var blockHeights = [];
		if (getblockchaininfo.blocks) {
			for (var i = 0; i < 10; i++) {
				blockHeights.push(getblockchaininfo.blocks - i);
			}
		}

		promises.push(coreApi.getChainTxStats(getblockchaininfo.blocks - 1));

		coreApi.getBlocksByHeight(blockHeights).then(function(latestBlocks) {
			res.locals.latestBlocks = latestBlocks;

			Promise.all(promises).then(function(promiseResults) {
				res.locals.mempoolInfo = promiseResults[0];
				res.locals.miningInfo = promiseResults[1];

				var chainTxStats = [];
				for (var i = 0; i < res.locals.chainTxStatsLabels.length; i++) {
					chainTxStats.push(promiseResults[i + 2]);
				}

				res.locals.chainTxStats = chainTxStats;

				res.render("index");
			});
		});
	}).catch(function(err) {
		res.locals.userMessage = "Error loading recent blocks: " + err;

		res.render("index");
	});
});

router.get("/node-status", function(req, res) {
	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.getblockchaininfo = getblockchaininfo;

		coreApi.getNetworkInfo().then(function(getnetworkinfo) {
			res.locals.getnetworkinfo = getnetworkinfo;

			coreApi.getUptimeSeconds().then(function(uptimeSeconds) {
				res.locals.uptimeSeconds = uptimeSeconds;

				coreApi.getNetTotals().then(function(getnettotals) {
					res.locals.getnettotals = getnettotals;

					res.render("node-status");

				}).catch(function(err) {
					res.locals.userMessage = "Error getting node status: (id=0), err=" + err;

					res.render("node-status");
				});
			}).catch(function(err) {
				res.locals.userMessage = "Error getting node status: (id=1), err=" + err;

				res.render("node-status");
			});
		}).catch(function(err) {
			res.locals.userMessage = "Error getting node status: (id=2), err=" + err;

			res.render("node-status");
		});
	}).catch(function(err) {
		res.locals.userMessage = "Error getting node status: (id=3), err=" + err;

		res.render("node-status");
	});
});

router.get("/mempool-summary", function(req, res) {
	coreApi.getMempoolInfo().then(function(getmempoolinfo) {
		res.locals.getmempoolinfo = getmempoolinfo;

		coreApi.getMempoolStats().then(function(mempoolstats) {
			res.locals.mempoolstats = mempoolstats;

			res.render("mempool-summary");
		});
	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("mempool-summary");
	});
});

router.get("/peers", function(req, res) {
	coreApi.getPeerSummary().then(function(peerSummary) {
		res.locals.peerSummary = peerSummary;

		res.render("peers");

	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("peers");
	});
});

router.post("/connect", function(req, res) {
	var host = req.body.host;
	var port = req.body.port;
	var username = req.body.username;
	var password = req.body.password;

	res.cookie('rpc-host', host);
	res.cookie('rpc-port', port);
	res.cookie('rpc-username', username);

	req.session.host = host;
	req.session.port = port;
	req.session.username = username;

	var client = new bitcoinCore({
		host: host,
		port: port,
		username: username,
		password: password,
		timeout: 30000
	});

	console.log("created client: " + client);

	global.client = client;

	req.session.userMessage = "<strong>Connected via RPC</strong>: " + username + " @ " + host + ":" + port;
	req.session.userMessageType = "success";

	res.redirect("/");
});

router.get("/disconnect", function(req, res) {
	res.cookie('rpc-host', "");
	res.cookie('rpc-port', "");
	res.cookie('rpc-username', "");

	req.session.host = "";
	req.session.port = "";
	req.session.username = "";

	console.log("destroyed client.");

	global.client = null;

	req.session.userMessage = "Disconnected from node.";
	req.session.userMessageType = "success";

	res.redirect("/");
});

router.get("/changeSetting", function(req, res) {
	if (req.query.name) {
		req.session[req.query.name] = req.query.value;

		res.cookie('user-setting-' + req.query.name, req.query.value);
	}

	res.redirect(req.headers.referer);
});

router.get("/blocks", function(req, res) {
	var limit = config.site.browseBlocksPageSize;
	var offset = 0;
	var sort = "desc";

	if (req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	if (req.query.sort) {
		sort = req.query.sort;
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.sort = sort;
	res.locals.paginationBaseUrl = "/blocks";

	coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
		res.locals.blockCount = getblockchaininfo.blocks;
		res.locals.blockOffset = offset;

		var blockHeights = [];
		if (sort == "desc") {
			for (var i = (getblockchaininfo.blocks - offset); i > (getblockchaininfo.blocks - offset - limit); i--) {
				if (i >= 0) {
					blockHeights.push(i);
				}
			}
		} else {
			for (var i = offset; i < (offset + limit); i++) {
				if (i >= 0) {
					blockHeights.push(i);
				}
			}
		}
		
		coreApi.getBlocksByHeight(blockHeights).then(function(blocks) {
			res.locals.blocks = blocks;

			res.render("blocks");
		});
	}).catch(function(err) {
		res.locals.userMessage = "Error: " + err;

		res.render("blocks");
	});
});

router.post("/search", function(req, res) {
	if (!req.body.query) {
		req.session.userMessage = "Enter a block height, block hash, or transaction id.";

		res.redirect("/");

		return;
	}

	var query = req.body.query.toLowerCase().trim();
	var rawCaseQuery = req.body.query.trim();

	req.session.query = req.body.query;

	if (query.length == 64) {
		coreApi.getRawTransaction(query).then(function(tx) {
			if (tx) {
				res.redirect("/tx/" + query);

				return;
			}

			coreApi.getBlockByHash(query).then(function(blockByHash) {
				if (blockByHash) {
					res.redirect("/block/" + query);

					return;
				}

				coreApi.getAddress(rawCaseQuery).then(function(validateaddress) {
					if (validateaddress && validateaddress.isvalid) {
						res.redirect("/address/" + rawCaseQuery);

						return;
					}
				});

				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");

			}).catch(function(err) {
				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");
			});

		}).catch(function(err) {
			coreApi.getBlockByHash(query).then(function(blockByHash) {
				if (blockByHash) {
					res.redirect("/block/" + query);

					return;
				}

				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");

			}).catch(function(err) {
				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");
			});
		});

	} else if (!isNaN(query)) {
		coreApi.getBlockByHeight(parseInt(query)).then(function(blockByHeight) {
			if (blockByHeight) {
				res.redirect("/block-height/" + query);

				return;
			}

			req.session.userMessage = "No results found for query: " + query;

			res.redirect("/");
		});
	} else {
		coreApi.getAddress(rawCaseQuery).then(function(validateaddress) {
			if (validateaddress && validateaddress.isvalid) {
				res.redirect("/address/" + rawCaseQuery);

				return;
			}

			req.session.userMessage = "No results found for query: " + rawCaseQuery;

			res.redirect("/");
		});
	}
});

router.get("/block-height/:blockHeight", function(req, res) {
	var blockHeight = parseInt(req.params.blockHeight);

	res.locals.blockHeight = blockHeight;

	res.locals.result = {};

	var limit = config.site.blockTxPageSize;
	var offset = 0;

	// for demo sites, keep page sizes static
	if (!config.demoSite && req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.paginationBaseUrl = "/block-height/" + blockHeight;

	coreApi.getBlockByHeight(blockHeight).then(function(result) {
		res.locals.result.getblockbyheight = result;

		coreApi.getBlockByHashWithTransactions(result.hash, limit, offset).then(function(result) {
			res.locals.result.getblock = result.getblock;
			res.locals.result.transactions = result.transactions;
			res.locals.result.txInputsByTransaction = result.txInputsByTransaction;

			res.render("block");
		});
	});
});

router.get("/block/:blockHash", function(req, res) {
	var blockHash = req.params.blockHash;

	res.locals.blockHash = blockHash;

	res.locals.result = {};

	var limit = config.site.blockTxPageSize;
	var offset = 0;

	// for demo sites, keep page sizes static
	if (!config.demoSite && req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.paginationBaseUrl = "/block/" + blockHash;

	// TODO handle RPC error
	coreApi.getBlockByHashWithTransactions(blockHash, limit, offset).then(function(result) {
		res.locals.result.getblock = result.getblock;
		res.locals.result.transactions = result.transactions;
		res.locals.result.txInputsByTransaction = result.txInputsByTransaction;

		res.render("block");
	});
});

router.get("/tx/:transactionId", function(req, res) {
	var txid = req.params.transactionId;

	var output = -1;
	if (req.query.output) {
		output = parseInt(req.query.output);
	}

	res.locals.txid = txid;
	res.locals.output = output;

	res.locals.result = {};

	coreApi.getRawTransaction(txid).then(function(rawTxResult) {
		res.locals.result.getrawtransaction = rawTxResult;

		client.command('getblock', rawTxResult.blockhash, function(err3, result3, resHeaders3) {
			res.locals.result.getblock = result3;

			var txids = [];
			for (var i = 0; i < rawTxResult.vin.length; i++) {
				if (!rawTxResult.vin[i].coinbase) {
					txids.push(rawTxResult.vin[i].txid);
				}
			}

			coreApi.getRawTransactions(txids).then(function(txInputs) {
				res.locals.result.txInputs = txInputs;

				res.render("transaction");
			});
		});
	}).catch(function(err) {
		res.locals.userMessage = "Failed to load transaction with txid=" + txid + ": " + err;

		res.render("transaction");
	});
});

router.get("/address/:address", function(req, res) {
	var address = req.params.address;

	res.locals.address = address;
	
	res.locals.result = {};

	try {
		res.locals.addressObj = bitcoinjs.address.fromBase58Check(address);

	} catch (err) {
		console.log("Error u3gr02gwef: " + err);

		try {
			res.locals.addressObj = bitcoinjs.address.fromBech32(address);

		} catch (err2) {
			console.log("Error u02qg02yqge: " + err2);
		}
	}

	if (global.miningPoolsConfig.payout_addresses[address]) {
		res.locals.payoutAddressForMiner = global.miningPoolsConfig.payout_addresses[address];
	}
	
	coreApi.getAddress(address).then(function(result) {
		res.locals.result.validateaddress = result;

		qrcode.toDataURL(address, function(err, url) {
			if (err) {
				console.log("Error 93ygfew0ygf2gf2: " + err);
			}

			res.locals.addressQrCodeUrl = url;

			res.render("address");
		});
	}).catch(function(err) {
		res.locals.userMessage = "Failed to load address " + address + " (" + err + ")";

		res.render("address");
	});
});

router.get("/rpc-terminal", function(req, res) {
	if (!config.demoSite) {
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		var match = config.ipWhitelistForRpcCommands.exec(ip);

		if (!match) {
			res.send("RPC Terminal / Browser may not be accessed from '" + ip + "'. This restriction can be modified in your config.js file.");

			return;
		}
	}

	res.render("terminal");
});

router.post("/rpc-terminal", function(req, res) {
	if (!config.demoSite) {
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		var match = config.ipWhitelistForRpcCommands.exec(ip);

		if (!match) {
			res.send("RPC Terminal / Browser may not be accessed from '" + ip + "'. This restriction can be modified in your config.js file.");

			return;
		}
	}

	var params = req.body.cmd.trim().split(/\s+/);
	var cmd = params.shift();
	var parsedParams = [];

	params.forEach(function(param, i) {
		if (!isNaN(param)) {
			parsedParams.push(parseInt(param));

		} else {
			parsedParams.push(param);
		}
	});

	if (config.rpcBlacklist.includes(cmd.toLowerCase())) {
		res.write("Sorry, that RPC command is blacklisted. If this is your server, you may allow this command by removing it from the 'rpcBlacklist' setting in config.js.", function() {
			res.end();
		});

		return;
	}

	client.command([{method:cmd, parameters:parsedParams}], function(err, result, resHeaders) {
		console.log("Result[1]: " + JSON.stringify(result, null, 4));
		console.log("Error[2]: " + JSON.stringify(err, null, 4));
		console.log("Headers[3]: " + JSON.stringify(resHeaders, null, 4));

		if (err) {
			console.log(JSON.stringify(err, null, 4));

			res.write(JSON.stringify(err, null, 4), function() {
				res.end();
			});

		} else if (result) {
			res.write(JSON.stringify(result, null, 4), function() {
				res.end();
			});

		} else {
			res.write(JSON.stringify({"Error":"No response from node"}, null, 4), function() {
				res.end();
			});
		}
	});
});

router.get("/rpc-browser", function(req, res) {
	if (!config.demoSite) {
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		var match = config.ipWhitelistForRpcCommands.exec(ip);

		if (!match) {
			res.send("RPC Terminal / Browser may not be accessed from '" + ip + "'. This restriction can be modified in your config.js file.");

			return;
		}
	}

	coreApi.getHelp().then(function(result) {
		res.locals.gethelp = result;

		if (req.query.method) {
			res.locals.method = req.query.method;

			coreApi.getRpcMethodHelp(req.query.method.trim()).then(function(result2) {
				res.locals.methodhelp = result2;

				if (req.query.execute) {
					var argDetails = result2.args;
					var argValues = [];

					if (req.query.args) {
						for (var i = 0; i < req.query.args.length; i++) {
							var argProperties = argDetails[i].properties;

							for (var j = 0; j < argProperties.length; j++) {
								if (argProperties[j] == "numeric") {
									if (req.query.args[i] == null || req.query.args[i] == "") {
										argValues.push(null);

									} else {
										argValues.push(parseInt(req.query.args[i]));
									}

									break;

								} else if (argProperties[j] == "boolean") {
									if (req.query.args[i]) {
										argValues.push(req.query.args[i] == "true");
									}

									break;

								} else if (argProperties[j] == "string") {
									if (req.query.args[i]) {
										argValues.push(req.query.args[i]);
									}

									break;
								}
							}
						}
					}

					res.locals.argValues = argValues;

					if (config.rpcBlacklist.includes(req.query.method.toLowerCase())) {
						res.locals.methodResult = "Sorry, that RPC command is blacklisted. If this is your server, you may allow this command by removing it from the 'rpcBlacklist' setting in config.js.";

						res.render("browser");

						return;
					}

					console.log("Executing RPC '" + req.query.method + "' with params: [" + argValues + "]");

					client.command([{method:req.query.method, parameters:argValues}], function(err3, result3, resHeaders3) {
						console.log("RPC Response: err=" + err3 + ", result=" + result3 + ", headers=" + resHeaders3);

						if (err3) {
							if (result3) {
								res.locals.methodResult = {error:("" + err3), result:result3};
								
							} else {
								res.locals.methodResult = {error:("" + err3)};
							}
						} else if (result3) {
							res.locals.methodResult = result3;

						} else {
							res.locals.methodResult = {"Error":"No response from node."};
						}

						res.render("browser");
					});
				} else {
					res.render("browser");
				}
			}).catch(function(err) {
				res.locals.userMessage = "Error loading help content for method " + req.query.method + ": " + err;

				res.render("browser");
			});

		} else {
			res.render("browser");
		}

	}).catch(function(err) {
		res.locals.userMessage = "Error loading help content: " + err;

		res.render("browser");
	});
});

router.get("/about", function(req, res) {
	res.render("about");
});

router.get("/fun", function(req, res) {
	var sortedList = coins[config.coin].historicalData;
	sortedList.sort(function(a, b){
		return ((a.date > b.date) ? 1 : -1);
	});

	res.locals.historicalData = sortedList;
	
	res.render("fun");
});

module.exports = router;
