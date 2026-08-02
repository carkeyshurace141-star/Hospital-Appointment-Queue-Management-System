const { computeMetrics, jainsFairnessIndex, average } = require('./metrics');

describe('average', () => {
  test('returns 0 for an empty array', () => {
    expect(average([])).toBe(0);
  });

  test('returns the arithmetic mean', () => {
    expect(average([2, 4, 6])).toBe(4);
  });
});

describe('jainsFairnessIndex', () => {
  test('returns 1 when every category has the same mean waiting time (perfectly fair)', () => {
    const results = [
      { category: 'emergency', waitingTime: 10 },
      { category: 'emergency', waitingTime: 10 },
      { category: 'regular', waitingTime: 10 },
    ];
    expect(jainsFairnessIndex(results)).toBe(1);
  });

  test('returns 0 for an empty result set', () => {
    expect(jainsFairnessIndex([])).toBe(0);
  });

  test('returns 1 when every category waited zero time', () => {
    const results = [
      { category: 'emergency', waitingTime: 0 },
      { category: 'regular', waitingTime: 0 },
    ];
    expect(jainsFairnessIndex(results)).toBe(1);
  });

  test('matches the hand-computed value for two categories with a 0/20 split', () => {
    // averages: emergency=0, regular=20 -> (0+20)^2 / (2 * (0^2+20^2)) = 400/800 = 0.5
    const results = [
      { category: 'emergency', waitingTime: 0 },
      { category: 'regular', waitingTime: 20 },
    ];
    expect(jainsFairnessIndex(results)).toBeCloseTo(0.5, 10);
  });

  test('uses the per-category MEAN, not per-patient values', () => {
    // regular averages to 10 (same as emergency's single value), so despite
    // 3 regular patients vs 1 emergency patient, this must still be 1.
    const results = [
      { category: 'emergency', waitingTime: 10 },
      { category: 'regular', waitingTime: 5 },
      { category: 'regular', waitingTime: 10 },
      { category: 'regular', waitingTime: 15 },
    ];
    expect(jainsFairnessIndex(results)).toBe(1);
  });
});

describe('computeMetrics', () => {
  function benchmarkResult(overrides = {}) {
    return {
      algorithm: 'fcfs',
      totalMinutes: 60,
      busyMinutes: 30,
      results: [
        { id: 'a', category: 'regular', type: 'walk-in', waitingTime: 0, responseTime: 0 },
        { id: 'b', category: 'regular', type: 'walk-in', waitingTime: 10, responseTime: 10 },
      ],
      ...overrides,
    };
  }

  test('computes waiting/response averages, throughput, and utilization', () => {
    const metrics = computeMetrics(benchmarkResult());

    expect(metrics.algorithm).toBe('fcfs');
    expect(metrics.patientCount).toBe(2);
    expect(metrics.averageWaitingTime).toBe(5);
    expect(metrics.averageResponseTime).toBe(5);
    expect(metrics.throughputPerHour).toBe(2); // 2 patients in 60 simulated minutes
    expect(metrics.resourceUtilization).toBe(0.5); // 30 busy / 60 total
  });

  test('uses the mocked satisfaction estimate when no real feedback is supplied', () => {
    const metrics = computeMetrics(benchmarkResult());
    // averageWaitingTime = 5 -> 5 - (4*5)/30 = 4.33
    expect(metrics.patientSatisfaction.source).toBe('mocked');
    expect(metrics.patientSatisfaction.value).toBeCloseTo(4.33, 2);
  });

  test('prefers real feedback ratings over the mocked estimate when supplied', () => {
    const metrics = computeMetrics(benchmarkResult(), { feedbackRatings: [4, 5, 3] });
    expect(metrics.patientSatisfaction).toEqual({ value: 4, source: 'real' });
  });

  test('returns zero throughput and utilization for a zero-duration run', () => {
    const metrics = computeMetrics(benchmarkResult({ totalMinutes: 0, busyMinutes: 0, results: [] }));
    expect(metrics.throughputPerHour).toBe(0);
    expect(metrics.resourceUtilization).toBe(0);
    expect(metrics.patientCount).toBe(0);
  });
});
