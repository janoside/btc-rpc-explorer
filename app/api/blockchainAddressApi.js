"use strict";

const axios = require("axios");
const utils = require("./../utils.js");


function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(async (resolve, reject) => {
		if (address.startsWith("bc1")) {
			reject({userText:"blockchain.com API does not support bc1 (native Segwit) addresses"});

			return;
		}

		if (sort == "asc") {
			// need to query the total number of tx first, then build  info from that value
			try {
				const response = await axios.get(
					`https://blockchain.info/rawaddr/${address}?limit=1`,
					{ headers: { 'User-Agent': 'axios' }});

				var blockchainJson = response.data;

				var txCount = blockchainJson.n_tx;
				var pageCount = parseInt(txCount / limit);
				var lastPageSize = limit;
				if (pageCount * limit < txCount) {
					lastPageSize = txCount - pageCount * limit;
				}

				var dynamicOffset = txCount - limit - offset;
				if (dynamicOffset < 0) {
					limit += dynamicOffset;
					dynamicOffset += limit;
				}

				getAddressDetailsSortDesc(address, limit, dynamicOffset).then(function(result) {
					result.txids.reverse();

					resolve({addressDetails:result});

				}).catch(function(err) {
					utils.logError("2308hsghse", err);

					reject(err);
				});

			} catch (err) {
				utils.logError("we0f8hasd0fhas", err);

				reject(fullError);
			}
		} else {
			getAddressDetailsSortDesc(address, limit, offset).then(function(result) {
				resolve({addressDetails:result});

			}).catch(function(err) {
				utils.logError("3208hwssse", err);

				reject(err);
			});
		}
	});
}

function getAddressDetailsSortDesc(address, limit, offset) {
	return new Promise(async (resolve, reject) => {
		try {
			const apiResponse = await axios.get(
				`https://blockchain.info/rawaddr/${address}?limit=${limit}&offset=${offset}`,
				{ headers: { 'User-Agent': 'axios' }});

			var blockchainJson = apiResponse.data;

			var response = {};

			response.txids = [];
			response.blockHeightsByTxid = {};
			blockchainJson.txs.forEach(function(tx) {
				response.txids.push(tx.hash);
				response.blockHeightsByTxid[tx.hash] = tx.block_height;
			});

			response.txCount = blockchainJson.n_tx;
			response.hash160 = blockchainJson.hash160;
			response.totalReceivedSat = blockchainJson.total_received;
			response.totalSentSat = blockchainJson.total_sent;
			response.balanceSat = blockchainJson.final_balance;
			response.source = "blockchain.com";

			resolve(response);

		} catch (err) {
			utils.logError("32907shsghs", err);

			reject(err);
		}
	});
}


module.exports = {
	getAddressDetails: getAddressDetails
};
