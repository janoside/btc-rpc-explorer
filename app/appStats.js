const statNames = [
	"process.cpu",
	"process.mem_mb",
	"mem.heap.used",
	"mem.heap.limit",
	"os.loadavg.1min",
	"os.loadavg.5min"
];

const dataPointsToKeep = 60;
const downsamplesToKeep = 72;
const dataPointsPerDownsample = 6;
const appStats = {};
const downsampledAppStats = {};

const trackAppStats = (name, stats) => {
	if (statNames.includes(name)) {
		if (!appStats[name]) {
			appStats[name] = [];
			downsampledAppStats[name] = [];
		}

		dataset = appStats[name];

		if (stats.max) {
			dataset.push({time:new Date().getTime(), value: stats.max});
		}

		if (dataset.length > (dataPointsToKeep + dataPointsPerDownsample)) {
			var downsamplePoints = dataset.slice(0, dataPointsPerDownsample);
			var max = -Infinity;

			// find max of downsample
			downsamplePoints.forEach(x => { if (x.value > max) { max = x.value; } });

			downsampledAppStats[name].push({time:downsamplePoints[0].time, value:max});
			
			while (dataset.length > dataPointsToKeep) {
				dataset.shift();
			}
		}

		while (downsampledAppStats[name].length > downsamplesToKeep) {
			downsampledAppStats[name].shift();
		}
	}
};

const getAllAppStats = () => {
	var allStats = {};

	if (appStats[statNames[0]]) {
		for (var i = 0; i < statNames.length; i++) {
			if (downsampledAppStats[statNames[i]]) {
				allStats[statNames[i]] = downsampledAppStats[statNames[i]].concat(appStats[statNames[i]]);

			} else {
				allStats[statNames[i]] = appStats[statNames[i]];
			}
		}
	}

	return allStats;
};

module.exports = {
	trackAppStats: trackAppStats,
	statNames: statNames,
	getAllAppStats: getAllAppStats
};

