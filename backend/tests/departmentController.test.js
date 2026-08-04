require('./setup');
const request = require('supertest');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const {
  getScheduler,
  setCurrentServing,
  resetSchedulers,
} = require('../scheduling-engine/schedulerManager');

const app = createApp();

async function createDoctor(name, department) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role: 'doctor',
    specialization: 'General',
    department,
  });
}

describe('GET /api/departments', () => {
  test('lists departments sorted by name (happy path)', async () => {
    await Department.create({ name: 'Orthopedics' });
    await Department.create({ name: 'Cardiology' });

    const res = await request(app).get('/api/departments');

    expect(res.status).toBe(200);
    expect(res.body.departments.map((d) => d.name)).toEqual(['Cardiology', 'Orthopedics']);
  });
});

describe('GET /api/departments/:id/doctors', () => {
  test('lists doctors matching the department (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    await createDoctor('Dr Heart', department.name);

    const res = await request(app).get(`/api/departments/${department._id}/doctors`);

    expect(res.status).toBe(200);
    expect(res.body.doctors).toHaveLength(1);
    expect(res.body.doctors[0].name).toBe('Dr Heart');
  });

  test('returns 404 when the department does not exist (failure case)', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app).get(`/api/departments/${fakeId}/doctors`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/departments/:id/queue-summary', () => {
  afterEach(() => resetSchedulers());

  test('reports current token, waiting count, and next tokens without patient identity (happy path)', async () => {
    const department = await Department.create({ name: 'General Medicine' });
    const scheduler = getScheduler(department._id);
    scheduler.enqueue({ id: 'a1', category: 'regular', type: 'walk-in', tokenNumber: 'GM-002' });
    scheduler.enqueue({ id: 'a2', category: 'regular', type: 'walk-in', tokenNumber: 'GM-003' });
    setCurrentServing(department._id, { id: 'a0', tokenNumber: 'GM-001' });

    const res = await request(app).get(`/api/departments/${department._id}/queue-summary`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      department: { id: department._id.toString(), name: 'General Medicine' },
      currentTokenNumber: 'GM-001',
      waitingCount: 2,
      nextTokenNumbers: ['GM-002', 'GM-003'],
    });
  });

  test('returns 404 when the department does not exist (failure case)', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app).get(`/api/departments/${fakeId}/queue-summary`);

    expect(res.status).toBe(404);
  });
});
