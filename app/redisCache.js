"use strict";

const { createClient } = require("redis");

const config = require("./config.js");
const utils = require("./utils.js");

let redisClient = null;
if (config.redisUrl) {
	redisClient = createClient({url:config.redisUrl});
}

function createCache(keyPrefix, onCacheEvent) {
	return {
		get: async function(key) {
			if (!redisClient.isOpen) {
				await redisClient.connect();
			}

			const prefixedKey = `${keyPrefix}-${key}`;

			onCacheEvent("redis", "try", prefixedKey);

			try {
				let result = await redisClient.get(prefixedKey);

				if (result == null) {
					onCacheEvent("redis", "miss", prefixedKey);

					return null;

				} else {
					onCacheEvent("redis", "hit", prefixedKey);

					return JSON.parse(result);
				}
			} catch (err) {
				onCacheEvent("redis", "error", prefixedKey);

				utils.logError("328rhwefghsdgsdss", err, {key:prefixedKey});

				throw err;
			}
		},
		set: async function(key, obj, maxAgeMillis) {
			if (!redisClient.isOpen) {
				await redisClient.connect();
			}
			
			const prefixedKey = `${keyPrefix}-${key}`;

			await redisClient.set(prefixedKey, JSON.stringify(obj), "PX", maxAgeMillis);
		}
	};
}

module.exports = {
	active: (redisClient != null),
	createCache: createCache
}