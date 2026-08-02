// Priority queue ranked by patient category. Lower rank number is served first.
// elderly and disabled share a rank, so between them arrival order decides.
const CATEGORY_RANK = {
  emergency: 0,
  critical: 1,
  elderly: 2,
  disabled: 2,
  regular: 3,
};

class PriorityQueue {
  constructor() {
    this.items = [];
  }

  // Inserts by rank, stable within a rank (keeps arrival order). Because
  // emergency is always the lowest rank number, an emergency patient is
  // always inserted ahead of every non-emergency patient already queued.
  enqueue(patient) {
    const rank = CATEGORY_RANK[patient.category];
    let insertAt = this.items.length;

    for (let i = 0; i < this.items.length; i += 1) {
      if (CATEGORY_RANK[this.items[i].category] > rank) {
        insertAt = i;
        break;
      }
    }

    this.items.splice(insertAt, 0, patient);
    return this.items.length;
  }

  dequeue() {
    if (this.items.length === 0) return null;
    return this.items.shift();
  }

  peek() {
    if (this.items.length === 0) return null;
    return this.items[0];
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

module.exports = PriorityQueue;
