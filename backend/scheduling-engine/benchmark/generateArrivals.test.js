const { generateArrivals, CATEGORIES } = require('./generateArrivals');

describe('generateArrivals', () => {
  test('produces exactly `count` arrivals', () => {
    const arrivals = generateArrivals({ count: 25, seed: 1 });
    expect(arrivals).toHaveLength(25);
  });

  test('is deterministic for the same seed', () => {
    const first = generateArrivals({ count: 40, seed: 42, pattern: 'bursty' });
    const second = generateArrivals({ count: 40, seed: 42, pattern: 'bursty' });
    expect(second).toEqual(first);
  });

  test('produces different arrivals for a different seed', () => {
    const first = generateArrivals({ count: 40, seed: 1 });
    const second = generateArrivals({ count: 40, seed: 2 });
    expect(second).not.toEqual(first);
  });

  test('arrival times are non-decreasing (sorted)', () => {
    const arrivals = generateArrivals({ count: 60, seed: 7, pattern: 'bursty' });
    for (let i = 1; i < arrivals.length; i += 1) {
      expect(arrivals[i].arrivalTime).toBeGreaterThanOrEqual(arrivals[i - 1].arrivalTime);
    }
  });

  test('every arrival has a valid category and a consultation length within bounds', () => {
    const arrivals = generateArrivals({
      count: 50,
      seed: 3,
      minConsultationMinutes: 5,
      maxConsultationMinutes: 20,
    });
    for (const arrival of arrivals) {
      expect(CATEGORIES).toContain(arrival.category);
      expect(['booked', 'walk-in']).toContain(arrival.type);
      expect(arrival.consultationMinutes).toBeGreaterThanOrEqual(5);
      expect(arrival.consultationMinutes).toBeLessThanOrEqual(20);
    }
  });

  test('rejects a non-positive count', () => {
    expect(() => generateArrivals({ count: 0 })).toThrow(/positive integer/);
    expect(() => generateArrivals({ count: -5 })).toThrow(/positive integer/);
  });

  test('rejects a categoryMix that does not sum to 1', () => {
    expect(() =>
      generateArrivals({ count: 10, categoryMix: { emergency: 0.5, regular: 0.4 } }),
    ).toThrow(/sum to 1/);
  });

  test('rejects a categoryMix with an unknown category key', () => {
    expect(() =>
      generateArrivals({ count: 10, categoryMix: { emergency: 0.5, alien: 0.5 } }),
    ).toThrow(/Unknown category/);
  });

  test('rejects an unsupported pattern', () => {
    expect(() => generateArrivals({ count: 10, pattern: 'chaotic' })).toThrow(/pattern must be/);
  });

  test('a categoryMix of a single category assigns every arrival that category', () => {
    const arrivals = generateArrivals({ count: 20, seed: 5, categoryMix: { regular: 1 } });
    expect(arrivals.every((a) => a.category === 'regular')).toBe(true);
  });
});
