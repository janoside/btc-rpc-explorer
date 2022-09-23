"use strict";

const LRU = require("lru-cache");

function createMemoryLruCache(cacheObj, onCacheEvent) {
	return {
		get: (key) => {
			return new Promise((resolve, reject) => {
				onCacheEvent("memory", "try", key);

				var val = cacheObj.get(key);

				if (val != null) {
					onCacheEvent("memory", "hit", key);

				} else {
					onCacheEvent("memory", "miss", key);
				}

				resolve(cacheObj.get(key));
			});
		},
		set: (key, obj, maxAge) => {
			cacheObj.set(key, obj, {ttl: maxAge});

			onCacheEvent("memory", "set", key);
		},
		del: (key) => {
			cacheObj.delete(key);

			onCacheEvent("memory", "del", key);
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