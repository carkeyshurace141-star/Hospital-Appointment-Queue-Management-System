require('./setup');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const { assignDoctor } = require('../src/utils/resourceAllocation');

// Doctors are only bookable on days they've set hours for (see
// isDoctorUnavailableOn), so test doctors default to open every day; tests
// that pass their own `availability` (e.g. { isUnavailable: true }) get it
// merged over that default so the weekday grid doesn't also block them.
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

async function createDoctor(name, department, availability) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role: 'doctor',
    specialization: 'General',
    department,
    availability: { ...FULL_WEEK_AVAILABILITY, ...availability },
  });
}

async function createPatient(name) {
  return User.create({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role: 'patient',
  });
}

describe('assignDoctor', () => {
  test('assigns the doctor with the lowest current active-appointment workload (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const busyDoctor = await createDoctor('Dr Busy', department.name);
    const freeDoctor = await createDoctor('Dr Free', department.name);
    const patient = await createPatient('Pat Ient');

    await Appointment.create([
      {
        patient: patient._id,
        doctor: busyDoctor._id,
        department: department._id,
        category: 'regular',
        type: 'walk-in',
        status: 'checked-in',
      },
      {
        patient: patient._id,
        doctor: busyDoctor._id,
        department: department._id,
        category: 'regular',
        type: 'walk-in',
        status: 'in-queue',
      },
      {
        patient: patient._id,
        doctor: freeDoctor._id,
        department: department._id,
        category: 'regular',
        type: 'walk-in',
        status: 'completed',
      },
    ]);

    const assigned = await assignDoctor(department._id);

    expect(assigned._id.toString()).toBe(freeDoctor._id.toString());
  });

  test('throws a 409 error when no doctors are available in the department (failure case)', async () => {
    const department = await Department.create({ name: 'Neurology' });

    await expect(assignDoctor(department._id)).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/no doctors/i),
    });
  });

  test('throws a 404 error when the department does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(assignDoctor(fakeId)).rejects.toMatchObject({ status: 404 });
  });

  test('skips doctors marked unavailable, even if they have the lowest workload (happy path)', async () => {
    const department = await Department.create({ name: 'Dermatology' });
    const unavailableDoctor = await createDoctor('Dr Away', department.name, {
      isUnavailable: true,
    });
    const availableDoctor = await createDoctor('Dr Here', department.name, {
      isUnavailable: false,
    });
    const patient = await createPatient('Pat Ient');

    await Appointment.create({
      patient: patient._id,
      doctor: availableDoctor._id,
      department: department._id,
      category: 'regular',
      type: 'walk-in',
      status: 'checked-in',
    });

    const assigned = await assignDoctor(department._id);

    expect(assigned._id.toString()).toBe(availableDoctor._id.toString());
    expect(unavailableDoctor._id.toString()).not.toBe(assigned._id.toString());
  });

  test('throws a 409 error when every doctor in the department is unavailable (failure case)', async () => {
    const department = await Department.create({ name: 'Oncology' });
    await createDoctor('Dr Away', department.name, { isUnavailable: true });

    await expect(assignDoctor(department._id)).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/no doctors/i),
    });
  });
});
