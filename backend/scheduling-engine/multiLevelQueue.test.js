const MultiLevelQueueScheduler = require('./multiLevelQueue');

describe('MultiLevelQueueScheduler', () => {
  test('starts empty', () => {
    const scheduler = new MultiLevelQueueScheduler();
    expect(scheduler.isEmpty()).toBe(true);
    expect(scheduler.size()).toBe(0);
    expect(scheduler.serveNext()).toBeNull();
  });

  test('enqueues and serves a single patient', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });

    expect(scheduler.size()).toBe(1);
    const result = scheduler.serveNext();
    expect(result.patient.id).toBe('p1');
    expect(result.level).toBe('walkIn');
    expect(scheduler.isEmpty()).toBe(true);
  });

  test('routes patients to the correct internal queue by category and type', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'emergency-1', category: 'emergency', type: 'walk-in' });
    scheduler.enqueue({ id: 'critical-1', category: 'critical', type: 'booked' });
    scheduler.enqueue({ id: 'elderly-1', category: 'elderly', type: 'booked' });
    scheduler.enqueue({ id: 'disabled-1', category: 'disabled', type: 'walk-in' });
    scheduler.enqueue({ id: 'regular-booked-1', category: 'regular', type: 'booked' });
    scheduler.enqueue({ id: 'regular-walkin-1', category: 'regular', type: 'walk-in' });

    expect(scheduler.queues.emergency.toArray().map((p) => p.id)).toEqual([
      'emergency-1',
      'critical-1',
    ]);
    expect(scheduler.queues.elderlyOrDisabled.toArray().map((p) => p.id)).toEqual([
      'elderly-1',
      'disabled-1',
    ]);
    expect(scheduler.queues.booked.toArray().map((p) => p.id)).toEqual(['regular-booked-1']);
    expect(scheduler.queues.walkIn.toArray().map((p) => p.id)).toEqual(['regular-walkin-1']);
  });

  test('serves simultaneous arrivals within the same level in arrival order', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });
    scheduler.enqueue({ id: 'p2', category: 'regular', type: 'walk-in' });
    scheduler.enqueue({ id: 'p3', category: 'regular', type: 'walk-in' });

    expect(scheduler.serveNext().patient.id).toBe('p1');
    expect(scheduler.serveNext().patient.id).toBe('p2');
    expect(scheduler.serveNext().patient.id).toBe('p3');
  });

  test('drains emergency first, then elderly/disabled, before booked or walk-in', () => {
    const scheduler = new MultiLevelQueueScheduler();
    const now = Date.now();
    scheduler.enqueue({ id: 'regular-1', category: 'regular', type: 'walk-in', queuedAt: now });
    scheduler.enqueue({ id: 'elderly-1', category: 'elderly', type: 'walk-in', queuedAt: now });
    scheduler.enqueue({ id: 'emergency-1', category: 'emergency', type: 'walk-in', queuedAt: now });

    expect(scheduler.serveNext(now).patient.id).toBe('emergency-1');
    expect(scheduler.serveNext(now).patient.id).toBe('elderly-1');
    expect(scheduler.serveNext(now).patient.id).toBe('regular-1');
  });

  test('alternates fairly between booked and walk-in when neither emergency nor elderly/disabled are queued', () => {
    const scheduler = new MultiLevelQueueScheduler();
    const now = Date.now();
    scheduler.enqueue({ id: 'booked-1', category: 'regular', type: 'booked', queuedAt: now });
    scheduler.enqueue({ id: 'booked-2', category: 'regular', type: 'booked', queuedAt: now });
    scheduler.enqueue({ id: 'walkin-1', category: 'regular', type: 'walk-in', queuedAt: now });
    scheduler.enqueue({ id: 'walkin-2', category: 'regular', type: 'walk-in', queuedAt: now });

    const order = [
      scheduler.serveNext(now).patient.id,
      scheduler.serveNext(now).patient.id,
      scheduler.serveNext(now).patient.id,
      scheduler.serveNext(now).patient.id,
    ];

    expect(order).toEqual(['booked-1', 'walkin-1', 'booked-2', 'walkin-2']);
  });

  test('remove() takes a patient out of whichever internal queue holds them', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });
    scheduler.enqueue({ id: 'p2', category: 'elderly', type: 'booked' });

    const removed = scheduler.remove('p2');
    expect(removed.id).toBe('p2');
    expect(scheduler.size()).toBe(1);
    expect(scheduler.remove('missing')).toBeNull();
  });

  test('starvation prevention: aging eventually serves a regular walk-in patient despite continuous emergency arrivals', () => {
    const scheduler = new MultiLevelQueueScheduler(15 * 60 * 1000);
    const start = Date.now();
    scheduler.enqueue({ id: 'walkin-1', category: 'regular', type: 'walk-in', queuedAt: start });

    for (let i = 0; i < 5; i += 1) {
      scheduler.enqueue({
        id: `emergency-${i}`,
        category: 'emergency',
        type: 'walk-in',
        queuedAt: start + i * 1000,
      });
    }

    // Before the aging threshold is reached, emergencies still win.
    const early = scheduler.serveNext(start + 1000);
    expect(early.patient.category).toBe('emergency');

    // More emergencies keep arriving while the walk-in patient waits.
    scheduler.enqueue({
      id: 'emergency-late',
      category: 'emergency',
      type: 'walk-in',
      queuedAt: start + 2000,
    });

    // Once the walk-in patient's wait exceeds the aging threshold, they are
    // promoted ahead of everything else, even with emergencies still queued.
    const later = scheduler.serveNext(start + 16 * 60 * 1000);
    expect(later.patient.id).toBe('walkin-1');
    expect(scheduler.queues.emergency.isEmpty()).toBe(false);
  });
});
