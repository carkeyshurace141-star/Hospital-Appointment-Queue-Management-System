require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
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

// Doctors are only bookable on days they've set hours for (see
// isDoctorUnavailableOn), so test doctors default to open every day unless
// a test explicitly overrides availability to exercise that behavior.
const ALL_DAY_HOURS = { start: '00:00', end: '23:59' };
const FULL_WEEK_AVAILABILITY = {
  monday: ALL_DAY_HOURS,
  tuesday: ALL_DAY_HOURS,
  wednesday: ALL_DAY_HOURS,
  thursday: ALL_DAY_HOURS,
  friday: ALL_DAY_HOURS,
  saturday: ALL_DAY_HOURS,
  sunday: ALL_DAY_HOURS,
};

async function createUser(name, role, department, availability) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role,
    specialization: role === 'doctor' ? 'General' : '',
    department: department || '',
    availability: role === 'doctor' ? availability || FULL_WEEK_AVAILABILITY : undefined,
  });
}

async function walkIn(app_, patient, department, category = 'regular') {
  return request(app_)
    .post('/api/appointments/walk-in')
    .set('Authorization', `Bearer ${tokenFor(patient)}`)
    .send({ department: department._id.toString(), category });
}

afterEach(() => {
  resetSchedulers();
});

describe('GET /api/clinician/queue', () => {
  test("returns the doctor's department and an empty queue (happy path)", async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .get('/api/clinician/queue')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(200);
    expect(res.body.department.name).toBe('Cardiology');
    expect(res.body.current).toBeNull();
    expect(res.body.queue).toEqual([]);
  });

  test('rejects a patient token (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .get('/api/clinician/queue')
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/clinician/queue/call', () => {
  test('calls the next patient and marks them in-consultation (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    await walkIn(app, patient, department);

    const res = await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(200);
    expect(res.body.current.patientName).toBe('Pat Ient');
    expect(res.body.current.tokenNumber).toBe(1);

    const appointment = await Appointment.findOne({ patient: patient._id });
    expect(appointment.status).toBe('in-consultation');

    const token = await Token.findOne({ appointment: appointment._id });
    expect(token.status).toBe('called');
    expect(token.calledAt).not.toBeNull();
  });

  test('returns 404 when the queue is empty (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(404);
  });

  test('returns 409 when a patient is already being called', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patientA = await createUser('Pat A', 'patient');
    const patientB = await createUser('Pat B', 'patient');
    await walkIn(app, patientA, department);
    await walkIn(app, patientB, department);

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const res = await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(409);
  });
});

describe('POST /api/clinician/queue/skip and /recall', () => {
  test('skip returns the patient to the queue, recall brings the same patient back (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    await walkIn(app, patient, department);

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const skipRes = await request(app)
      .post('/api/clinician/queue/skip')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);
    expect(skipRes.status).toBe(200);

    const appointmentAfterSkip = await Appointment.findOne({ patient: patient._id });
    expect(appointmentAfterSkip.status).toBe('in-queue');

    const queueRes = await request(app)
      .get('/api/clinician/queue')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);
    expect(queueRes.body.queue).toHaveLength(1);

    const recallRes = await request(app)
      .post('/api/clinician/queue/recall')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(recallRes.status).toBe(200);
    expect(recallRes.body.current.patientName).toBe('Pat Ient');
  });

  test('skip returns 400 when no patient is currently being called (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .post('/api/clinician/queue/skip')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(400);
  });

  test('recall returns 404 when nobody has been skipped (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .post('/api/clinician/queue/recall')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/clinician/queue/complete', () => {
  test('completes the current consultation (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    await walkIn(app, patient, department);

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const res = await request(app)
      .post('/api/clinician/queue/complete')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(200);

    const appointment = await Appointment.findOne({ patient: patient._id });
    expect(appointment.status).toBe('completed');

    const token = await Token.findOne({ appointment: appointment._id });
    expect(token.status).toBe('completed');
    expect(token.completedAt).not.toBeNull();
  });

  test('returns 400 when no patient is currently being called (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .post('/api/clinician/queue/complete')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/clinician/queue/refer', () => {
  test('moves the current patient to another department (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const otherDepartment = await Department.create({ name: 'Neurology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    await createUser('Dr Brain', 'doctor', otherDepartment.name);
    const patient = await createUser('Pat Ient', 'patient');
    await walkIn(app, patient, department);

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const res = await request(app)
      .post('/api/clinician/queue/refer')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`)
      .send({ newDepartmentId: otherDepartment._id.toString() });

    expect(res.status).toBe(200);

    const appointment = await Appointment.findOne({ patient: patient._id });
    expect(appointment.department.toString()).toBe(otherDepartment._id.toString());
    expect(appointment.status).toBe('in-queue');
  });

  test('returns 404 for a destination department that does not exist (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    await walkIn(app, patient, department);

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const res = await request(app)
      .post('/api/clinician/queue/refer')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`)
      .send({ newDepartmentId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/clinician/queue/no-show', () => {
  test('marks the current patient no-show and auto-promotes the next patient (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patientA = await createUser('Pat A', 'patient');
    const patientB = await createUser('Pat B', 'patient');
    await walkIn(app, patientA, department);
    await walkIn(app, patientB, department);

    await request(app)
      .post('/api/clinician/queue/call')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    const res = await request(app)
      .post('/api/clinician/queue/no-show')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(200);

    const appointmentA = await Appointment.findOne({ patient: patientA._id });
    expect(appointmentA.status).toBe('no-show');

    const appointmentB = await Appointment.findOne({ patient: patientB._id });
    expect(appointmentB.status).toBe('in-consultation');
    expect(res.body.current.patientName).toBe('Pat B');
  });

  test('returns 400 when no patient is currently being called (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .post('/api/clinician/queue/no-show')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`);

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/clinician/availability', () => {
  test('updates the unavailable toggle and working hours (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .patch('/api/clinician/availability')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`)
      .send({ isUnavailable: true, hours: { monday: { start: '09:00', end: '17:00' } } });

    expect(res.status).toBe(200);
    expect(res.body.availability.isUnavailable).toBe(true);
    expect(res.body.availability.monday.start).toBe('09:00');
  });

  test('rejects a malformed time value (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);

    const res = await request(app)
      .patch('/api/clinician/availability')
      .set('Authorization', `Bearer ${tokenFor(doctor)}`)
      .send({ hours: { monday: { start: 'not-a-time', end: '17:00' } } });

    expect(res.status).toBe(400);
  });

  test('rejects a patient token (failure case)', async () => {
    const patient = await createUser('Pat Ient', 'patient');

    const res = await request(app)
      .patch('/api/clinician/availability')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ isUnavailable: true });

    expect(res.status).toBe(403);
  });
});
