require('./setup');
const Specialization = require('../src/models/Specialization');
const { ensureDefaultSpecializations, DEFAULT_SPECIALIZATIONS } = require('../src/utils/seedDefaults');

describe('ensureDefaultSpecializations', () => {
  test('populates every default on an empty database (happy path)', async () => {
    const result = await ensureDefaultSpecializations();

    expect(result).toEqual({ created: DEFAULT_SPECIALIZATIONS.length });
    const names = (await Specialization.find({}, 'name')).map((s) => s.name);
    expect(names.sort()).toEqual([...DEFAULT_SPECIALIZATIONS].sort());
  });

  test('is idempotent and never duplicates on a second run (happy path)', async () => {
    await ensureDefaultSpecializations();
    const second = await ensureDefaultSpecializations();

    expect(second).toEqual({ created: 0 });
    const count = await Specialization.countDocuments();
    expect(count).toBe(DEFAULT_SPECIALIZATIONS.length);
  });

  test('leaves admin-added specializations untouched (happy path)', async () => {
    await Specialization.create({ name: 'Neurosurgery' });

    const result = await ensureDefaultSpecializations();

    expect(result.created).toBe(DEFAULT_SPECIALIZATIONS.length);
    const names = (await Specialization.find({}, 'name')).map((s) => s.name);
    expect(names).toContain('Neurosurgery');
  });
});
