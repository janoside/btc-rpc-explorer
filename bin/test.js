const utils = require("../app/utils.js");

console.log("test");

global.activeBlockchain = "main";



(async () => {
	const perfResults = {};

	await utils.timePromise("abc", async () => {
		const x = utils.estimatedSupply(4802177);
		console.log("xxx: " + x);

	}, perfResults);

	console.log("perfResults: " + JSON.stringify(perfResults));

	process.exit(0);
})();
