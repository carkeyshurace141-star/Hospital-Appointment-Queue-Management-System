require('./setup');
const Department = require('../src/models/Department');
const Appointment = require('../src/models/Appointment');
const User = require('../src/models/User');
const Token = require('../src/models/Token');
const { generateToken } = require('../src/utils/tokenGenerator');

async function createAppointment(department) {
  const patient = await User.create({
    name: 'Pat Ient',
    email: `pat.${Date.now()}.${Math.random()}@example.com`,
    passwordHash: 'hashed',
    provider: 'local',
    role: 'patient',
  });

  return Appointment.create({
    patient: patient._id,
    department: department._id,
    category: 'regular',
    type: 'walk-in',
    status: 'checked-in',
  });
}

describe('generateToken', () => {
  test('returns 1 for the first token issued to a department today (happy path)', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const tokenNumber = await generateToken(department._id);
    expect(tokenNumber).toBe(1);
  });

  test('increments per existing token issued to the department today', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const appointment = await createAppointment(department);
    await Token.create({
      appointment: appointment._id,
      department: department._id,
      tokenNumber: 1,
    });

    const tokenNumber = await generateToken(department._id);
    expect(tokenNumber).toBe(2);
  });

  test('is independent per department', async () => {
    const deptA = await Department.create({ name: 'Cardiology' });
    const deptB = await Department.create({ name: 'Neurology' });
    const appointmentA = await createAppointment(deptA);
    await Token.create({ appointment: appointmentA._id, department: deptA._id, tokenNumber: 1 });

    expect(await generateToken(deptA._id)).toBe(2);
    expect(await generateToken(deptB._id)).toBe(1);
  });

  test('does not count tokens issued on a previous day', async () => {
    const department = await Department.create({ name: 'Cardiology' });
    const appointment = await createAppointment(department);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await Token.create({
      appointment: appointment._id,
      department: department._id,
      tokenNumber: 1,
      issuedAt: yesterday,
    });

    expect(await generateToken(department._id)).toBe(1);
  });
});
