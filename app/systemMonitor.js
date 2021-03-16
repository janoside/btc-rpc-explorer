const os = require("os");
const v8 = require("v8");
const pidusage = require("pidusage");
const statTracker = require("./statTracker.js");
const debug = require("debug")("systemMonitor");

try { var eventLoopStats = require("event-loop-stats"); }
catch (err) {
	debug("Failed loading event-loop-stats, skipping system monitor");
	return;
}

const systemMonitorInterval = setInterval(() => {
	pidusage(process.pid, (err, stat) => {
		if (err) {
			debug(err);
			return;
		}

		statTracker.trackValue("process.cpu", stat.cpu);
		statTracker.trackValue("process.mem_mb", stat.memory / 1024 / 1024);
		statTracker.trackValue("process.ctime", stat.ctime);
		statTracker.trackValue("process.uptime_s", stat.elapsed / 1000);

		let loadavg = os.loadavg();

		statTracker.trackValue("os.loadavg.1min", loadavg[0]);
		statTracker.trackValue("os.loadavg.5min", loadavg[1]);
		statTracker.trackValue("os.loadavg.15min", loadavg[2]);

		let heapStats = v8.getHeapStatistics();

		statTracker.trackValue("mem.heap.total", heapStats.total_heap_size / 1024 / 1024);
		statTracker.trackValue("mem.heap.total-executable", heapStats.total_heap_size_executable / 1024 / 1024);
		statTracker.trackValue("mem.heap.total-physical", heapStats.total_physical_size / 1024 / 1024);
		statTracker.trackValue("mem.heap.total-available", heapStats.total_available_size / 1024 / 1024);
		statTracker.trackValue("mem.heap.used", heapStats.used_heap_size / 1024 / 1024);
		statTracker.trackValue("mem.heap.limit", heapStats.heap_size_limit / 1024 / 1024);
		statTracker.trackValue("mem.malloced", heapStats.malloced_memory / 1024 / 1024);
		statTracker.trackValue("mem.malloced-peak", heapStats.peak_malloced_memory / 1024 / 1024);

		let loopStats = eventLoopStats.sense();

		statTracker.trackValue("eventloop.min", loopStats.min);
		statTracker.trackValue("eventloop.max", loopStats.max);
		statTracker.trackValue("eventloop.sum", loopStats.sum);
		statTracker.trackValue("eventloop.num", loopStats.num);
	});
}, process.env.SYSTEM_MONITOR_INTERVAL || 60 * 60 * 1000);

systemMonitorInterval.unref();