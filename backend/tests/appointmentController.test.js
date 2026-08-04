require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const Token = require('../src/models/Token');
const { resetSchedulers, getScheduler } = require('../scheduling-engine/schedulerManager');
const { sendMail } = require('../src/config/mailer');

jest.mock('../src/config/mailer', () => ({ sendMail: jest.fn() }));

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
  sendMail.mockReset();
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

  test('emails the patient a confirmation with appointment and doctor details (happy path)', async () => {
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
    expect(sendMail).toHaveBeenCalledTimes(1);
    const emailArgs = sendMail.mock.calls[0][0];
    expect(emailArgs.to).toBe(patient.email);
    expect(emailArgs.text).toContain(department.name);
    expect(emailArgs.text).toContain(doctor.name);
    expect(emailArgs.text).toContain('15 minutes early');
  });

  test('still books the appointment even if sending the email fails (failure case)', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    const department = await Department.create({ name: 'Cardiology' });
    await createUser('Dr Heart', 'doctor', department.name);
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

  test('rejects double-booking the same doctor at the same time (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const firstPatient = await createUser('Pat Ient', 'patient');
    const secondPatient = await createUser('Sam Ient', 'patient');
    const timeSlot = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor(firstPatient)}`)
      .send({ department: department._id.toString(), doctor: doctor._id.toString(), category: 'regular', timeSlot });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor(secondPatient)}`)
      .send({ department: department._id.toString(), doctor: doctor._id.toString(), category: 'regular', timeSlot });

    expect(res.status).toBe(409);
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

  test('cancels an in-queue appointment, pulling it out of the live scheduler (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'walk-in',
      status: 'in-queue',
    });
    await Token.create({ appointment: appointment._id, department: department._id, tokenNumber: 1 });
    const scheduler = getScheduler(department._id);
    scheduler.enqueue({
      id: appointment._id.toString(),
      category: 'regular',
      type: 'walk-in',
      tokenNumber: 1,
    });

    const res = await request(app)
      .patch(`/api/appointments/${appointment._id}/cancel`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('cancelled');
    expect(scheduler.toArray().find((p) => p.id === appointment._id.toString())).toBeUndefined();

    const token = await Token.findOne({ appointment: appointment._id });
    expect(token.status).toBe('cancelled');
  });

  test('rejects cancelling an appointment already in consultation (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'walk-in',
      status: 'in-consultation',
    });

    const res = await request(app)
      .patch(`/api/appointments/${appointment._id}/cancel`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    expect(res.status).toBe(400);
  });

  test('frees the doctor slot for another patient to book (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const other = await createUser('Sam Ient', 'patient');
    const timeSlot = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot,
      status: 'booked',
    });

    await request(app)
      .patch(`/api/appointments/${appointment._id}/cancel`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`);

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor(other)}`)
      .send({ department: department._id.toString(), doctor: doctor._id.toString(), category: 'regular', timeSlot });

    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/appointments/:id/reschedule', () => {
  test("updates the appointment's time slot (happy path)", async () => {
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
      reminderSentAt: new Date(),
    });
    const newTimeSlot = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .patch(`/api/appointments/${appointment._id}/reschedule`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ timeSlot: newTimeSlot });

    expect(res.status).toBe(200);
    expect(new Date(res.body.appointment.timeSlot).toISOString()).toBe(newTimeSlot);

    const updated = await Appointment.findById(appointment._id);
    expect(updated.reminderSentAt).toBeNull();
  });

  test("rejects rescheduling another patient's appointment (failure case)", async () => {
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
      .patch(`/api/appointments/${appointment._id}/reschedule`)
      .set('Authorization', `Bearer ${tokenFor(intruder)}`)
      .send({ timeSlot: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() });

    expect(res.status).toBe(403);
  });

  test('rejects rescheduling into a slot the doctor is already booked for (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createUser('Dr Heart', 'doctor', department.name);
    const patient = await createUser('Pat Ient', 'patient');
    const takenSlot = new Date(Date.now() + 5 * 60 * 60 * 1000);
    await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category: 'regular',
      type: 'booked',
      timeSlot: takenSlot,
      status: 'booked',
    });
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
      .patch(`/api/appointments/${appointment._id}/reschedule`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ timeSlot: takenSlot.toISOString() });

    expect(res.status).toBe(409);
  });

  test('rejects rescheduling an appointment that is not booked (failure case)', async () => {
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
      .patch(`/api/appointments/${appointment._id}/reschedule`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ timeSlot: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() });

    expect(res.status).toBe(400);
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
