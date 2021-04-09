const statNames = [
	"process.cpu",
	"process.mem_mb",
	"mem.heap.used",
	"mem.heap.limit",
	"os.loadavg.1min",
	"os.loadavg.5min"
];

const dataPointsToKeep = 100;
const appStats = {};

const trackAppStats = (name, stats) => {
	if (statNames.includes(name)) {
		if (!appStats[name]) {
			appStats[name] = [];
		}

		dataset = appStats[name];

		if (stats.max) {
			dataset.push({time:new Date().getTime(), value: stats.max});
		}

		while (dataset.length > dataPointsToKeep) {
			dataset.shift();
		}
	}
};

module.exports = {
	trackAppStats: trackAppStats,
	appStats: appStats,
	statNames: statNames
}