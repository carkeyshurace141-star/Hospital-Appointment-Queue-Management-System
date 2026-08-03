const RoundRobinQueue = require('./roundRobin');

// A patient waiting longer than this in a lower-priority internal queue is
// promoted to be served next, regardless of strict queue order — this is
// what guarantees a Regular patient is eventually served even under a
// constant stream of Emergency arrivals.
const DEFAULT_AGING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// Emergency is excluded: it is always served first and can never be
// preempted by an aged patient from a lower tier (see serveNext).
const AGEABLE_LEVELS = ['elderlyOrDisabled', 'booked', 'walkIn'];

function levelForPatient(patient) {
  if (patient.category === 'emergency' || patient.category === 'critical') return 'emergency';
  if (patient.category === 'elderly' || patient.category === 'disabled') return 'elderlyOrDisabled';
  return patient.type === 'walk-in' ? 'walkIn' : 'booked';
}

class MultiLevelQueueScheduler {
  constructor(agingThresholdMs = DEFAULT_AGING_THRESHOLD_MS) {
    this.agingThresholdMs = agingThresholdMs;
    this.queues = {
      emergency: new RoundRobinQueue(),
      elderlyOrDisabled: new RoundRobinQueue(),
      booked: new RoundRobinQueue(),
      walkIn: new RoundRobinQueue(),
    };
    // Primes alternation so `booked` is tried first the very first time
    // both booked and walk-in are populated.
    this.lastServedTier = 'walkIn';
  }

  enqueue(patient) {
    const level = levelForPatient(patient);
    const queuedPatient = { ...patient, queuedAt: patient.queuedAt ?? Date.now() };
    this.queues[level].enqueue(queuedPatient);
    return level;
  }

  // Removes a patient (matched by `id`) from whichever internal queue
  // currently holds them, wherever they sit in that queue. Returns the
  // removed patient or null if not found.
  remove(patientId) {
    for (const level of Object.keys(this.queues)) {
      const removed = this.queues[level].remove((p) => p.id === patientId);
      if (removed) return removed;
    }
    return null;
  }

  _findAgedCandidate(now) {
    let candidate = null;
    for (const level of AGEABLE_LEVELS) {
      const front = this.queues[level].peek();
      if (!front) continue;
      const waited = now - front.queuedAt;
      if (waited >= this.agingThresholdMs && (!candidate || waited > candidate.waited)) {
        candidate = { level, waited };
      }
    }
    return candidate;
  }

  // Serves the next patient. Emergency always drains first and can never be
  // preempted by aging — aging only decides ordering among the non-emergency
  // tiers. Once emergency is empty, aged patients (waited past the
  // threshold) are promoted ahead of everything else; otherwise
  // elderly/disabled drains next, then booked and walk-in alternate fairly.
  serveNext(now = Date.now()) {
    if (!this.queues.emergency.isEmpty()) return this._serveFrom('emergency');

    const aged = this._findAgedCandidate(now);
    if (aged) {
      return this._serveFrom(aged.level);
    }

    if (!this.queues.elderlyOrDisabled.isEmpty()) return this._serveFrom('elderlyOrDisabled');

    const alternationOrder =
      this.lastServedTier === 'booked' ? ['walkIn', 'booked'] : ['booked', 'walkIn'];
    for (const level of alternationOrder) {
      if (!this.queues[level].isEmpty()) return this._serveFrom(level);
    }

    return null;
  }

  _serveFrom(level) {
    const result = this.queues[level].serveNext();
    if (!result) return null;
    if (level === 'booked' || level === 'walkIn') {
      this.lastServedTier = level;
    }
    return { patient: result.patient, level, requeued: result.requeued };
  }

  // Non-mutating snapshot of every queued patient, in the order the
  // scheduler would serve them under normal (non-aged) priority.
  toArray() {
    return [
      ...this.queues.emergency.toArray(),
      ...this.queues.elderlyOrDisabled.toArray(),
      ...this.queues.booked.toArray(),
      ...this.queues.walkIn.toArray(),
    ];
  }

  isEmpty() {
    return Object.values(this.queues).every((q) => q.isEmpty());
  }

  size() {
    return Object.values(this.queues).reduce((total, q) => total + q.size(), 0);
  }
}

module.exports = MultiLevelQueueScheduler;
