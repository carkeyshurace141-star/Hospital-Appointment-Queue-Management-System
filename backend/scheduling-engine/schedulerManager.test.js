const MultiLevelQueueScheduler = require('./multiLevelQueue');
const {
  getScheduler,
  getCurrentServing,
  setCurrentServing,
  clearCurrentServing,
  getLastSkipped,
  setLastSkipped,
  clearLastSkipped,
  resetSchedulers,
} = require('./schedulerManager');

describe('schedulerManager', () => {
  afterEach(() => {
    resetSchedulers();
  });

  test('creates a new scheduler for a department not seen before', () => {
    const scheduler = getScheduler('dept-1');
    expect(scheduler).toBeInstanceOf(MultiLevelQueueScheduler);
    expect(scheduler.isEmpty()).toBe(true);
  });

  test('returns the same scheduler instance for the same department on repeated calls', () => {
    const first = getScheduler('dept-1');
    first.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });

    const second = getScheduler('dept-1');
    expect(second).toBe(first);
    expect(second.size()).toBe(1);
  });

  test('keeps schedulers for different departments independent', () => {
    const deptA = getScheduler('dept-a');
    const deptB = getScheduler('dept-b');

    deptA.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });

    expect(deptA.size()).toBe(1);
    expect(deptB.size()).toBe(0);
  });

  test('accepts an ObjectId-like value with a toString() method as the key', () => {
    const idLike = { toString: () => 'dept-1' };
    const scheduler = getScheduler(idLike);
    scheduler.enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });

    expect(getScheduler('dept-1').size()).toBe(1);
  });

  test('resetSchedulers() clears all in-memory state', () => {
    getScheduler('dept-1').enqueue({ id: 'p1', category: 'regular', type: 'walk-in' });
    resetSchedulers();

    expect(getScheduler('dept-1').isEmpty()).toBe(true);
  });

  describe('currentServing', () => {
    test('is null for a department with no patient being served', () => {
      expect(getCurrentServing('dept-1')).toBeNull();
    });

    test('stores and clears the patient currently being served, independently per department', () => {
      const patient = { id: 'p1', category: 'regular', type: 'walk-in' };
      setCurrentServing('dept-1', patient);

      expect(getCurrentServing('dept-1')).toEqual(patient);
      expect(getCurrentServing('dept-2')).toBeNull();

      clearCurrentServing('dept-1');
      expect(getCurrentServing('dept-1')).toBeNull();
    });
  });

  describe('lastSkipped', () => {
    test('is null for a department with no skipped patient', () => {
      expect(getLastSkipped('dept-1')).toBeNull();
    });

    test('stores and clears the last skipped patient, independently per department', () => {
      const patient = { id: 'p1', category: 'regular', type: 'walk-in' };
      setLastSkipped('dept-1', patient);

      expect(getLastSkipped('dept-1')).toEqual(patient);
      expect(getLastSkipped('dept-2')).toBeNull();

      clearLastSkipped('dept-1');
      expect(getLastSkipped('dept-1')).toBeNull();
    });
  });
});
