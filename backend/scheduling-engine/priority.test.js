const PriorityQueue = require('./priority');

describe('PriorityQueue', () => {
  test('starts empty', () => {
    const queue = new PriorityQueue();
    expect(queue.size()).toBe(0);
    expect(queue.peek()).toBeNull();
  });

  test('enqueues and dequeues a single patient', () => {
    const queue = new PriorityQueue();
    queue.enqueue({ id: 'p1', category: 'regular' });

    expect(queue.size()).toBe(1);
    expect(queue.peek()).toEqual({ id: 'p1', category: 'regular' });

    const dequeued = queue.dequeue();
    expect(dequeued).toEqual({ id: 'p1', category: 'regular' });
    expect(queue.size()).toBe(0);
  });

  test('serves higher-ranked categories before lower-ranked ones', () => {
    const queue = new PriorityQueue();
    queue.enqueue({ id: 'regular-1', category: 'regular' });
    queue.enqueue({ id: 'critical-1', category: 'critical' });
    queue.enqueue({ id: 'emergency-1', category: 'emergency' });
    queue.enqueue({ id: 'elderly-1', category: 'elderly' });

    expect(queue.dequeue().id).toBe('emergency-1');
    expect(queue.dequeue().id).toBe('critical-1');
    expect(queue.dequeue().id).toBe('elderly-1');
    expect(queue.dequeue().id).toBe('regular-1');
  });

  test('keeps arrival order stable for simultaneous arrivals of the same rank', () => {
    const queue = new PriorityQueue();
    queue.enqueue({ id: 'elderly-1', category: 'elderly' });
    queue.enqueue({ id: 'disabled-1', category: 'disabled' });
    queue.enqueue({ id: 'elderly-2', category: 'elderly' });

    expect(queue.dequeue().id).toBe('elderly-1');
    expect(queue.dequeue().id).toBe('disabled-1');
    expect(queue.dequeue().id).toBe('elderly-2');
  });

  test('emergency override: a newly enqueued emergency patient jumps ahead of every non-emergency patient', () => {
    const queue = new PriorityQueue();
    queue.enqueue({ id: 'regular-1', category: 'regular' });
    queue.enqueue({ id: 'critical-1', category: 'critical' });
    queue.enqueue({ id: 'elderly-1', category: 'elderly' });
    queue.enqueue({ id: 'emergency-1', category: 'emergency' });

    expect(queue.peek().id).toBe('emergency-1');
  });

  test('dequeue on an empty queue does not throw and returns null', () => {
    const queue = new PriorityQueue();
    expect(() => queue.dequeue()).not.toThrow();
    expect(queue.dequeue()).toBeNull();
  });

  test('isEmpty reflects queue state', () => {
    const queue = new PriorityQueue();
    expect(queue.isEmpty()).toBe(true);

    queue.enqueue({ id: 'p1', category: 'regular' });
    expect(queue.isEmpty()).toBe(false);

    queue.dequeue();
    expect(queue.isEmpty()).toBe(true);
  });
});
