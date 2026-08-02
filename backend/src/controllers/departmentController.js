const Department = require('../models/Department');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

function toPublicDepartment(department) {
  return {
    id: department._id,
    name: department.name,
    description: department.description,
  };
}

function toDoctorSummary(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    specialization: user.specialization,
    department: user.department,
  };
}

const listDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.status(200).json({ departments: departments.map(toPublicDepartment) });
});

// Doctors store their department as a free-text name (see User model), so matching
// is done against Department.name rather than an ObjectId reference.
const listDoctorsForDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    return res.status(404).json({ message: 'Department not found.' });
  }

  const doctors = await User.find({ role: 'doctor', department: department.name }).sort({
    name: 1,
  });
  res.status(200).json({ doctors: doctors.map(toDoctorSummary) });
});

module.exports = { listDepartments, listDoctorsForDepartment, toPublicDepartment };
