var redis = require("redis");

var config = require("./config.js");
var utils = require("./utils.js");

var redisClient = null;
if (config.redisUrl) {
	bluebird.promisifyAll(redis.RedisClient.prototype);

	redisClient = redis.createClient({url:config.redisUrl});
}

function onCacheEvent(cacheType, hitOrMiss, cacheKey) {
	//console.log(`cache.${cacheType}.${hitOrMiss}: ${cacheKey}`);
}

var redisCache = {
	get:function(key) {
		return new Promise(function(resolve, reject) {
			redisClient.getAsync(key).then(function(result) {
				if (result == null) {
					onCacheEvent("redis", "miss", key);

					resolve(null);

					return;
				}

				onCacheEvent("redis", "hit", key);

				resolve(JSON.parse(result));

			}).catch(function(err) {
				utils.logError("328rhwefghsdgsdss", err);

				reject(err);
			});
		});
	},
	set:function(key, obj, maxAgeMillis) {
		redisClient.set(key, JSON.stringify(obj), "PX", maxAgeMillis);
	}
};

module.exports = {
	active: (redisClient != null),
	get: redisCache.get,
	set: redisCache.set
}