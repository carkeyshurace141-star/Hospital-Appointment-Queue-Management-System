// Core benchmark logic shared by the CLI (report.js) and the automatic
// in-app run (see benchmarkCache.js / server.js) - runs low/typical/peak
// simulated load through all four scheduling algorithms, repeating each
// scenario (default 30 times, seed-derived so still reproducible) to smooth
// out randomness, and returns the averaged results as a plain object.
const { generateArrivals } = require('./generateArrivals');
const { runBenchmark, ALGORITHMS } = require('./runBenchmark');
const { computeMetrics, round2 } = require('./metrics');

const DEFAULT_SEED = 1;
const DEFAULT_REPETITIONS = 30;

const SCENARIOS = [
  { name: 'low', count: 30, pattern: 'steady' },
  { name: 'typical', count: 100, pattern: 'steady' },
  { name: 'peak', count: 150, pattern: 'bursty' },
];

const AVERAGED_KEYS = [
  'averageWaitingTime',
  'averageResponseTime',
  'throughputPerHour',
  'resourceUtilization',
  'fairnessIndex',
];

function averageMetrics(runs) {
  const averaged = {};
  for (const key of AVERAGED_KEYS) {
    averaged[key] = round2(runs.reduce((sum, run) => sum + run[key], 0) / runs.length);
  }
  averaged.patientCount = round2(runs.reduce((sum, run) => sum + run.patientCount, 0) / runs.length);
  averaged.patientSatisfaction = round2(
    runs.reduce((sum, run) => sum + run.patientSatisfaction.value, 0) / runs.length,
  );
  averaged.patientSatisfactionSource = runs[0].patientSatisfaction.source;
  return averaged;
}

function runScenario(scenario, seed, repetitions) {
  const perAlgorithm = {};
  for (const algorithm of ALGORITHMS) {
    const runs = [];
    for (let rep = 0; rep < repetitions; rep += 1) {
      const arrivals = generateArrivals({
        count: scenario.count,
        pattern: scenario.pattern,
        seed: seed + rep,
      });
      runs.push(computeMetrics(runBenchmark(arrivals, algorithm)));
    }
    perAlgorithm[algorithm] = averageMetrics(runs);
  }
  return perAlgorithm;
}

function runFullBenchmark({ seed = DEFAULT_SEED, repetitions = DEFAULT_REPETITIONS } = {}) {
  const results = {};
  for (const scenario of SCENARIOS) {
    results[scenario.name] = runScenario(scenario, seed, repetitions);
  }

  return {
    generatedAt: new Date().toISOString(),
    seed,
    repetitions,
    results,
  };
}

module.exports = { runFullBenchmark, DEFAULT_SEED, DEFAULT_REPETITIONS, SCENARIOS };
