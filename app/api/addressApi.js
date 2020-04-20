var config = require("./../config.js");
var coins = require("../coins.js");
var utils = require("../utils.js");

var coinConfig = coins[config.coin];

var electrumAddressApi = require("./electrumAddressApi.js");
var blockchairAddressApi = require("./blockchairAddressApi.js");

function getSupportedAddressApis() {
	return ["blockchair.com", "electrumx"];
}

function getCurrentAddressApiFeatureSupport() {
	if (config.addressApi == "blockchair.com") {
		return {
			pageNumbers: true,
			sortDesc: true,
			sortAsc: false
		};

	} else if (config.addressApi == "electrumx") {
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

		if (config.addressApi == "blockchair.com") {
			promises.push(blockchairAddressApi.getAddressDetails(address, scriptPubkey, sort, limit, offset));

		} else if (config.addressApi == "electrumx") {
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
			utils.logError("239x7rhsd0gs", err);

			reject(err);
		});
	});
}



module.exports = {
	getSupportedAddressApis: getSupportedAddressApis,
	getCurrentAddressApiFeatureSupport: getCurrentAddressApiFeatureSupport,
	getAddressDetails: getAddressDetails
};
