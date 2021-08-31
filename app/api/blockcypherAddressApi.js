"use strict";

const axios = require("axios");
const utils = require("./../utils.js");


function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(async (resolve, reject) => {
		if (address.startsWith("bc1")) {
			reject({userText:"blockcypher.com API does not support bc1 (native Segwit) addresses"});

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

		try {
			const apiResponse = await axios.get(
				url,
				{ headers: { "User-Agent": "axios" }});

			var blockcypherJson = apiResponse.data;

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

		} catch (err) {
			utils.logError("097wef0adsgadgs", err);

			reject(err);
		}
	});
}


module.exports = {
	getAddressDetails: getAddressDetails
};