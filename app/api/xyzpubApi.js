"use strict";

const config = require("./../config.js");
const coins = require("../coins.js");
const utils = require("../utils.js");

const coinConfig = coins[config.coin];

const coreApi = require("./coreApi.js");
const addressApi = require("./addressApi.js");



function getKeyDetails(extendedPubkey) {
	let keyDetails = {
		keyType: extendedPubkey.substring(0, 4),
		relatedKeys: []
	};

	// if xpub/ypub/zpub convert to address under path m/0/0
	if (extendedPubkey.match(/^(xpub|tpub).*$/)) {
		keyDetails.outputType = "P2PKH";
		keyDetails.outputTypeDesc = "Pay to Public Key Hash";
		keyDetails.bip32Path = "m/44'/0'";

		const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
		const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";
		const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

		let xpub = extendedPubkey;
		if (!extendedPubkey.startsWith(xpub_tpub)) {
			xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
		}

		if (!extendedPubkey.startsWith(xpub_tpub)) {
			keyDetails.relatedKeys.push({
				keyType: xpub_tpub,
				key: utils.xpubChangeVersionBytes(xpub, xpub_tpub),
				outputType: "P2PKH",
				firstAddress: utils.bip32Addresses(xpub, "p2pkh", 0, 1, 0)[0]
			});
		}

		keyDetails.relatedKeys.push({
			keyType: ypub_upub,
			key: utils.xpubChangeVersionBytes(xpub, ypub_upub),
			outputType: "P2WPKH in P2SH",
			firstAddress: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 1, 0)[0]
		});

		keyDetails.relatedKeys.push({
			keyType: zpub_vpub,
			key: utils.xpubChangeVersionBytes(xpub, zpub_vpub),
			outputType: "P2WPKH",
			firstAddress: utils.bip32Addresses(xpub, "p2wpkh", 0, 1, 0)[0]
		});

	} else if (extendedPubkey.match(/^(ypub|upub).*$/)) {
		keyDetails.outputType = "P2WPKH in P2SH";
		keyDetails.outputTypeDesc = "Pay to Witness Public Key Hash (P2WPKH) wrapped inside Pay to Script Hash (P2SH), aka Wrapped Segwit";
		keyDetails.bip32Path = "m/49'/0'";

		const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
		const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

		const xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

		keyDetails.relatedKeys.push({
			keyType: xpub_tpub,
			key: xpub,
			outputType: "P2PKH",
			firstAddress: utils.bip32Addresses(xpub, "p2pkh", 0, 1, 0)[0]
		});

		keyDetails.relatedKeys.push({
			keyType: zpub_vpub,
			key: utils.xpubChangeVersionBytes(xpub, zpub_vpub),
			outputType: "P2WPKH",
			firstAddress: utils.bip32Addresses(xpub, "p2wpkh", 0, 1, 0)[0]
		});

	} else if (extendedPubkey.match(/^(zpub|vpub).*$/)) {
		keyDetails.outputType = "P2WPKH";
		keyDetails.outputTypeDesc = "Pay to Witness Public Key Hash, aka Native Segwit";
		keyDetails.bip32Path = "m/84'/0'";

		const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
		const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";

		const xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

		keyDetails.relatedKeys.push({
			keyType: xpub_tpub,
			key: xpub,
			outputType: "P2PKH",
			firstAddress: utils.bip32Addresses(xpub, "p2pkh", 0, 1, 0)[0]
		});

		keyDetails.relatedKeys.push({
			keyType: ypub_upub,
			key: utils.xpubChangeVersionBytes(xpub, ypub_upub),
			outputType: "P2WPKH in P2SH",
			firstAddress: utils.bip32Addresses(xpub, "p2sh(p2wpkh)", 0, 1, 0)[0]
		});

	} else if (extendedPubkey.startsWith("Ypub")) {
		keyDetails.outputType = "Multi-Sig P2WSH in P2SH";
		keyDetails.bip32Path = "-";

	} else if (extendedPubkey.startsWith("Zpub")) {
		keyDetails.outputType = "Multi-Sig P2WSH";
		keyDetails.bip32Path = "-";
	}

	return keyDetails;
}


// 0 is receive
// 1 is change
function getXpubAddresses(extendedPubkey, receiveOrChange=0, limit=20, offset=0) {
	const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
	const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";
	const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

	// if xpub/ypub/zpub convert to address under path m/0/0
	if (extendedPubkey.match(/^(xpub|tpub).*$/)) {
		let xpub = extendedPubkey;

		if (!extendedPubkey.startsWith(xpub_tpub)) {
			xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
		}

		return utils.bip32Addresses(xpub, "p2pkh", receiveOrChange, limit, offset);

	} else if (extendedPubkey.match(/^(ypub|upub).*$/)) {
		let xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

		return utils.bip32Addresses(xpub, "p2sh(p2wpkh)", receiveOrChange, limit, offset);

	} else if (extendedPubkey.match(/^(zpub|vpub).*$/)) {
		let xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);

		return utils.bip32Addresses(xpub, "p2wpkh", receiveOrChange, limit, offset);
	}

	return [];
}


// gapLimit=20, default as per bip32
async function searchXpubTxids(extendedPubkey, gapLimit=20, addressLimit=-1) {
	// addressLimit == -1 means we get every address with a transaction and 20 addresses gap at the end. 	
	let sort = "desc";
	
	let txLimit = 20;
	let txOffset = 0;
	let addressCount = 0;
	let gapCounts = {"0": 0, "1": 0};
	let result = {
		usedAddresses: [],
		emptyAddresses: {
			receive: [],
			change: []
		}
	};

	while ((addressCount < addressLimit) || addressLimit == -1) {
		for (let receiveOrChange = 0; receiveOrChange <= 1; receiveOrChange++) {
			if (gapCounts[receiveOrChange] < gapLimit) {
				txOffset = 0;

				let address = getXpubAddresses(extendedPubkey, receiveOrChange, 1, addressCount)[0];
				let getAddressResult = await coreApi.getAddress(address);

				if (getAddressResult) {
					let moreTx = true;

					while (moreTx) {
						let detailsResult = await addressApi.getAddressDetails(getAddressResult.address, getAddressResult.scriptPubKey, sort, txLimit, txOffset);

						if (detailsResult && detailsResult.addressDetails && detailsResult.addressDetails.txids) {
							if (detailsResult.addressDetails.txids.length == 0) {
								result.emptyAddresses[receiveOrChange == 0 ? "receive" : "change"].push(address);

								gapCounts[receiveOrChange]++;
								moreTx = false;

							} else {
								gapCounts[receiveOrChange] = 0;

								result.usedAddresses.push({
									addressIndex: addressCount,
									address: address,
									type: receiveOrChange == 0 ? "receive" : "change",
									txids: detailsResult.addressDetails.txids,
									priorGap: gapCounts[receiveOrChange]
								});

								if (detailsResult.addressDetails.txids.length < txLimit) {
									moreTx = false;
								}
							}
						} else {
							result.emptyAddresses[receiveOrChange == 0 ? "receive" : "change"].push(address);
						}

						txOffset += txLimit;
					}
				}
			}
		}

		addressCount++;
		
		// gap of N (20) receive and change addresses found
		if (gapCounts[0] >= gapLimit && gapCounts[1] >= gapLimit) {
			break;
		}
	}
	

	return result;
}


module.exports = {
	getKeyDetails: getKeyDetails,
	getXpubAddresses: getXpubAddresses,
	searchXpubTxids: searchXpubTxids
};

