function average(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Jain's Fairness Index: (Σxᵢ)² / (n · Σxᵢ²), where xᵢ is the MEAN waiting
// time for category i and n is the number of categories present in the
// run. Ranges 0 (maximally unfair) to 1 (every category waited equally
// long on average). This is computed per-category, not per-patient — e.g.
// a scheduler serving 1 emergency patient instantly and 99 regular
// patients quickly is still "fair" here if both category averages are
// close to each other, regardless of the very different patient counts.
function jainsFairnessIndex(results) {
  const byCategory = new Map();
  for (const result of results) {
    if (!byCategory.has(result.category)) byCategory.set(result.category, []);
    byCategory.get(result.category).push(result.waitingTime);
  }

  const categoryAverages = Array.from(byCategory.values()).map(average);
  if (categoryAverages.length === 0) return 0;

  const sum = categoryAverages.reduce((total, x) => total + x, 0);
  const sumOfSquares = categoryAverages.reduce((total, x) => total + x * x, 0);

  // Every category averaged zero wait — the fairest possible outcome.
  if (sumOfSquares === 0) return 1;

  return (sum * sum) / (categoryAverages.length * sumOfSquares);
}

// Minutes of average waiting time that fully erodes the mocked satisfaction
// score down to its floor (see mockedSatisfaction below).
const MOCK_SATISFACTION_MAX_WAIT_MINUTES = 30;

// MOCKED, not real feedback data: a rough satisfaction proxy used only for
// pure-synthetic benchmark runs that have no real Feedback.rating behind
// them. Assumes satisfaction falls off linearly from 5 (no wait) to 1
// (>= MOCK_SATISFACTION_MAX_WAIT_MINUTES average wait). Callers running the
// benchmark against real historical data should pass `feedbackRatings` to
// computeMetrics() instead — real data always takes priority over this.
function mockedSatisfaction(averageWaitingTime) {
  const cappedWait = Math.min(Math.max(averageWaitingTime, 0), MOCK_SATISFACTION_MAX_WAIT_MINUTES);
  const score = 5 - (4 * cappedWait) / MOCK_SATISFACTION_MAX_WAIT_MINUTES;
  return round2(score);
}

// Computes summary metrics for one runBenchmark() result. Pass
// `feedbackRatings` (an array of real Feedback.rating values, 1-5) when
// benchmarking against real historical data; omit it for synthetic runs,
// where patientSatisfaction falls back to the mocked estimate above.
function computeMetrics(benchmarkResult, { feedbackRatings } = {}) {
  const { algorithm, totalMinutes, busyMinutes, results } = benchmarkResult;

  const averageWaitingTime = average(results.map((r) => r.waitingTime));
  const averageResponseTime = average(results.map((r) => r.responseTime));
  const throughputPerHour = totalMinutes > 0 ? results.length / (totalMinutes / 60) : 0;
  const resourceUtilization = totalMinutes > 0 ? busyMinutes / totalMinutes : 0;
  const fairnessIndex = jainsFairnessIndex(results);

  const patientSatisfaction =
    feedbackRatings && feedbackRatings.length > 0
      ? { value: round2(average(feedbackRatings)), source: 'real' }
      : { value: mockedSatisfaction(averageWaitingTime), source: 'mocked' };

  return {
    algorithm,
    patientCount: results.length,
    averageWaitingTime: round2(averageWaitingTime),
    averageResponseTime: round2(averageResponseTime),
    throughputPerHour: round2(throughputPerHour),
    resourceUtilization: round2(resourceUtilization),
    fairnessIndex: round2(fairnessIndex),
    patientSatisfaction,
  };
}

module.exports = { computeMetrics, jainsFairnessIndex, average, round2 };
