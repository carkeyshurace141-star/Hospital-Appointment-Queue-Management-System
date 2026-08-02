require('./setup');
const request = require('supertest');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
const User = require('../src/models/User');

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
