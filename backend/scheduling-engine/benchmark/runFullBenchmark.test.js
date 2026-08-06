const { runFullBenchmark, SCENARIOS } = require('./runFullBenchmark');
const { ALGORITHMS } = require('./runBenchmark');

describe('runFullBenchmark', () => {
  test('returns averaged metrics for every scenario and algorithm', () => {
    const output = runFullBenchmark({ seed: 1, repetitions: 2 });

    expect(output.seed).toBe(1);
    expect(output.repetitions).toBe(2);
    expect(Object.keys(output.results)).toEqual(SCENARIOS.map((s) => s.name));

    for (const scenario of SCENARIOS) {
      for (const algorithm of ALGORITHMS) {
        const metrics = output.results[scenario.name][algorithm];
        expect(metrics).toEqual(
          expect.objectContaining({
            averageWaitingTime: expect.any(Number),
            averageResponseTime: expect.any(Number),
            throughputPerHour: expect.any(Number),
            resourceUtilization: expect.any(Number),
            fairnessIndex: expect.any(Number),
            patientCount: expect.any(Number),
            patientSatisfaction: expect.any(Number),
          }),
        );
      }
    }
  });

  test('is deterministic for a given seed (same seed produces identical results)', () => {
    const first = runFullBenchmark({ seed: 7, repetitions: 2 });
    const second = runFullBenchmark({ seed: 7, repetitions: 2 });

    expect(first.results).toEqual(second.results);
  });

  test('defaults to seed 1 and 30 repetitions when not specified', () => {
    const output = runFullBenchmark();

    expect(output.seed).toBe(1);
    expect(output.repetitions).toBe(30);
  });
});
