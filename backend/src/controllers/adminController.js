const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { hashPassword, generateTemporaryPassword } = require('../utils/password');

function toDoctorSummary(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    specialization: user.specialization,
    department: user.department,
    createdAt: user.createdAt,
  };
}

const addDoctor = asyncHandler(async (req, res) => {
  const { name, email, phone, specialization, department } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const doctor = await User.create({
    name,
    email,
    phone,
    specialization,
    department,
    passwordHash,
    provider: 'local',
    role: 'doctor',
    mustChangePassword: true,
    createdBy: req.user._id,
  });

  res.status(201).json({
    message: 'Doctor account created.',
    doctor: toDoctorSummary(doctor),
    temporaryPassword,
  });
});

const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await User.find({ role: 'doctor' }).sort({ createdAt: -1 });
  res.status(200).json({ doctors: doctors.map(toDoctorSummary) });
});

module.exports = { addDoctor, listDoctors };
