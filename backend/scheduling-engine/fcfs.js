// Standalone FCFS (first-come-first-served) baseline queue.
// Not wired into any route yet - later weeks will build priority scheduling on top of this.
class FCFSQueue {
  constructor() {
    this.items = [];
  }

  enqueue(patient) {
    this.items.push(patient);
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

module.exports = FCFSQueue;
