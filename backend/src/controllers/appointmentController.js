const Appointment = require('../models/Appointment');
const Department = require('../models/Department');
const User = require('../models/User');
const Token = require('../models/Token');
const { asyncHandler } = require('../middleware/errorHandler');
const { assignDoctor } = require('../utils/resourceAllocation');
const { generateToken } = require('../utils/tokenGenerator');
const { broadcastQueueUpdate } = require('../utils/queueBroadcast');
const { getScheduler } = require('../../scheduling-engine/schedulerManager');

// Used as the estimated per-patient consultation length until there is
// real data for the department today (see averageConsultationMinutesToday);
// matches RoundRobinQueue's own default time quantum for consistency.
const DEFAULT_CONSULTATION_MINUTES = 10;

function toPublicAppointment(appointment) {
  const { department, doctor } = appointment;

  return {
    id: appointment._id,
    patient: appointment.patient,
    doctor:
      doctor && doctor.name
        ? { id: doctor._id, name: doctor.name, specialization: doctor.specialization }
        : doctor,
    department:
      department && department.name ? { id: department._id, name: department.name } : department,
    category: appointment.category,
    type: appointment.type,
    timeSlot: appointment.timeSlot,
    status: appointment.status,
    createdAt: appointment.createdAt,
  };
}

// Shared by walk-in creation (already checked-in on arrival) and the
// check-in endpoint: issues a token, enters the patient into that
// department's in-memory scheduler, and broadcasts the updated queue.
async function enqueueAppointment(appointment, io) {
  const scheduler = getScheduler(appointment.department);
  const tokenNumber = await generateToken(appointment.department);
  const token = await Token.create({
    appointment: appointment._id,
    department: appointment.department,
    tokenNumber,
  });

  scheduler.enqueue({
    id: appointment._id.toString(),
    category: appointment.category,
    type: appointment.type,
    tokenNumber,
  });

  appointment.status = 'in-queue';
  await appointment.save();

  broadcastQueueUpdate(io, appointment.department, scheduler);

  return token;
}

// See Sprint 2 Task 3: a simple estimate, not a promise — average length of
// consultations completed in this department so far today (falling back to
// DEFAULT_CONSULTATION_MINUTES before any data exists), multiplied by the
// patient's position in the queue.
async function averageConsultationMinutesToday(departmentId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const completedTokens = await Token.find({
    department: departmentId,
    status: 'completed',
    calledAt: { $ne: null },
    completedAt: { $ne: null, $gte: startOfDay },
  });

  if (completedTokens.length === 0) return DEFAULT_CONSULTATION_MINUTES;

  const totalMinutes = completedTokens.reduce(
    (sum, token) => sum + (token.completedAt - token.calledAt) / 60000,
    0,
  );
  return totalMinutes / completedTokens.length;
}

async function resolveDoctor(department, doctorId) {
  if (!doctorId) {
    return assignDoctor(department._id);
  }

  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
  if (!doctor) {
    const err = new Error('Selected doctor not found.');
    err.status = 404;
    throw err;
  }
  if (doctor.department !== department.name) {
    const err = new Error('The selected doctor is not part of this department.');
    err.status = 400;
    throw err;
  }
  return doctor;
}

const createAppointment = asyncHandler(async (req, res) => {
  const { department: departmentId, doctor: doctorId, category, timeSlot } = req.body;

  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({ message: 'Department not found.' });
  }

  const doctor = await resolveDoctor(department, doctorId);

  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctor._id,
    department: department._id,
    category,
    type: 'booked',
    timeSlot,
    status: 'booked',
  });

  await appointment.populate('department');
  await appointment.populate('doctor');

  res.status(201).json({ appointment: toPublicAppointment(appointment) });
});

const createWalkIn = asyncHandler(async (req, res) => {
  const { department: departmentId, doctor: doctorId, category } = req.body;

  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({ message: 'Department not found.' });
  }

  const doctor = await resolveDoctor(department, doctorId);

  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctor._id,
    department: department._id,
    category,
    type: 'walk-in',
    status: 'checked-in',
  });

  const token = await enqueueAppointment(appointment, req.app.locals.io);

  await appointment.populate('department');
  await appointment.populate('doctor');

  res.status(201).json({ appointment: toPublicAppointment(appointment), token: token.tokenNumber });
});

const listMine = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient: req.user._id })
    .sort({ createdAt: -1 })
    .populate('department')
    .populate('doctor');

  res.status(200).json({ appointments: appointments.map(toPublicAppointment) });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  const isOwner = appointment.patient.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You do not have permission to do that.' });
  }

  if (appointment.status !== 'booked') {
    return res.status(400).json({ message: 'Only booked appointments can be cancelled.' });
  }

  appointment.status = 'cancelled';
  await appointment.save();

  res.status(200).json({ appointment: toPublicAppointment(appointment) });
});

const checkIn = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  if (appointment.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not have permission to do that.' });
  }

  if (appointment.status !== 'booked') {
    return res.status(400).json({ message: 'This appointment is not eligible for check-in.' });
  }

  appointment.status = 'checked-in';
  await appointment.save();

  const token = await enqueueAppointment(appointment, req.app.locals.io);

  await appointment.populate('department');
  await appointment.populate('doctor');

  res.status(200).json({ appointment: toPublicAppointment(appointment), token: token.tokenNumber });
});

const queueStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate('department');
  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found.' });
  }

  if (appointment.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not have permission to do that.' });
  }

  if (!['in-queue', 'in-consultation'].includes(appointment.status)) {
    return res.status(400).json({ message: 'This appointment is not currently in the queue.' });
  }

  const scheduler = getScheduler(appointment.department._id);
  const positionIndex = scheduler
    .toArray()
    .findIndex((patient) => patient.id === appointment._id.toString());
  const position = positionIndex === -1 ? 0 : positionIndex + 1;

  const token = await Token.findOne({ appointment: appointment._id });
  const avgConsultationMinutes = await averageConsultationMinutesToday(appointment.department._id);

  res.status(200).json({
    status: appointment.status,
    department: { id: appointment.department._id, name: appointment.department.name },
    tokenNumber: token ? token.tokenNumber : null,
    position,
    estimatedWaitMinutes: Math.round(position * avgConsultationMinutes),
  });
});

module.exports = {
  createAppointment,
  createWalkIn,
  listMine,
  cancelAppointment,
  checkIn,
  queueStatus,
  toPublicAppointment,
};
