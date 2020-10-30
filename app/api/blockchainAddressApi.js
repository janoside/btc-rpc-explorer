var request = require("request");
var utils = require("./../utils.js");


function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(function(resolve, reject) {
		if (address.startsWith("grs1")) {
			reject({userText:"blockchain.com API does not support bc1 (native Segwit) addresses"});

			return;
		}

		if (sort == "asc") {
			// need to query the total number of tx first, then build paging info from that value
			var options = {
				url: `https://blockchain.info/rawaddr/${address}?limit=1`,
				headers: {
					'User-Agent': 'request'
				}
			};

			request(options, function(error, response, body) {
				if (error == null && response && response.statusCode && response.statusCode == 200) {
					var blockchainJson = JSON.parse(body);

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

				} else {
					var fullError = {error:error, response:response, body:body};

					utils.logError("we0f8hasd0fhas", fullError);

					reject(fullError);
				}
			});
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
	return new Promise(function(resolve, reject) {
		var options = {
			url: `https://blockchain.info/rawaddr/${address}?limit=${limit}&offset=${offset}`,
			headers: {
				'User-Agent': 'request'
			}
		};

		request(options, function(error, response, body) {
			if (error == null && response && response.statusCode && response.statusCode == 200) {
				var blockchainJson = JSON.parse(body);

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

			} else {
				var fullError = {error:error, response:response, body:body};

				utils.logError("32907shsghs", fullError);

				reject(fullError);
			}
		});
	});
}


module.exports = {
	getAddressDetails: getAddressDetails
};
