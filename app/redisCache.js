"use strict";

const redis = require("redis");
const bluebird = require("bluebird");

const config = require("./config.js");
const utils = require("./utils.js");

const redisClient = null;
if (config.redisUrl) {
	bluebird.promisifyAll(redis.RedisClient.prototype);

	redisClient = redis.createClient({url:config.redisUrl});
}

function createCache(keyPrefix, onCacheEvent) {
	return {
		get: function(key) {
			const prefixedKey = `${keyPrefix}-${key}`;

			return new Promise(function(resolve, reject) {
				onCacheEvent("redis", "try", prefixedKey);

				redisClient.getAsync(prefixedKey).then(function(result) {
					if (result == null) {
						onCacheEvent("redis", "miss", prefixedKey);

						resolve(null);

					} else {
						onCacheEvent("redis", "hit", prefixedKey);

						resolve(JSON.parse(result));
					}
				}).catch(function(err) {
					onCacheEvent("redis", "error", prefixedKey);

					utils.logError("328rhwefghsdgsdss", err);

					reject(err);
				});
			});
		},
		set: function(key, obj, maxAgeMillis) {
			const prefixedKey = `${keyPrefix}-${key}`;

			redisClient.set(prefixedKey, JSON.stringify(obj), "PX", maxAgeMillis);
		}
	};
}

module.exports = {
	active: (redisClient != null),
	createCache: createCache
}