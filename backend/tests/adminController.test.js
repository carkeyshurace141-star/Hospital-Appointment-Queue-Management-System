require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
const Specialization = require('../src/models/Specialization');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const Token = require('../src/models/Token');
const { resetSchedulers } = require('../scheduling-engine/schedulerManager');

const app = createApp();

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

async function createUser(name, role, department) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role,
    specialization: role === 'doctor' ? 'General' : '',
    department: department || '',
  });
}

afterEach(() => {
  resetSchedulers();
});

describe('GET /api/admin/overview', () => {
  test('returns live aggregate numbers (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const unavailableDoctor = await createUser('Dr Away', 'doctor', department.name);
    await User.findByIdAndUpdate(unavailableDoctor._id, { 'availability.isUnavailable': true });
    const patient = await createUser('Pat Ient', 'patient');
    const admin = await createUser('Ad Min', 'admin');

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'walk-in',
      status: 'in-queue',
    });
    await Token.create({
      appointment: appointment._id,
      department: department._id,
      tokenNumber: 1,
      status: 'completed',
      calledAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.patientsQueued).toBe(1);
    expect(res.body.doctorsOnDuty).toBe(1);
    expect(res.body.doctorsUnavailable).toBe(1);
    expect(res.body.consultationsCompletedToday).toBe(1);
  });

  test('rejects a non-admin token (failure case)', async () => {
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/audit-log', () => {
  test('records a clinician action and returns it, filterable by action (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const admin = await createUser('Ad Min', 'admin');

    await request(app)
      .post('/api/appointments/walk-in')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ department: department._id.toString(), category: 'regular' });

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const res = await request(app)
      .get('/api/admin/audit-log')
      .query({ action: 'call_patient' })
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.logs[0].action).toBe('call_patient');
    expect(res.body.logs[0].user.name).toBe('Dr Heart');
  });

  test('rejects a non-admin token (failure case)', async () => {
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .get('/api/admin/audit-log')
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/reports/doctor-workload', () => {
  test('counts completed consultations per doctor over the range (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const admin = await createUser('Ad Min', 'admin');

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'walk-in',
      status: 'completed',
    });
    await Token.create({
      appointment: appointment._id,
      department: department._id,
      tokenNumber: 1,
      status: 'completed',
      calledAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/admin/reports/doctor-workload')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([
      expect.objectContaining({ doctorName: 'Dr Heart', completedCount: 1 }),
    ]);
  });

  test('returns a CSV download when format=csv is requested', async () => {
    const admin = await createUser('Ad Min', 'admin');

    const res = await request(app)
      .get('/api/admin/reports/doctor-workload')
      .query({ format: 'csv' })
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  test('rejects a non-admin token (failure case)', async () => {
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .get('/api/admin/reports/doctor-workload')
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/reports/queue-performance', () => {
  test('reports token volume and average wait per department (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const admin = await createUser('Ad Min', 'admin');
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'walk-in',
      status: 'in-consultation',
    });
    const issuedAt = new Date(Date.now() - 10 * 60000);
    await Token.create({
      appointment: appointment._id,
      department: department._id,
      tokenNumber: 1,
      status: 'called',
      issuedAt,
      calledAt: new Date(),
    });

    const res = await request(app)
      .get('/api/admin/reports/queue-performance')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([
      expect.objectContaining({ departmentName: 'Cardiology', tokenCount: 1 }),
    ]);
    expect(res.body.rows[0].avgWaitMinutes).toBeGreaterThan(0);
  });

  test('rejects an invalid date range (failure case)', async () => {
    const admin = await createUser('Ad Min', 'admin');

    const res = await request(app)
      .get('/api/admin/reports/queue-performance')
      .query({ from: 'not-a-date' })
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/departments', () => {
  test('creates a new department on top of the seeded ones (happy path)', async () => {
    await Department.create({ name: 'Cardiology' });
    const admin = await createUser('Ad Min', 'admin');

    const res = await request(app)
      .post('/api/admin/departments')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Neurology', description: 'Brain and nervous system.' });

    expect(res.status).toBe(201);
    expect(res.body.department.name).toBe('Neurology');

    const all = await Department.find().sort({ name: 1 });
    expect(all.map((d) => d.name)).toEqual(['Cardiology', 'Neurology']);
  });

  test('rejects a duplicate department name (failure case)', async () => {
    await Department.create({ name: 'Cardiology' });
    const admin = await createUser('Ad Min', 'admin');

    const res = await request(app)
      .post('/api/admin/departments')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Cardiology' });

    expect(res.status).toBe(409);
  });

  test('rejects a non-admin caller (failure case)', async () => {
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .post('/api/admin/departments')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ name: 'Neurology' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/specializations', () => {
  test('creates a new specialization (happy path)', async () => {
    await Specialization.create({ name: 'Cardiology' });
    const admin = await createUser('Ad Min', 'admin');

    const res = await request(app)
      .post('/api/admin/specializations')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Neurology' });

    expect(res.status).toBe(201);
    expect(res.body.specialization.name).toBe('Neurology');

    const all = await Specialization.find().sort({ name: 1 });
    expect(all.map((s) => s.name)).toEqual(['Cardiology', 'Neurology']);
  });

  test('rejects a duplicate specialization name (failure case)', async () => {
    await Specialization.create({ name: 'Cardiology' });
    const admin = await createUser('Ad Min', 'admin');

    const res = await request(app)
      .post('/api/admin/specializations')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Cardiology' });

    expect(res.status).toBe(409);
  });

  test('rejects a non-admin caller (failure case)', async () => {
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .post('/api/admin/specializations')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ name: 'Neurology' });

    expect(res.status).toBe(403);
  });
});
