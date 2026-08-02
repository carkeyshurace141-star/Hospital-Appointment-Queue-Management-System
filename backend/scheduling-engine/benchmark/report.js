#!/usr/bin/env node
// CLI entry point for the benchmark harness: node scheduling-engine/benchmark/report.js
// Runs low/typical/peak simulated load through all four scheduling
// algorithms, repeating each scenario (default 30 times) to smooth out
// randomness, then writes benchmark-results.json plus a console summary.
//
// Reproduce a specific run with: node scheduling-engine/benchmark/report.js --seed=<N> --repetitions=<N>
const fs = require('fs');
const path = require('path');
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

function parseArgs(argv) {
  const args = { seed: DEFAULT_SEED, repetitions: DEFAULT_REPETITIONS };
  for (const arg of argv) {
    const match = /^--(\w+)=(.+)$/.exec(arg);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'seed' || key === 'repetitions') args[key] = Number(value);
  }
  return args;
}

// Each repetition uses a different (but seed-derived, so still
// reproducible) arrival set, then results are averaged across repetitions
// to smooth out randomness in any single simulated run.
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

function printSummary(results) {
  for (const [scenarioName, perAlgorithm] of Object.entries(results)) {
    console.log(`\n=== ${scenarioName.toUpperCase()} LOAD ===`);
    // eslint-disable-next-line no-console
    console.table(perAlgorithm);
  }
}

function main() {
  const { seed, repetitions } = parseArgs(process.argv.slice(2));

  const results = {};
  for (const scenario of SCENARIOS) {
    results[scenario.name] = runScenario(scenario, seed, repetitions);
  }

  printSummary(results);

  const output = {
    generatedAt: new Date().toISOString(),
    seed,
    repetitions,
    results,
  };
  const outputPath = path.join(__dirname, 'benchmark-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${outputPath}`);
  console.log(`Reproduce with: node scheduling-engine/benchmark/report.js --seed=${seed} --repetitions=${repetitions}`);
}

main();
