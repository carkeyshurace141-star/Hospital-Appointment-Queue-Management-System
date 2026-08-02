const { runBenchmark, ALGORITHMS } = require('./runBenchmark');

describe('runBenchmark', () => {
  test('a single patient is served immediately with zero wait, for every algorithm', () => {
    const arrivals = [
      { id: 'p1', category: 'regular', type: 'walk-in', consultationMinutes: 12, arrivalTime: 0 },
    ];

    for (const algorithm of ALGORITHMS) {
      const result = runBenchmark(arrivals, algorithm);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].waitingTime).toBe(0);
      expect(result.results[0].responseTime).toBe(0);
      expect(result.results[0].turnaroundTime).toBe(12);
    }
  });

  test('priority algorithm serves an emergency patient before an earlier-arriving regular patient', () => {
    // A "blocker" patient keeps the single server busy from t=0-5, so that
    // by the time the server frees up, both regular-1 (arrived at t=1) and
    // emergency-1 (arrived at t=3) are already waiting together — that's
    // the only point at which priority ordering actually has a choice to
    // make (non-preemptive: a patient already in service can't be bumped).
    const arrivals = [
      { id: 'blocker', category: 'regular', type: 'walk-in', consultationMinutes: 5, arrivalTime: 0 },
      { id: 'regular-1', category: 'regular', type: 'walk-in', consultationMinutes: 10, arrivalTime: 1 },
      { id: 'emergency-1', category: 'emergency', type: 'walk-in', consultationMinutes: 5, arrivalTime: 3 },
    ];

    const result = runBenchmark(arrivals, 'priority');
    const emergency = result.results.find((r) => r.id === 'emergency-1');
    const regular = result.results.find((r) => r.id === 'regular-1');

    expect(emergency.waitingTime).toBeLessThan(regular.waitingTime);
  });

  test('multi-level-queue eventually serves a regular walk-in even under a steady stream of emergencies (starvation prevention)', () => {
    const arrivals = [
      {
        id: 'regular-1',
        category: 'regular',
        type: 'walk-in',
        consultationMinutes: 5,
        arrivalTime: 0,
      },
    ];
    // An emergency patient every 5 simulated minutes for a long stretch —
    // long enough to blow past the 15-minute aging threshold many times
    // over if aging were broken.
    for (let i = 0; i < 30; i += 1) {
      arrivals.push({
        id: `emergency-${i}`,
        category: 'emergency',
        type: 'walk-in',
        consultationMinutes: 5,
        arrivalTime: i * 5,
      });
    }

    const result = runBenchmark(arrivals, 'multi-level-queue');
    const regular = result.results.find((r) => r.id === 'regular-1');

    // Without priority aging, the regular walk-in would be stuck behind a
    // continuous stream of emergencies for the whole ~150-minute run.
    // Aging (15-minute threshold) should promote it well before then.
    expect(regular).toBeDefined();
    expect(regular.waitingTime).toBeLessThan(40);
  });

  test('total busy time never exceeds total elapsed simulated time', () => {
    const arrivals = [
      { id: 'p1', category: 'regular', type: 'walk-in', consultationMinutes: 8, arrivalTime: 0 },
      { id: 'p2', category: 'elderly', type: 'booked', consultationMinutes: 12, arrivalTime: 3 },
      { id: 'p3', category: 'disabled', type: 'walk-in', consultationMinutes: 6, arrivalTime: 20 },
    ];

    for (const algorithm of ALGORITHMS) {
      const result = runBenchmark(arrivals, algorithm);
      expect(result.busyMinutes).toBeLessThanOrEqual(result.totalMinutes);
      expect(result.results).toHaveLength(3);
    }
  });
});
