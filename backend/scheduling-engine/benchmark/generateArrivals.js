const CATEGORIES = ['emergency', 'critical', 'elderly', 'disabled', 'regular'];

const DEFAULT_CATEGORY_MIX = {
  emergency: 0.05,
  critical: 0.1,
  elderly: 0.15,
  disabled: 0.1,
  regular: 0.6,
};

// mulberry32: a small, fast, deterministic PRNG. Math.random() cannot be
// seeded, which would make benchmark runs unreproducible — this is what
// lets `report.js --seed=N` produce byte-identical results every time.
function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function validateCategoryMix(categoryMix) {
  const keys = Object.keys(categoryMix);
  for (const key of keys) {
    if (!CATEGORIES.includes(key)) {
      throw new Error(`Unknown category in categoryMix: ${key}`);
    }
  }
  const total = keys.reduce((sum, key) => sum + categoryMix[key], 0);
  if (Math.abs(total - 1) > 1e-6) {
    throw new Error(`categoryMix must sum to 1 (got ${total}).`);
  }
}

function pickCategory(randomValue, categoryMix, categories) {
  let cumulative = 0;
  for (const category of categories) {
    cumulative += categoryMix[category];
    if (randomValue < cumulative) return category;
  }
  return categories[categories.length - 1];
}

// Builds `count` arrival timestamps (in simulated minutes from t=0).
// 'steady': evenly spaced arrivals with small jitter (one patient every
// 3-7 minutes). 'bursty': clusters of 2-7 patients arriving within a
// couple of minutes of each other, separated by 10-30 minute lulls —
// modelling e.g. a walk-in rush after a bus/shift change.
function buildArrivalTimes(count, pattern, rng) {
  const times = [];
  let clock = 0;

  if (pattern === 'bursty') {
    let admitted = 0;
    while (admitted < count) {
      const burstSize = Math.min(count - admitted, 2 + Math.floor(rng() * 6));
      for (let i = 0; i < burstSize; i += 1) {
        times.push(clock + rng() * 2);
        admitted += 1;
      }
      clock += 10 + rng() * 20;
    }
  } else {
    for (let i = 0; i < count; i += 1) {
      clock += 3 + rng() * 4;
      times.push(clock);
    }
  }

  return times.sort((a, b) => a - b).map((t) => Math.round(t * 100) / 100);
}

// Generates a synthetic, deterministic (given the same seed) set of patient
// arrivals for the benchmark harness. Each arrival has an arrival time (in
// simulated minutes from t=0), a category, a booking type, and a bounded
// consultation duration.
function generateArrivals({
  count,
  categoryMix = DEFAULT_CATEGORY_MIX,
  pattern = 'steady',
  walkInRatio = 0.5,
  minConsultationMinutes = 5,
  maxConsultationMinutes = 20,
  seed = 1,
} = {}) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('count must be a positive integer.');
  }
  if (pattern !== 'steady' && pattern !== 'bursty') {
    throw new Error(`pattern must be "steady" or "bursty" (got "${pattern}").`);
  }
  validateCategoryMix(categoryMix);

  const rng = mulberry32(seed);
  const categories = Object.keys(categoryMix);
  const arrivalTimes = buildArrivalTimes(count, pattern, rng);

  return arrivalTimes.map((arrivalTime, index) => ({
    id: `sim-${index + 1}`,
    category: pickCategory(rng(), categoryMix, categories),
    type: rng() < walkInRatio ? 'walk-in' : 'booked',
    consultationMinutes:
      minConsultationMinutes +
      Math.floor(rng() * (maxConsultationMinutes - minConsultationMinutes + 1)),
    arrivalTime,
  }));
}

module.exports = { generateArrivals, mulberry32, DEFAULT_CATEGORY_MIX, CATEGORIES };
