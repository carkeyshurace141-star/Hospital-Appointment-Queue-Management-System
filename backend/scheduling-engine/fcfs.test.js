const FCFSQueue = require('./fcfs');

describe('FCFSQueue', () => {
  test('starts empty', () => {
    const queue = new FCFSQueue();
    expect(queue.size()).toBe(0);
    expect(queue.peek()).toBeNull();
  });

  test('enqueues and dequeues a single patient', () => {
    const queue = new FCFSQueue();
    queue.enqueue({ id: 'p1' });

    expect(queue.size()).toBe(1);
    expect(queue.peek()).toEqual({ id: 'p1' });

    const dequeued = queue.dequeue();
    expect(dequeued).toEqual({ id: 'p1' });
    expect(queue.size()).toBe(0);
  });

  test('serves multiple patients in arrival order', () => {
    const queue = new FCFSQueue();
    queue.enqueue({ id: 'p1' });
    queue.enqueue({ id: 'p2' });
    queue.enqueue({ id: 'p3' });

    expect(queue.size()).toBe(3);
    expect(queue.dequeue()).toEqual({ id: 'p1' });
    expect(queue.dequeue()).toEqual({ id: 'p2' });
    expect(queue.dequeue()).toEqual({ id: 'p3' });
    expect(queue.size()).toBe(0);
  });

  test('dequeue on an empty queue does not throw and returns null', () => {
    const queue = new FCFSQueue();
    expect(() => queue.dequeue()).not.toThrow();
    expect(queue.dequeue()).toBeNull();
  });

  test('isEmpty reflects queue state', () => {
    const queue = new FCFSQueue();
    expect(queue.isEmpty()).toBe(true);

    queue.enqueue({ id: 'p1' });
    expect(queue.isEmpty()).toBe(false);

    queue.dequeue();
    expect(queue.isEmpty()).toBe(true);
  });
});
