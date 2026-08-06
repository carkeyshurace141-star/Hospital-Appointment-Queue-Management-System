require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const Message = require('../src/models/Message');

const app = createApp();

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

async function createUser(name, role) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role,
    specialization: role === 'doctor' ? 'General' : '',
    department: role === 'doctor' ? 'General Medicine' : '',
  });
}

async function createAppointment({ patient, doctor, status = 'booked', completedAt = null }) {
  const department = await Department.findOneAndUpdate(
    { name: 'General Medicine' },
    { name: 'General Medicine' },
    { upsert: true, new: true },
  );
  return Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    department: department._id,
    category: 'regular',
    type: 'booked',
    timeSlot: new Date(Date.now() + 60 * 60 * 1000),
    status,
    completedAt,
  });
}

describe('Chat API', () => {
  test('a stranger cannot read or send messages on an appointment they are not part of', async () => {
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Doc Tor', 'doctor');
    const stranger = await createUser('Stray Ger', 'patient');
    const appointment = await createAppointment({ patient, doctor });

    const strangerToken = tokenFor(stranger);

    const getRes = await request(app)
      .get(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(getRes.status).toBe(403);

    const postRes = await request(app)
      .post(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ body: 'hi' });
    expect(postRes.status).toBe(403);
  });

  test('the patient and doctor can exchange messages on an active appointment', async () => {
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Doc Tor', 'doctor');
    const appointment = await createAppointment({ patient, doctor, status: 'in-consultation' });

    const patientToken = tokenFor(patient);
    const doctorToken = tokenFor(doctor);

    const sendRes = await request(app)
      .post(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ body: 'How long until my results are ready?' });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.message.sender).toBe(patient._id.toString());
    expect(sendRes.body.message.recipient).toBe(doctor._id.toString());

    const historyRes = await request(app)
      .get(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.chatOpen).toBe(true);
    expect(historyRes.body.messages).toHaveLength(1);
    expect(historyRes.body.messages[0].body).toBe('How long until my results are ready?');

    const stored = await Message.findOne({ appointment: appointment._id });
    expect(stored.readAt).not.toBeNull();
  });

  test('rejects an empty message body', async () => {
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Doc Tor', 'doctor');
    const appointment = await createAppointment({ patient, doctor });

    const res = await request(app)
      .post(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  test('sending is blocked once an appointment is cancelled or no-show', async () => {
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Doc Tor', 'doctor');

    const cancelled = await createAppointment({ patient, doctor, status: 'cancelled' });
    const noShow = await createAppointment({ patient, doctor, status: 'no-show' });
    const patientToken = tokenFor(patient);

    for (const appointment of [cancelled, noShow]) {
      const res = await request(app)
        .post(`/api/chat/${appointment._id}/messages`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ body: 'still there?' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('This conversation is closed.');
    }
  });

  test('sending stays open within 24h of completion and locks after', async () => {
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Doc Tor', 'doctor');
    const patientToken = tokenFor(patient);

    const recentlyCompleted = await createAppointment({
      patient,
      doctor,
      status: 'completed',
      completedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
    });
    const longCompleted = await createAppointment({
      patient,
      doctor,
      status: 'completed',
      completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
    });

    const openRes = await request(app)
      .post(`/api/chat/${recentlyCompleted._id}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ body: 'Follow-up question' });
    expect(openRes.status).toBe(201);

    const closedRes = await request(app)
      .post(`/api/chat/${longCompleted._id}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ body: 'Too late now' });
    expect(closedRes.status).toBe(403);
  });

  test('unread count only reflects messages addressed to the requesting user', async () => {
    const patient = await createUser('Pat Ient', 'patient');
    const doctor = await createUser('Doc Tor', 'doctor');
    const appointment = await createAppointment({ patient, doctor, status: 'in-consultation' });
    const patientToken = tokenFor(patient);
    const doctorToken = tokenFor(doctor);

    await request(app)
      .post(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ body: 'message one' });
    await request(app)
      .post(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ body: 'message two' });

    const doctorUnread = await request(app)
      .get('/api/chat/unread-count')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(doctorUnread.body.total).toBe(2);
    expect(doctorUnread.body.byAppointment).toEqual([
      { appointmentId: appointment._id.toString(), count: 2 },
    ]);

    const patientUnread = await request(app)
      .get('/api/chat/unread-count')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(patientUnread.body.total).toBe(0);

    // Doctor reads the thread - their unread count should drop to zero.
    await request(app)
      .get(`/api/chat/${appointment._id}/messages`)
      .set('Authorization', `Bearer ${doctorToken}`);

    const afterRead = await request(app)
      .get('/api/chat/unread-count')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(afterRead.body.total).toBe(0);
  });
});
