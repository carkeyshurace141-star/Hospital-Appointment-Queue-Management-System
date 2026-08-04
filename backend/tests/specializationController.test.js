require('./setup');
const request = require('supertest');
const createApp = require('../src/app');
const Specialization = require('../src/models/Specialization');

const app = createApp();

describe('GET /api/specializations', () => {
  test('lists specializations sorted by name (happy path)', async () => {
    await Specialization.create({ name: 'Orthopedic Surgery' });
    await Specialization.create({ name: 'Cardiology' });

    const res = await request(app).get('/api/specializations');

    expect(res.status).toBe(200);
    expect(res.body.specializations.map((s) => s.name)).toEqual([
      'Cardiology',
      'Orthopedic Surgery',
    ]);
  });
});
