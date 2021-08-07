"use strict";

const request = require("request");
const utils = require("./../utils.js");


function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(function(resolve, reject) {
		if (address.startsWith("grs1")) {
			reject({userText:"blockcypher.com API does not support grs1 (native Segwit) addresses"});

			return;
		}

		var limitOffset = limit + offset;
		var mainnetUrl = `https://api.blockcypher.com/v1/btc/main/addrs/${address}?limit=${limitOffset}`;
		var testnetUrl = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}?limit=${limitOffset}`;
		var url = (global.activeBlockchain == "main") ? mainnetUrl : ((global.activeBlockchain == "test") ? testnetUrl : mainnetUrl);

		var options = {
			url: url,
			headers: {
				'User-Agent': 'request'
			}
		};

		request(options, function(error, response, body) {
			if (error == null && response && response.statusCode && response.statusCode == 200) {
				var blockcypherJson = JSON.parse(body);

				var response = {};

				response.txids = [];
				response.blockHeightsByTxid = {};

				// blockcypher doesn't support offset for paging, so simulate up to the hard cap of 2,000
				for (var i = offset; i < Math.min(blockcypherJson.txrefs.length, limitOffset); i++) {
					var tx = blockcypherJson.txrefs[i];

					response.txids.push(tx.tx_hash);
					response.blockHeightsByTxid[tx.tx_hash] = tx.block_height;
				}

				response.txCount = blockcypherJson.n_tx;
				response.totalReceivedSat = blockcypherJson.total_received;
				response.totalSentSat = blockcypherJson.total_sent;
				response.balanceSat = blockcypherJson.final_balance;
				response.source = "blockcypher.com";

				resolve({addressDetails:response});

			} else {
				var fullError = {error:error, response:response, body:body};

				utils.logError("097wef0adsgadgs", fullError);

				reject(fullError);
			}
		});
	});
}


module.exports = {
	getAddressDetails: getAddressDetails
};
