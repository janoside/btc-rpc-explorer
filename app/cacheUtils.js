"use strict";

const debug = require("debug");
const debugLog = debug("btcexp:cache");

const utils = require("./utils.js");


const LRU = require("lru-cache");


const watchKeysRegex = /regexToMatchCacheKeysForDebugLogging/;

function createMemoryLruCache(cacheName, cacheObj, onCacheEvent) {
	return {
		get: (key) => {
			return new Promise((resolve, reject) => {
				onCacheEvent("memory", "try", key);

				var val = cacheObj.get(key);

				if (val != null) {
					onCacheEvent("memory", "hit", key);

					if (key.match(watchKeysRegex)) {
						debugLog(`cache.${cacheName}[${key}]: HIT  (${utils.addThousandsSeparators(JSON.stringify(val).length)} B)`);
					}
				} else {
					onCacheEvent("memory", "miss", key);

					if (key.match(watchKeysRegex)) {
						debugLog(`cache.${cacheName}[${key}]: MISS`);
					}
				}

				resolve(val);
			});
		},
		set: (key, obj, maxAge) => {
			cacheObj.set(key, obj, {ttl: maxAge});

			if (key.match(watchKeysRegex)) {
				debugLog(`cache.${cacheName}[${key}]: SET  (${utils.addThousandsSeparators(JSON.stringify(obj).length)} B), T=${maxAge}`);
			}

			onCacheEvent("memory", "set", key);
		},
		del: (key) => {
			cacheObj.delete(key);

			onCacheEvent("memory", "del", key);

			if (key.match(watchKeysRegex)) {
				debugLog(`cache.${cacheName}[${key}]: DEL`);
			}
		}
	}
}

function tryCache(cacheKey, cacheObjs, index, resolve, reject) {
	if (index == cacheObjs.length) {
		resolve(null);

		return;
	}

	cacheObjs[index].get(cacheKey).then((result) => {
		if (result != null) {
			resolve(result);

		} else {
			tryCache(cacheKey, cacheObjs, index + 1, resolve, reject);
		}
	});
}

function createTieredCache(cacheObjs) {
	return {
		get:(key) => {
			return new Promise((resolve, reject) => {
				tryCache(key, cacheObjs, 0, resolve, reject);
			});
		},
		set:(key, obj, maxAge) => {
			for (var i = 0; i < cacheObjs.length; i++) {
				cacheObjs[i].set(key, obj, maxAge);
			}
		}
	}
}

function lruCache(size) {
	return new LRU({
		max: size
	});
}

module.exports = {
	lruCache: lruCache,
	createMemoryLruCache: createMemoryLruCache,
	createTieredCache: createTieredCache
}