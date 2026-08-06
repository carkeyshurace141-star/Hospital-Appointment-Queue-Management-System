#!/usr/bin/env node
// CLI entry point for the benchmark harness: node scheduling-engine/benchmark/report.js
// Runs the same benchmark the backend now runs automatically on startup
// (see runFullBenchmark.js / server.js) and additionally writes
// benchmark-results.json plus a console summary - useful for inspecting a
// specific seed/repetition count without starting the server.
//
// Reproduce a specific run with: node scheduling-engine/benchmark/report.js --seed=<N> --repetitions=<N>
const fs = require('fs');
const path = require('path');
const { runFullBenchmark, DEFAULT_SEED, DEFAULT_REPETITIONS } = require('./runFullBenchmark');

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

function printSummary(results) {
  for (const [scenarioName, perAlgorithm] of Object.entries(results)) {
    console.log(`\n=== ${scenarioName.toUpperCase()} LOAD ===`);
    // eslint-disable-next-line no-console
    console.table(perAlgorithm);
  }
}

function main() {
  const { seed, repetitions } = parseArgs(process.argv.slice(2));

  const output = runFullBenchmark({ seed, repetitions });
  printSummary(output.results);

  const outputPath = path.join(__dirname, 'benchmark-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${outputPath}`);
  console.log(`Reproduce with: node scheduling-engine/benchmark/report.js --seed=${seed} --repetitions=${repetitions}`);
}

main();
