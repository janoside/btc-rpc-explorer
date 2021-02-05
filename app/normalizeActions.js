const buildNormalizingRegexes = (baseUrl) => {
	return [
		{ regex: new RegExp(`^${baseUrl}$`, "i"), action:"index" },
		{ regex: new RegExp(`^${baseUrl}block\-height\/.*`, "i"), action: "block-height" },
		{ regex: new RegExp(`^${baseUrl}block\/.*`, "i"), action: "block-hash" },
		{ regex: new RegExp(`^${baseUrl}block\-analysis\/.*`, "i"), action: "block-analysis" },
		{ regex: new RegExp(`^${baseUrl}tx\/.*`, "i"), action: "transaction" },
		{ regex: new RegExp(`^${baseUrl}address\/.*`, "i"), action: "address" },

		{ regex: new RegExp(`^${baseUrl}api/blocks-by-height\/.*`, "i"), action: "api.blocks-by-height" },
		{ regex: new RegExp(`^${baseUrl}api/block-headers-by-height\/.*`, "i"), action: "api.block-headers-by-height" },
		{ regex: new RegExp(`^${baseUrl}api/block-stats-by-height\/.*`, "i"), action: "api.block-stats-by-height" },
		{ regex: new RegExp(`^${baseUrl}api/mempool-txs\/.*`, "i"), action: "api.mempool-txs" },
		{ regex: new RegExp(`^${baseUrl}api/raw-tx-with-inputs\/.*`, "i"), action: "api.raw-tx-with-inputs" },
		{ regex: new RegExp(`^${baseUrl}api/block-tx-summaries\/.*`, "i"), action: "api.block-tx-summaries" },
		{ regex: new RegExp(`^${baseUrl}api/utils\/.*`, "i"), action: "api.utils-func" },

		
	];
}

module.exports = (baseUrl, prefix, action) => {
	const normalizingRegexes = buildNormalizingRegexes(baseUrl);

	for (let i = 0; i < normalizingRegexes.length; i++) {
		if (normalizingRegexes[i].regex.test(action)) {
			return prefix + normalizingRegexes[i].action;
		}
	}

	if (action.startsWith(baseUrl)) {
		return prefix + action.substring(baseUrl.length);
	}

	if (action == "*") {
		return prefix + action;
	}

	return action;
};