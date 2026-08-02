const MultiLevelQueueScheduler = require('../../scheduling-engine/multiLevelQueue');
const { removeAndPromoteNext } = require('./noShowHandler');

describe('removeAndPromoteNext', () => {
  test('removes the no-show patient and serves the next patient (happy path)', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });
    scheduler.enqueue({ id: 'p2', category: 'regular', type: 'walk-in' });

    const { removed, next } = removeAndPromoteNext(scheduler, 'p1');

    expect(removed.id).toBe('p1');
    expect(next.patient.id).toBe('p2');
    expect(scheduler.isEmpty()).toBe(true);
  });

  test('removes a no-show patient from the middle of the queue, not just the front', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });
    scheduler.enqueue({ id: 'p2', category: 'regular', type: 'walk-in' });
    scheduler.enqueue({ id: 'p3', category: 'regular', type: 'walk-in' });

    const { removed, next } = removeAndPromoteNext(scheduler, 'p2');

    expect(removed.id).toBe('p2');
    expect(next.patient.id).toBe('p1');
    expect(scheduler.size()).toBe(1);
  });

  test('handles an appointment id that is not in the scheduler (failure case)', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });

    const { removed, next } = removeAndPromoteNext(scheduler, 'missing');

    expect(removed).toBeNull();
    expect(next.patient.id).toBe('p1');
  });

  test('returns a null next patient when the scheduler is left empty', () => {
    const scheduler = new MultiLevelQueueScheduler();
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });

    const { removed, next } = removeAndPromoteNext(scheduler, 'p1');

    expect(removed.id).toBe('p1');
    expect(next).toBeNull();
  });
});
