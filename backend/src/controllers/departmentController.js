const Department = require('../models/Department');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { getScheduler, getCurrentServing } = require('../../scheduling-engine/schedulerManager');

function toPublicDepartment(department) {
  return {
    id: department._id,
    name: department.name,
    description: department.description,
  };
}

// Availability is included so the booking flow can warn patients before
// they submit a date/time the doctor hasn't set hours for - see
// isDoctorUnavailableOn (backend/src/utils/resourceAllocation.js), which
// this is meant to mirror on the frontend.
function toDoctorSummary(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    specialization: user.specialization,
    department: user.department,
    availability: user.availability,
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

// Public, name-only snapshot of a department's live queue for unauthenticated
// displays (e.g. the marketing landing page). Deliberately omits patient
// names/appointment ids that the authenticated clinician queue exposes.
const getQueueSummary = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    return res.status(404).json({ message: 'Department not found.' });
  }

  const waiting = getScheduler(department._id).toArray();
  const current = getCurrentServing(department._id);

  res.status(200).json({
    department: { id: department._id, name: department.name },
    currentTokenNumber: current ? current.tokenNumber : null,
    waitingCount: waiting.length,
    nextTokenNumbers: waiting.slice(0, 3).map((patient) => patient.tokenNumber),
  });
});

module.exports = {
  listDepartments,
  listDoctorsForDepartment,
  getQueueSummary,
  toPublicDepartment,
};
