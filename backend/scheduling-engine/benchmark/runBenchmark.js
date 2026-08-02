const FCFSQueue = require('../fcfs');
const PriorityQueue = require('../priority');
const RoundRobinQueue = require('../roundRobin');
const MultiLevelQueueScheduler = require('../multiLevelQueue');

// The simulated clock runs in minutes throughout this module (arrival
// times and consultation lengths from generateArrivals.js are already in
// minutes). RoundRobinQueue's timeQuantum is documented in minutes too, so
// it can be reused as-is. MultiLevelQueueScheduler's aging threshold is
// normally real wall-clock milliseconds — here it's given a value in the
// same "minutes" unit as this simulation's clock instead, since the class
// only compares `now - queuedAt` against it and doesn't care what unit
// that is, as long as it's consistent.
const ROUND_ROBIN_QUANTUM_MINUTES = 10;
const AGING_THRESHOLD_MINUTES = 15;

const ALGORITHMS = ['fcfs', 'priority', 'round-robin', 'multi-level-queue'];

function createEngine(algorithm) {
  switch (algorithm) {
    case 'fcfs':
      return { queue: new FCFSQueue(), mode: 'full' };
    case 'priority':
      return { queue: new PriorityQueue(), mode: 'full' };
    case 'round-robin':
      return {
        queue: new RoundRobinQueue(ROUND_ROBIN_QUANTUM_MINUTES),
        mode: 'quantum',
        quantum: ROUND_ROBIN_QUANTUM_MINUTES,
      };
    case 'multi-level-queue':
      return {
        queue: new MultiLevelQueueScheduler(AGING_THRESHOLD_MINUTES),
        mode: 'quantum-mlq',
        quantum: ROUND_ROBIN_QUANTUM_MINUTES,
      };
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

// Runs a single-server discrete-event simulation of `arrivals` (as produced
// by generateArrivals.js) through one scheduling algorithm's real
// production queue class. A single server is a deliberate simplification —
// this benchmark compares how each algorithm *orders* patients, not
// multi-doctor department capacity, which is out of scope here.
//
// Returns { algorithm, totalMinutes, busyMinutes, results }, where results
// has one entry per patient: waitingTime, responseTime, and turnaroundTime,
// all in simulated minutes.
function runBenchmark(arrivals, algorithm) {
  const { queue, mode, quantum } = createEngine(algorithm);
  const sorted = [...arrivals].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const stats = new Map();

  let clock = 0;
  let nextArrivalIndex = 0;
  let busyMinutes = 0;

  function admitArrivalsThrough(time) {
    while (nextArrivalIndex < sorted.length && sorted[nextArrivalIndex].arrivalTime <= time) {
      const arrival = sorted[nextArrivalIndex];
      queue.enqueue({
        id: arrival.id,
        category: arrival.category,
        type: arrival.type,
        serviceNeed: arrival.consultationMinutes,
        remainingServiceNeed: arrival.consultationMinutes,
        // Explicit, simulated-minutes queuedAt — MultiLevelQueueScheduler
        // would otherwise default this to a real Date.now() wall-clock
        // value, which is meaningless against this simulation's clock and
        // would silently disable priority aging.
        queuedAt: arrival.arrivalTime,
      });
      stats.set(arrival.id, {
        category: arrival.category,
        type: arrival.type,
        arrivalTime: arrival.arrivalTime,
        consultationMinutes: arrival.consultationMinutes,
        firstServedAt: null,
        completedAt: null,
      });
      nextArrivalIndex += 1;
    }
  }

  admitArrivalsThrough(0);

  while (nextArrivalIndex < sorted.length || !queue.isEmpty()) {
    if (queue.isEmpty()) {
      clock = sorted[nextArrivalIndex].arrivalTime;
      admitArrivalsThrough(clock);
      continue;
    }

    if (mode === 'full') {
      const patient = queue.dequeue();
      const record = stats.get(patient.id);
      record.firstServedAt = clock;
      clock += patient.serviceNeed;
      busyMinutes += patient.serviceNeed;
      admitArrivalsThrough(clock);
      record.completedAt = clock;
    } else {
      const result = mode === 'quantum-mlq' ? queue.serveNext(clock) : queue.serveNext();
      const record = stats.get(result.patient.id);
      if (record.firstServedAt === null) record.firstServedAt = clock;

      const consumed = result.requeued
        ? quantum
        : (result.patient.remainingServiceNeed ?? result.patient.serviceNeed ?? 0);

      clock += consumed;
      busyMinutes += consumed;
      admitArrivalsThrough(clock);
      if (!result.requeued) record.completedAt = clock;
    }
  }

  const results = Array.from(stats.entries()).map(([id, record]) => {
    const turnaroundTime = record.completedAt - record.arrivalTime;
    const waitingTime = turnaroundTime - record.consultationMinutes;
    const responseTime = record.firstServedAt - record.arrivalTime;
    return {
      id,
      category: record.category,
      type: record.type,
      waitingTime,
      responseTime,
      turnaroundTime,
    };
  });

  return { algorithm, totalMinutes: clock, busyMinutes, results };
}

module.exports = { runBenchmark, ALGORITHMS };
