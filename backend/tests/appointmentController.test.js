require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
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

describe('POST /api/appointments', () => {
  test('books an appointment and auto-assigns a doctor (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({
        department: department._id.toString(),
        category: 'regular',
        timeSlot: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe('booked');
    expect(res.body.appointment.doctor.id).toBe(doctor._id.toString());
  });

  test('rejects a time slot in the past (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({
        department: department._id.toString(),
        category: 'regular',
        timeSlot: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/appointments/walk-in', () => {
  test('registers a walk-in, issues a token, and enters the queue (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .post('/api/appointments/walk-in')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ department: department._id.toString(), category: 'regular' });

    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe('in-queue');
    expect(res.body.token).toBe(1);
  });

  test('returns 409 when no doctors are available in the department (failure case)', async () => {
    const department = await Department.create({ name: 'Neurology' });
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .post('/api/appointments/walk-in')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ department: department._id.toString(), category: 'regular' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/appointments/mine', () => {
  test("returns the logged-in patient's appointments, most recent first (happy path)", async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');

    const older = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: new Date(Date.now() + 60 * 60 * 1000),
      status: 'booked',
    });
    const newer = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'booked',
    });

    const res = await request(app)
      .get('/api/appointments/mine')
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments.map((a) => a.id)).toEqual([
      newer._id.toString(),
      older._id.toString(),
    ]);
  });

  test('rejects an unauthenticated request (failure case)', async () => {
    const res = await request(app).get('/api/appointments/mine');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/appointments/:id/cancel', () => {
  test('cancels a booked appointment owned by the caller (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: new Date(Date.now() + 60 * 60 * 1000),
      status: 'booked',
    });

    const res = await request(app)
      .patch(`/api/appointments/${appointment._id}/cancel`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('cancelled');
  });

  test("rejects cancelling another patient's appointment (failure case)", async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const owner = await createUser('Pat Ient', 'patient');
    const intruder = await createUser('Eve Intruder', 'patient');
    const appointment = await Appointment.create({
      patient: owner._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: new Date(Date.now() + 60 * 60 * 1000),
      status: 'booked',
    });

    const res = await request(app)
      .patch(`/api/appointments/${appointment._id}/cancel`)
      .set('Authorization', `Bearer ${tokenFor(intruder)}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/appointments/:id/checkin', () => {
  test('checks in a booked appointment and enters the queue (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: new Date(Date.now() + 60 * 60 * 1000),
      status: 'booked',
    });

    const res = await request(app)
      .post(`/api/appointments/${appointment._id}/checkin`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('in-queue');
    expect(res.body.token).toBe(1);
  });

  test('rejects check-in for an appointment that is not booked (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: new Date(Date.now() + 60 * 60 * 1000),
      status: 'cancelled',
    });

    const res = await request(app)
      .post(`/api/appointments/${appointment._id}/checkin`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(400);
  });
});
