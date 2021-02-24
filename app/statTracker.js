const debug = require("debug");
const debugLog = debug("statTracker");


let performanceStats = {};
const trackPerformance = (name, time) => {
	if (!performanceStats[name]) {
		performanceStats[name] = {
			min: time,
			max: time,
			sum: 0,
			count: 0,
			firstDate: new Date()
		};
	}

	if (time < performanceStats[name].min) {
		performanceStats[name].min = time;
	}

	if (time > performanceStats[name].max) {
		performanceStats[name].max = time;
	}

	performanceStats[name].count++;
	performanceStats[name].sum += time;
	performanceStats[name].avg = performanceStats[name].sum / performanceStats[name].count;
	performanceStats[name].lastDate = new Date();
};

let valueStats = {};
const trackValue = (name, val) => {
	if (!valueStats[name]) {
		valueStats[name] = {
			min: val,
			max: val,
			sum: 0,
			count: 0,
			firstDate: new Date()
		};
	}

	if (val < valueStats[name].min) {
		valueStats[name].min = val;
	}

	if (val > valueStats[name].max) {
		valueStats[name].max = val;
	}

	valueStats[name].count++;
	valueStats[name].sum += val;
	valueStats[name].avg = valueStats[name].sum / valueStats[name].count;
	valueStats[name].lastDate = new Date();
};

let eventStats = {};
const trackEvent = (name, count=1) => {
	if (!eventStats[name]) {
		eventStats[name] = 0;
	}

	eventStats[name] += count;
};

const processAndReset = (perfFunc, valueFunc, eventFunc) => {
	for (const [key, value] of Object.entries(performanceStats)) {
		perfFunc(key, value);

		//debugLog(key + ": " + JSON.stringify(value));
	}

	for (const [key, value] of Object.entries(valueStats)) {
		valueFunc(key, value);

		//debugLog(key + ": " + JSON.stringify(value));
	}

	for (const [key, value] of Object.entries(eventStats)) {
		eventFunc(key, {count:value});

		//debugLog(key + ": " + JSON.stringify(value));
	}

	performanceStats = {};
	valueStats = {};
	eventStats = {};
};

const currentStats = () => {
	return {
		performance: performanceStats,
		event: eventStats,
		value: valueStats
	};
};

module.exports = {
	trackPerformance: trackPerformance,
	trackValue: trackValue,
	trackEvent: trackEvent,
	
	currentStats: currentStats,
	processAndReset: processAndReset
};


