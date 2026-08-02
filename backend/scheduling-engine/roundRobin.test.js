const RoundRobinQueue = require('./roundRobin');

describe('RoundRobinQueue', () => {
  test('starts empty', () => {
    const queue = new RoundRobinQueue();
    expect(queue.size()).toBe(0);
    expect(queue.peek()).toBeNull();
    expect(queue.serveNext()).toBeNull();
  });

  test('serves a single patient whose need fits in one quantum and does not requeue them', () => {
    const queue = new RoundRobinQueue(10);
    queue.enqueue({ id: 'p1', serviceNeed: 5 });

    const result = queue.serveNext();
    expect(result).toEqual({ patient: { id: 'p1', serviceNeed: 5 }, requeued: false });
    expect(queue.isEmpty()).toBe(true);
  });

  test('serves multiple simultaneous arrivals in arrival order', () => {
    const queue = new RoundRobinQueue(10);
    queue.enqueue({ id: 'p1', serviceNeed: 5 });
    queue.enqueue({ id: 'p2', serviceNeed: 5 });
    queue.enqueue({ id: 'p3', serviceNeed: 5 });

    expect(queue.serveNext().patient.id).toBe('p1');
    expect(queue.serveNext().patient.id).toBe('p2');
    expect(queue.serveNext().patient.id).toBe('p3');
  });

  test('requeues a patient whose remaining need exceeds the time quantum', () => {
    const queue = new RoundRobinQueue(10);
    queue.enqueue({ id: 'p1', serviceNeed: 25 });
    queue.enqueue({ id: 'p2', serviceNeed: 5 });

    const first = queue.serveNext();
    expect(first.requeued).toBe(true);
    expect(first.patient.remainingServiceNeed).toBe(15);

    // p2 should now be served before the requeued p1
    expect(queue.serveNext().patient.id).toBe('p2');
    expect(queue.peek().id).toBe('p1');

    const second = queue.serveNext();
    expect(second.requeued).toBe(true);
    expect(second.patient.remainingServiceNeed).toBe(5);

    const third = queue.serveNext();
    expect(third.requeued).toBe(false);
  });

  test('flags a patient as at starvation risk once its wait cycles reach the threshold', () => {
    const queue = new RoundRobinQueue(1, 2);
    queue.enqueue({ id: 'p1', serviceNeed: 100 });
    queue.enqueue({ id: 'filler', serviceNeed: 1 });

    expect(queue.getStarvationRisk()).toEqual([]);

    queue.serveNext(); // p1 requeued (wait cycle 1), filler waits (wait cycle 1)
    queue.serveNext(); // filler served and leaves, p1 wait cycle reaches 2

    const atRisk = queue.getStarvationRisk();
    expect(atRisk.some((p) => p.id === 'p1')).toBe(true);
  });

  test('remove() takes a patient out from any position in the queue', () => {
    const queue = new RoundRobinQueue();
    queue.enqueue({ id: 'p1' });
    queue.enqueue({ id: 'p2' });
    queue.enqueue({ id: 'p3' });

    const removed = queue.remove((p) => p.id === 'p2');
    expect(removed).toEqual({ id: 'p2' });
    expect(queue.toArray().map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  test('remove() returns null when no patient matches', () => {
    const queue = new RoundRobinQueue();
    queue.enqueue({ id: 'p1' });
    expect(queue.remove((p) => p.id === 'missing')).toBeNull();
  });

  test('dequeue on an empty queue does not throw and returns null', () => {
    const queue = new RoundRobinQueue();
    expect(() => queue.dequeue()).not.toThrow();
    expect(queue.dequeue()).toBeNull();
  });

  test('isEmpty reflects queue state', () => {
    const queue = new RoundRobinQueue();
    expect(queue.isEmpty()).toBe(true);

    queue.enqueue({ id: 'p1' });
    expect(queue.isEmpty()).toBe(false);

    queue.dequeue();
    expect(queue.isEmpty()).toBe(true);
  });
});
