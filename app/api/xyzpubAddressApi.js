"use strict";

const config = require("./../config.js");
const coins = require("../coins.js");
const utils = require("../utils.js");

const coinConfig = coins[config.coin];

const coreApi = require("./coreApi.js");
const addressApi = require("./addressApi.js");

// 0 is receive
// 1 is change
function generateAddressesFromXyzPub(extendedPubkey, receiveOrChange, limit, offset){
	if(limit == undefined) limit = 20;
	if(offset == undefined) offset = 0;
	
	if(receiveOrChange == undefined) receiveOrChange = 0;
	
	let addresses = [];

	const xpub_tpub = global.activeBlockchain == "main" ? "xpub" : "tpub";
	const ypub_upub = global.activeBlockchain == "main" ? "ypub" : "upub";
	const zpub_vpub = global.activeBlockchain == "main" ? "zpub" : "vpub";

	// if xpub/ypub/zpub convert to address under path m/0/0
	if (extendedPubkey.match(/^(xpub|tpub).*$/)) {
		let xpub = extendedPubkey;
		if (!extendedPubkey.startsWith(xpub_tpub)) {
			xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
		}
		addresses = utils.bip32Addresses(xpub, "p2pkh", receiveOrChange, limit, offset);
	}
	else if (extendedPubkey.match(/^(ypub|upub).*$/)) {
		let xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
		addresses = utils.bip32Addresses(xpub, "p2sh(p2wpkh)", receiveOrChange, limit, offset);
	}
	else if (extendedPubkey.match(/^(zpub|vpub).*$/)) {
		let xpub = utils.xpubChangeVersionBytes(extendedPubkey, xpub_tpub);
		addresses = utils.bip32Addresses(xpub, "p2wpkh", receiveOrChange, limit, offset);
	}

	return addresses;
}

function getXyzPubDetails(extendedPubkey, limit){
	return new Promise(async function(resolve, reject) {		
		// limit == -1 means we get every address with a transaction and 20 addresses gap at the end. 	
		if(limit == undefined) limit = -1;
		var sort = "desc";
		const gapLimit = 20; // as per bip32
		
		var txLimit = 20; 
		var txOffset = 0;
		var addressCount = 0;
		var gapCount = {"0": 0, "1": 0}
		var outJson = {"txids": []};
		while((addressCount < limit) || limit == -1){ 
			for(var receiveOrChange = 0; receiveOrChange <= 1; receiveOrChange++){
				if(gapCount[receiveOrChange] < gapLimit){
					txOffset = 0;			
					var address = generateAddressesFromXyzPub(extendedPubkey, receiveOrChange, 1, addressCount);
					var result = await coreApi.getAddress(address[0]);
					if(result){
						var moreTx = true;
						while(moreTx){
							var detailsResult = await addressApi.getAddressDetails(result.address, result.scriptPubKey, sort, txLimit, txOffset);
							if(detailsResult && detailsResult.addressDetails && detailsResult.addressDetails.txids ) {
								if(detailsResult.addressDetails.txids.length == 0){				
									gapCount[receiveOrChange]++;
									moreTx = false;
								}
								else {
									outJson.txids = outJson.txids.concat(detailsResult.addressDetails.txids);
									if(detailsResult.addressDetails.txids.length < txLimit) moreTx = false;
								}
							}
							txOffset += txLimit;
						}
					}
				}
			}	
			addressCount++;
			
			// gap of 20 receive and change addresses found
			if (gapCount[0] >= gapLimit && gapCount[1] >= gapLimit) break;
		}
		
		// remove duplicate txid eg. receive and change address that have same txid
		let uniqueTxids = [];
		outJson.txids.forEach((txid) => {
			if (!uniqueTxids.includes(txid)) {
				uniqueTxids.push(txid);
			}
		});		
		outJson.txids = uniqueTxids;
		outJson.txCount = uniqueTxids.length;
		resolve(outJson);
		
	}).catch(function(err) {
			reject(err);
	});
}


module.exports = {
	getXyzPubDetails: getXyzPubDetails
};