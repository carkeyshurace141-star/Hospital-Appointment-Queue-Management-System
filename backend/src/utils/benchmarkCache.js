// Holds the most recent algorithm-comparison benchmark, computed
// automatically once at server startup (see server.js) so the admin
// Reports page always has something to show without anyone running
// `npm run benchmark` by hand. The computation itself only takes a couple
// hundred milliseconds (see runFullBenchmark.test.js), so re-running it is
// cheap if this is ever empty.
const { runFullBenchmark } = require('../../scheduling-engine/benchmark/runFullBenchmark');

let cached = null;

function computeAndCacheBenchmark() {
  cached = runFullBenchmark();
  return cached;
}

function getCachedBenchmark() {
  return cached;
}

// Test-only escape hatch to reset state between test cases/suites.
function resetBenchmarkCache() {
  cached = null;
}

module.exports = { computeAndCacheBenchmark, getCachedBenchmark, resetBenchmarkCache };
