#!/usr/bin/env node
var os = require('os');
var path = require('path');
var dotenv = require("dotenv");
var fs = require('fs');
var request = require("request");

var utils = require("../app/utils.js");
var coins = require("../app/coins.js");

async function refreshMiningPoolsForCoin(coinName) {
	return new Promise(function(resolve, reject) {
		console.log(`Refreshing mining pools for ${coinName}...`);
		
		if (coins[coinName].miningPoolsConfigUrls) {
			var miningPoolsConfigDir = path.join(__dirname, "..", "public", "txt", "mining-pools-configs", coinName);
			fs.readdir(miningPoolsConfigDir, function(err, files) {
				if (err) {
					reject(`Unable to delete existing files from '${miningPoolsConfigDir}'`);

					return;
				}

				files.forEach(function(file) {
					// delete existing file
					fs.unlinkSync(path.join(miningPoolsConfigDir, file));
				});
			});

			var miningPoolsConfigUrls = coins[coinName].miningPoolsConfigUrls;

			var promises = [];

			console.log(`${miningPoolsConfigUrls.length} mining pool config(s) found for ${coinName}`);

			for (var i = 0; i < miningPoolsConfigUrls.length; i++) {
				promises.push(refreshMiningPoolConfig(coinName, i, miningPoolsConfigUrls[i]));
			}

			Promise.all(promises).then(function() {
				console.log(`Refreshed ${miningPoolsConfigUrls.length} mining pool config(s) for ${coinName}\n---------------------------------------------`);

				resolve();

			}).catch(function(err) {
				reject(err);
			});
		} else {
			console.log(`No mining pool URLs configured for ${coinName}`);

			reject(`No mining pool URLs configured for ${coinName}`);
		}
	});
}

async function refreshMiningPoolConfig(coinName, index, url) {
	return new Promise(function(resolve, reject) {
		request(url, function(error, response, body) {
			if (!error && response && response.statusCode && response.statusCode == 200) {
				var responseBody = JSON.parse(body);

				var filename = path.join(__dirname, "..", "public", "txt", "mining-pools-configs", coinName, index + ".json");

				fs.writeFileSync(filename, body, function(err) {
					console.log(`Error writing file '${filename}': ${err}`);
				});

				console.log(`Wrote '${coinName}/${index}.json' with contents of url: ${url}`);

				resolve();
				
			} else {
				console.log(`Error downloading mining pool config for ${coinName}: url=${url}`);

				reject(error);
			}
		});
	});
}

async function refreshAllMiningPoolConfigs() {
	var outerPromises = [];

	for (var i = 0; i < coins.coins.length; i++) {
		var coinName = coins.coins[i];

		await refreshMiningPoolsForCoin(coinName);
	}
}

refreshAllMiningPoolConfigs();

