var config = require("./../config.js");
var coins = require("../coins.js");
var utils = require("../utils.js");

var coinConfig = coins[config.coin];

var electrumAddressApi = require("./electrumAddressApi.js");
var blockchainAddressApi = require("./blockchainAddressApi.js");
var blockchairAddressApi = require("./blockchairAddressApi.js");
var blockcypherAddressApi = require("./blockcypherAddressApi.js");

function getSupportedAddressApis() {
	return ["blockchain.com", "blockchair.com", "blockcypher.com", "electrumx", "bwt"];
}

function getCurrentAddressApiFeatureSupport() {
	if (config.addressApi == "blockchain.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: true
		};

	} else if (config.addressApi == "blockchair.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: false
		};

	} else if (config.addressApi == "blockcypher.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: false
		};

	} else if (config.addressApi == "electrumx" || config.addressApi == "bwt") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: true
		};
	}
}

function getAddressDetails(address, scriptPubkey, sort, limit, offset) {
	return new Promise(function(resolve, reject) {
		var promises = [];

		if (config.addressApi == "blockchain.com") {
			promises.push(blockchainAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "blockchair.com") {
			promises.push(blockchairAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "blockcypher.com") {
			promises.push(blockcypherAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "electrumx" || config.addressApi == "bwt") {
			promises.push(electrumAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else {
			promises.push(new Promise(function(resolve, reject) {
				resolve({addressDetails:null, errors:["No address API configured"]});
			}));
		}

		Promise.all(promises).then(function(results) {
			if (results && results.length > 0) {
				resolve(results[0]);

			} else {
				resolve(null);
			}
		}).catch(function(err) {
			reject(err);
		});
	});
}



module.exports = {
	getSupportedAddressApis: getSupportedAddressApis,
	getCurrentAddressApiFeatureSupport: getCurrentAddressApiFeatureSupport,
	getAddressDetails: getAddressDetails
};