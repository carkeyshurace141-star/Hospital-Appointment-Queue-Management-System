// Time quantum in minutes: how much consultation time a patient is served
// before being requeued if their need is not yet fully met. 10 minutes is a
// typical short GP-style slot; tune per department if needed.
const DEFAULT_TIME_QUANTUM = 10;

// A patient who has been requeued this many times without being fully
// served is flagged as at risk of starvation.
const DEFAULT_MAX_STARVATION_CYCLES = 5;

class RoundRobinQueue {
  constructor(
    timeQuantum = DEFAULT_TIME_QUANTUM,
    maxStarvationCycles = DEFAULT_MAX_STARVATION_CYCLES,
  ) {
    this.timeQuantum = timeQuantum;
    this.maxStarvationCycles = maxStarvationCycles;
    this.items = [];
  }

  enqueue(patient) {
    this.items.push({ patient, waitCycles: 0 });
    return this.items.length;
  }

  // Plain FIFO dequeue, no requeueing. Useful when the caller does not care
  // about partial service (e.g. removing a patient outright).
  dequeue() {
    if (this.items.length === 0) return null;
    return this.items.shift().patient;
  }

  // Serves the patient at the front of the queue for one time quantum. If
  // their remaining service need exceeds the quantum, they are requeued at
  // the back with a reduced remaining need. Returns null on an empty queue.
  // Every patient still left in the queue after this call (including one
  // just requeued) accumulates a wait cycle, which powers the starvation guard.
  serveNext() {
    if (this.items.length === 0) return null;

    const entry = this.items.shift();
    const remainingNeed = entry.patient.remainingServiceNeed ?? entry.patient.serviceNeed ?? 0;
    const requeued = remainingNeed > this.timeQuantum;

    let servedPatient = entry.patient;

    if (requeued) {
      servedPatient = {
        ...entry.patient,
        remainingServiceNeed: remainingNeed - this.timeQuantum,
      };
      this.items.push({ patient: servedPatient, waitCycles: entry.waitCycles });
    }

    this.items.forEach((e) => {
      e.waitCycles += 1;
    });

    return { patient: servedPatient, requeued };
  }

  // Patients who have been waiting (requeued) at or beyond the starvation
  // threshold without being fully served.
  getStarvationRisk() {
    return this.items.filter((e) => e.waitCycles >= this.maxStarvationCycles).map((e) => e.patient);
  }

  // Removes the first patient matching the predicate, from any position in
  // the queue (not just the front). Returns the removed patient or null.
  remove(matcher) {
    const index = this.items.findIndex((e) => matcher(e.patient));
    if (index === -1) return null;
    return this.items.splice(index, 1)[0].patient;
  }

  // Non-mutating snapshot of patients in current queue order.
  toArray() {
    return this.items.map((e) => e.patient);
  }

  peek() {
    if (this.items.length === 0) return null;
    return this.items[0].patient;
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

module.exports = RoundRobinQueue;
