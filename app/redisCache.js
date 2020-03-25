var redis = require("redis");
var bluebird = require("bluebird");

var config = require("./config.js");
var utils = require("./utils.js");

var redisClient = null;
if (config.redisUrl) {
	bluebird.promisifyAll(redis.RedisClient.prototype);

	redisClient = redis.createClient({url:config.redisUrl});
}

function createCache(keyPrefix, onCacheEvent) {
	return {
		get: function(key) {
			var prefixedKey = `${keyPrefix}-${key}`;

			return new Promise(function(resolve, reject) {
				onCacheEvent("redis", "try", key);

				redisClient.getAsync(prefixedKey).then(function(result) {
					if (result == null) {
						onCacheEvent("redis", "miss", key);

						resolve(null);

					} else {
						onCacheEvent("redis", "hit", key);

						resolve(JSON.parse(result));
					}
				}).catch(function(err) {
					onCacheEvent("redis", "error", key);

					utils.logError("328rhwefghsdgsdss", err);

					reject(err);
				});
			});
		},
		set: function(key, obj, maxAgeMillis) {
			var prefixedKey = `${keyPrefix}-${key}`;

			redisClient.set(prefixedKey, JSON.stringify(obj), "PX", maxAgeMillis);
		}
	};
}

module.exports = {
	active: (redisClient != null),
	createCache: createCache
}