"use strict";

process.env.BTCEXP_COIN = "BTC";

const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

global.cacheStats = {};

const rpcApi = require("../app/api/rpcApi.js");
const coreApi = require("../app/api/coreApi.js");
const internalApiRouter = require("../routes/internalApiRouter.js");

const originalGetAllMempoolTxids = rpcApi.getAllMempoolTxids;
const originalBuildMempoolSummary = coreApi.buildMempoolSummary;
const app = express();
const server = http.createServer(app);
let baseUrl;

app.use("/internal-api", internalApiRouter);

async function run() {
	rpcApi.getAllMempoolTxids = async () => [];

	const statusUpdates = [];
	const summary = await coreApi.buildMempoolSummary("empty-direct", 100, 100, update => {
		statusUpdates.push(update);
	});

	assert.equal(summary.count, 0);
	assert.equal(summary.totalWeight, 0);
	assert.equal(summary.totalBytes, 0);
	assert.equal(summary.totalFees.toString(), "0");
	assert.deepEqual(statusUpdates.at(-1), {count: 0, done: 0});
	assert.ok(summary.satoshiPerByteBuckets.length > 0);
	assert.ok(summary.satoshiPerByteBuckets.every(bucket => bucket.count === 0));
	assert.ok(summary.satoshiPerByteBucketCounts.every(count => count === 0));
	console.log("PASS core API builds an empty mempool summary");

	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	baseUrl = "http://127.0.0.1:" + server.address().port;

	const buildResponse = await fetch(baseUrl + "/internal-api/build-mempool-summary?statusId=empty-route", {
		signal: AbortSignal.timeout(2000)
	});
	assert.equal(buildResponse.status, 200);
	assert.deepEqual(await buildResponse.json(), {success: true, status: "started"});

	const summaryResponse = await fetch(baseUrl + "/internal-api/get-mempool-summary?statusId=empty-route", {
		signal: AbortSignal.timeout(2000)
	});
	assert.equal(summaryResponse.status, 200);
	const routeSummary = await summaryResponse.json();
	assert.equal(routeSummary.count, 0);
	assert.equal(routeSummary.totalWeight, 0);
	console.log("PASS internal API stores and returns an empty mempool summary");

	coreApi.buildMempoolSummary = async () => {
		throw new Error("Expected test failure.");
	};
	const failureResponse = await fetch(baseUrl + "/internal-api/build-mempool-summary?statusId=failed-route", {
		signal: AbortSignal.timeout(2000)
	});
	assert.equal(failureResponse.status, 500);
	assert.deepEqual(await failureResponse.json(), {
		success: false,
		error: "Failed to build mempool summary."
	});
	console.log("PASS internal API completes failed build requests with JSON HTTP 500");
}

run().catch(error => {
	console.error(error);
	process.exitCode = 1;
}).finally(() => {
	rpcApi.getAllMempoolTxids = originalGetAllMempoolTxids;
	coreApi.buildMempoolSummary = originalBuildMempoolSummary;
	if (server.listening) {
		server.close(() => process.exit(process.exitCode || 0));
	} else {
		process.exit(process.exitCode || 0);
	}
});
