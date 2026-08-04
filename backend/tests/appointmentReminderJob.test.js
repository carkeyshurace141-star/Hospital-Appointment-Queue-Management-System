require('./setup');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const { sendAppointmentReminderEmail } = require('../src/utils/appointmentEmail');
const { runReminderSweep } = require('../src/jobs/appointmentReminderJob');

jest.mock('../src/utils/appointmentEmail', () => ({
  sendAppointmentReminderEmail: jest.fn().mockResolvedValue({ skipped: false }),
}));

async function createDoctor(department) {
  return User.create({
    name: 'Dr Heart',
    email: 'dr.heart@example.com',
    passwordHash: 'hashed',
    provider: 'local',
    role: 'doctor',
    specialization: 'Cardiology',
    department: department.name,
  });
}

async function createPatient() {
  return User.create({
    name: 'Pat Ient',
    email: 'pat.ient@example.com',
    passwordHash: 'hashed',
    provider: 'local',
    role: 'patient',
  });
}

async function bookAppointment({ department, doctor, patient, timeSlot, status = 'booked' }) {
  return Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    department: department._id,
    category: 'regular',
    type: 'booked',
    timeSlot,
    status,
  });
}

beforeEach(() => {
  sendAppointmentReminderEmail.mockClear();
});

describe('runReminderSweep', () => {
  test('emails and marks appointments within the next 2 hours (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createDoctor(department);
    const patient = await createPatient();
    const now = new Date('2026-01-01T10:00:00Z');
    const appointment = await bookAppointment({
      department,
      doctor,
      patient,
      timeSlot: new Date('2026-01-01T11:30:00Z'), // 90 minutes out
    });

    const result = await runReminderSweep(now);

    expect(result).toEqual({ checked: 1, sent: 1 });
    expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(1);
    const [emailedAppointment, emailedPatient] = sendAppointmentReminderEmail.mock.calls[0];
    expect(emailedAppointment.department.name).toBe('Cardiology');
    expect(emailedPatient.email).toBe('pat.ient@example.com');

    const updated = await Appointment.findById(appointment._id);
    expect(updated.reminderSentAt).toEqual(now);
  });

  test('does not email appointments more than 2 hours out (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createDoctor(department);
    const patient = await createPatient();
    const now = new Date('2026-01-01T10:00:00Z');
    await bookAppointment({
      department,
      doctor,
      patient,
      timeSlot: new Date('2026-01-01T13:00:00Z'), // 3 hours out
    });

    const result = await runReminderSweep(now);

    expect(result).toEqual({ checked: 0, sent: 0 });
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  test('does not email appointments already reminded, cancelled, or already checked in (failure case)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createDoctor(department);
    const patient = await createPatient();
    const now = new Date('2026-01-01T10:00:00Z');
    const soon = new Date('2026-01-01T11:00:00Z');

    await bookAppointment({ department, doctor, patient, timeSlot: soon, status: 'cancelled' });
    await bookAppointment({ department, doctor, patient, timeSlot: soon, status: 'checked-in' });
    const alreadyReminded = await bookAppointment({ department, doctor, patient, timeSlot: soon });
    alreadyReminded.reminderSentAt = new Date('2026-01-01T09:00:00Z');
    await alreadyReminded.save();

    const result = await runReminderSweep(now);

    expect(result).toEqual({ checked: 0, sent: 0 });
    expect(sendAppointmentReminderEmail).not.toHaveBeenCalled();
  });

  test('never sends the same reminder twice across consecutive sweeps (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const doctor = await createDoctor(department);
    const patient = await createPatient();
    const now = new Date('2026-01-01T10:00:00Z');
    await bookAppointment({
      department,
      doctor,
      patient,
      timeSlot: new Date('2026-01-01T11:30:00Z'),
    });

    await runReminderSweep(now);
    const second = await runReminderSweep(new Date('2026-01-01T10:05:00Z'));

    expect(second).toEqual({ checked: 0, sent: 0 });
    expect(sendAppointmentReminderEmail).toHaveBeenCalledTimes(1);
  });
});
