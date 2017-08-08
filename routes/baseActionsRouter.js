var express = require('express');
var router = express.Router();
var util = require('util');
var moment = require('moment');
var utils = require('./../app/utils');
var md5 = require("md5");
var env = require("./../app/env");
var bitcoin = require("bitcoin");
var rpcApi = require("./../app/rpcApi");

router.get("/", function(req, res) {
	if (!req.session.host) {
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

	var client = global.client;

	rpcApi.getInfo().then(function(getinfo) {
		res.locals.getinfo = getinfo;

		rpcApi.getMempoolInfo().then(function(getmempoolinfo) {
			res.locals.getmempoolinfo = getmempoolinfo;

			var blockHeights = [];
			if (getinfo.blocks) {
				for (var i = 0; i < 10; i++) {
					blockHeights.push(getinfo.blocks - i);
				}
			}

			rpcApi.getBlocksByHeight(blockHeights).then(function(latestBlocks) {
				res.locals.latestBlocks = latestBlocks;

				res.render("index");
			});
		});
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

	var client = new bitcoin.Client({
		host: host,
		port: port,
		user: username,
		pass: password,
		timeout: 30000
	});

	console.log("created client: " + client);

	global.client = client;

	req.session.userMessage = "<strong>Connected via RPC</strong>: " + username + " @ " + host + ":" + port;
	req.session.userMessageType = "success";

	res.redirect("/");
});

router.get("/blocks", function(req, res) {
	var limit = 20;
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

	rpcApi.getInfo().then(function(getinfo) {
		res.locals.blockCount = getinfo.blocks;
		res.locals.blockOffset = offset;

		var blockHeights = [];
		if (sort == "desc") {
			for (var i = (getinfo.blocks - offset); i > (getinfo.blocks - offset - limit); i--) {
				blockHeights.push(i);
			}
		} else {
			for (var i = offset; i < (offset + limit); i++) {
				blockHeights.push(i);
			}
		}
		
		rpcApi.getBlocksByHeight(blockHeights).then(function(blocks) {
			res.locals.blocks = blocks;

			res.render("blocks");
		});
	});
});

router.post("/search", function(req, res) {
	if (!req.body.query) {
		req.session.userMessage = "Enter a block height, block hash, or transaction id.";

		res.redirect("/");

		return;
	}

	var query = req.body.query;

	rpcApi.getRawTransaction(query).then(function(tx) {
		if (tx) {
			res.redirect("/tx/" + query);

			return;
		}

		rpcApi.getBlockByHash(query).then(function(blockByHash) {
			if (blockByHash) {
				res.redirect("/block/" + query);

				return;
			}

			if (isNaN(query)) {
				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");

				return;
			}

			rpcApi.getBlockByHeight(parseInt(query)).then(function(blockByHeight) {
				if (blockByHeight) {
					res.redirect("/block-height/" + query);

					return;
				}

				req.session.userMessage = "No results found for query: " + query;

				res.redirect("/");
			});
		});
	});
});

router.get("/block-height/:blockHeight", function(req, res) {
	var client = global.client;

	var blockHeight = parseInt(req.params.blockHeight);

	res.locals.blockHeight = blockHeight;

	res.locals.result = {};

	var limit = 20;
	var offset = 0;

	if (req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.paginationBaseUrl = "/block-height/" + blockHeight;

	client.cmd('getblockhash', blockHeight, function(err, result, resHeaders) {
		if (err) {
			return console.log(err);
		}

		res.locals.result.getblockhash = result;

		rpcApi.getBlockData(client, result, limit, offset).then(function(result) {
			res.locals.result.getblock = result.getblock;
			res.locals.result.transactions = result.transactions;
			res.locals.result.txInputsByTransaction = result.txInputsByTransaction;

			res.render("block-height");
		});
	});
});

router.get("/block/:blockHash", function(req, res) {
	var blockHash = req.params.blockHash;

	res.locals.blockHash = blockHash;

	res.locals.result = {};

	var limit = 20;
	var offset = 0;

	if (req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	if (req.query.offset) {
		offset = parseInt(req.query.offset);
	}

	res.locals.limit = limit;
	res.locals.offset = offset;
	res.locals.paginationBaseUrl = "/block/" + blockHash;

	rpcApi.getBlockData(client, blockHash, limit, offset).then(function(result) {
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

	rpcApi.getRawTransaction(txid).then(function(rawTxResult) {
		res.locals.result.getrawtransaction = rawTxResult;

		client.cmd('getblock', rawTxResult.blockhash, function(err3, result3, resHeaders3) {
			res.locals.result.getblock = result3;

			var txids = [];
			for (var i = 0; i < rawTxResult.vin.length; i++) {
				if (!rawTxResult.vin[i].coinbase) {
					txids.push(rawTxResult.vin[i].txid);
				}
			}

			rpcApi.getRawTransactions(txids).then(function(txInputs) {
				res.locals.result.txInputs = txInputs;

				res.render("transaction");
			});
		});
	});
});

router.get("/terminal", function(req, res) {
	res.render("terminal");
});

router.post("/terminal", function(req, res) {
	client.cmd(req.body.cmd, function(err, result, resHeaders) {
		console.log(result);
		console.log(err);
		console.log(resHeaders);

		res.send(JSON.stringify(result, null, 4));
	});
});


module.exports = router;
