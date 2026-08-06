const Appointment = require('../models/Appointment');
const Department = require('../models/Department');
const Token = require('../models/Token');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { assignDoctor } = require('../utils/resourceAllocation');
const { broadcastQueueUpdate } = require('../utils/queueBroadcast');
const { removeAndPromoteNext } = require('../utils/noShowHandler');
const { isChatOpen, chatClosesAt, CHAT_WINDOW_MS } = require('../utils/chatEligibility');
const {
  getScheduler,
  getCurrentServing,
  setCurrentServing,
  clearCurrentServing,
  getLastSkipped,
  setLastSkipped,
  clearLastSkipped,
} = require('../../scheduling-engine/schedulerManager');

// Doctors store their department as a free-text name (see User model), so
// this resolves the logged-in doctor's Department document the same way
// departmentController.listDoctorsForDepartment matches doctors to it.
async function getDoctorDepartment(req) {
  const department = await Department.findOne({ name: req.user.department });
  if (!department) {
    const err = new Error('No department is assigned to your account.');
    err.status = 400;
    throw err;
  }
  return department;
}

// Enriches the scheduler's bare patient records (id/category/type/
// tokenNumber/queuedAt) with the patient's name for display on the
// Clinician Dashboard.
async function enrichPatients(patients) {
  if (patients.length === 0) return [];

  const ids = patients.map((patient) => patient.id);
  const appointments = await Appointment.find({ _id: { $in: ids } }).populate('patient', 'name');
  const appointmentById = new Map(appointments.map((a) => [a._id.toString(), a]));

  return patients.map((patient) => {
    const appointment = appointmentById.get(patient.id);
    return {
      appointmentId: patient.id,
      tokenNumber: patient.tokenNumber,
      category: patient.category,
      type: patient.type,
      patientName: appointment?.patient?.name || 'Unknown',
      queuedAt: patient.queuedAt,
    };
  });
}

async function enrichPatient(patient) {
  const [enriched] = await enrichPatients([patient]);
  return enriched;
}

async function emitAppointmentCalled(io, departmentId, patient) {
  const appointment = await Appointment.findById(patient.id).populate('patient', 'name');
  if (!io) return;
  io.emit('appointment:called', {
    appointmentId: patient.id,
    departmentId: departmentId.toString(),
    tokenNumber: patient.tokenNumber,
    patientName: appointment?.patient?.name || 'Unknown',
  });
}

const getQueue = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);
  const current = getCurrentServing(department._id);

  res.locals.auditTargetId = department._id.toString();
  res.status(200).json({
    department: { id: department._id, name: department.name },
    current: current ? await enrichPatient(current) : null,
    queue: await enrichPatients(scheduler.toArray()),
  });
});

const callNext = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);

  if (getCurrentServing(department._id)) {
    return res
      .status(409)
      .json({ message: 'Complete, skip, or mark the current patient as no-show first.' });
  }

  const result = scheduler.serveNext();
  if (!result) {
    return res.status(404).json({ message: 'The queue is empty.' });
  }

  const { patient } = result;
  setCurrentServing(department._id, patient);
  clearLastSkipped(department._id);

  await Appointment.findByIdAndUpdate(patient.id, { status: 'in-consultation' });
  await Token.findOneAndUpdate(
    { appointment: patient.id },
    { status: 'called', calledAt: new Date() },
  );

  broadcastQueueUpdate(req.app.locals.io, department._id, scheduler);
  await emitAppointmentCalled(req.app.locals.io, department._id, patient);

  res.locals.auditTargetId = patient.id;
  res.status(200).json({ current: await enrichPatient(patient) });
});

const skip = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);
  const current = getCurrentServing(department._id);

  if (!current) {
    return res.status(400).json({ message: 'No patient is currently being called.' });
  }

  scheduler.enqueue(current);
  setLastSkipped(department._id, current);
  clearCurrentServing(department._id);

  await Appointment.findByIdAndUpdate(current.id, { status: 'in-queue' });
  await Token.findOneAndUpdate({ appointment: current.id }, { status: 'waiting' });

  broadcastQueueUpdate(req.app.locals.io, department._id, scheduler);

  res.locals.auditTargetId = current.id;
  res.status(200).json({ message: 'Patient skipped and returned to the queue.' });
});

const recall = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);

  if (getCurrentServing(department._id)) {
    return res
      .status(409)
      .json({ message: 'Complete, skip, or mark the current patient as no-show first.' });
  }

  const lastSkippedPatient = getLastSkipped(department._id);
  if (!lastSkippedPatient) {
    return res.status(404).json({ message: 'No previously skipped patient to recall.' });
  }

  const removed = scheduler.remove(lastSkippedPatient.id);
  if (!removed) {
    return res
      .status(404)
      .json({ message: 'The previously skipped patient is no longer in the queue.' });
  }

  setCurrentServing(department._id, removed);
  clearLastSkipped(department._id);

  await Appointment.findByIdAndUpdate(removed.id, { status: 'in-consultation' });
  await Token.findOneAndUpdate(
    { appointment: removed.id },
    { status: 'called', calledAt: new Date() },
  );

  broadcastQueueUpdate(req.app.locals.io, department._id, scheduler);
  await emitAppointmentCalled(req.app.locals.io, department._id, removed);

  res.locals.auditTargetId = removed.id;
  res.status(200).json({ current: await enrichPatient(removed) });
});

const complete = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);
  const current = getCurrentServing(department._id);

  if (!current) {
    return res.status(400).json({ message: 'No patient is currently being called.' });
  }

  clearCurrentServing(department._id);
  clearLastSkipped(department._id);

  const appointment = await Appointment.findByIdAndUpdate(
    current.id,
    { status: 'completed', completedAt: new Date() },
    { new: true },
  );
  await Token.findOneAndUpdate(
    { appointment: current.id },
    { status: 'completed', completedAt: new Date() },
  );

  broadcastQueueUpdate(req.app.locals.io, department._id, scheduler);
  if (req.app.locals.io) {
    req.app.locals.io.emit('appointment:completed', {
      appointmentId: appointment._id.toString(),
      patientId: appointment.patient.toString(),
    });
  }

  res.locals.auditTargetId = appointment._id.toString();
  res.status(200).json({ message: 'Consultation completed.' });
});

const refer = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);
  const current = getCurrentServing(department._id);

  if (!current) {
    return res.status(400).json({ message: 'No patient is currently being called.' });
  }

  const newDepartment = await Department.findById(req.body.newDepartmentId);
  if (!newDepartment) {
    return res.status(404).json({ message: 'Destination department not found.' });
  }
  if (newDepartment._id.toString() === department._id.toString()) {
    return res.status(400).json({ message: 'Choose a different department to refer to.' });
  }

  clearCurrentServing(department._id);
  clearLastSkipped(department._id);

  const newDoctor = await assignDoctor(newDepartment._id);

  const appointment = await Appointment.findByIdAndUpdate(
    current.id,
    { department: newDepartment._id, doctor: newDoctor._id, status: 'in-queue' },
    { new: true },
  );

  const newScheduler = getScheduler(newDepartment._id);
  newScheduler.enqueue({ ...current, queuedAt: Date.now() });

  await Token.findOneAndUpdate(
    { appointment: current.id },
    { department: newDepartment._id, status: 'waiting', calledAt: null },
  );

  broadcastQueueUpdate(req.app.locals.io, department._id, scheduler);
  broadcastQueueUpdate(req.app.locals.io, newDepartment._id, newScheduler);

  res.locals.auditTargetId = current.id;
  res.status(200).json({
    message: `Patient referred to ${newDepartment.name}.`,
    appointment: { id: appointment._id, department: newDepartment.name },
  });
});

const markNoShow = asyncHandler(async (req, res) => {
  const department = await getDoctorDepartment(req);
  const scheduler = getScheduler(department._id);
  const current = getCurrentServing(department._id);

  if (!current) {
    return res.status(400).json({ message: 'No patient is currently being called.' });
  }

  clearCurrentServing(department._id);
  clearLastSkipped(department._id);

  const { next } = removeAndPromoteNext(scheduler, current.id);

  await Appointment.findByIdAndUpdate(current.id, { status: 'no-show' });
  await Token.findOneAndUpdate({ appointment: current.id }, { status: 'no-show' });

  if (next) {
    setCurrentServing(department._id, next.patient);
    await Appointment.findByIdAndUpdate(next.patient.id, { status: 'in-consultation' });
    await Token.findOneAndUpdate(
      { appointment: next.patient.id },
      { status: 'called', calledAt: new Date() },
    );
    await emitAppointmentCalled(req.app.locals.io, department._id, next.patient);
  }

  broadcastQueueUpdate(req.app.locals.io, department._id, scheduler);

  res.locals.auditTargetId = current.id;
  res.status(200).json({
    message: 'Patient marked as no-show.',
    current: next ? await enrichPatient(next.patient) : null,
  });
});

// Patients whose visit completed within the last 24h - the only window
// where they're not already surfaced via the live current-patient/waiting
// views above, but are still reachable for a chat (see chatEligibility.js).
const recentPatients = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({
    doctor: req.user._id,
    status: 'completed',
    completedAt: { $gte: new Date(Date.now() - CHAT_WINDOW_MS) },
  })
    .sort({ completedAt: -1 })
    .populate('patient', 'name');

  res.status(200).json({
    patients: appointments.map((appointment) => ({
      appointmentId: appointment._id,
      patientName: appointment.patient?.name || 'Unknown',
      completedAt: appointment.completedAt,
      chatOpen: isChatOpen(appointment),
      chatClosesAt: chatClosesAt(appointment),
    })),
  });
});

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const updateAvailability = asyncHandler(async (req, res) => {
  const { isUnavailable, hours, dateOverrides } = req.body;

  const update = {};
  if (typeof isUnavailable === 'boolean') {
    update['availability.isUnavailable'] = isUnavailable;
  }
  if (hours && typeof hours === 'object') {
    for (const day of [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]) {
      if (hours[day]) {
        if (typeof hours[day].start === 'string')
          update[`availability.${day}.start`] = hours[day].start;
        if (typeof hours[day].end === 'string') update[`availability.${day}.end`] = hours[day].end;
      }
    }
  }

  // A doctor whose schedule doesn't follow a recurring weekday pattern can
  // set/unset specific calendar dates instead - a date entry always takes
  // precedence over that weekday's hours (see isDoctorUnavailableOn), so a
  // single date is enough even with no weekly hours set at all.
  if (Array.isArray(dateOverrides)) {
    const byDate = new Map();
    for (const entry of dateOverrides) {
      if (!entry || typeof entry.date !== 'string' || !DATE_KEY_PATTERN.test(entry.date)) {
        return res.status(400).json({ message: 'Each date override needs a valid YYYY-MM-DD date.' });
      }
      byDate.set(entry.date, {
        date: entry.date,
        start: typeof entry.start === 'string' ? entry.start : '',
        end: typeof entry.end === 'string' ? entry.end : '',
        isUnavailable: Boolean(entry.isUnavailable),
      });
    }
    update['availability.dateOverrides'] = Array.from(byDate.values());
  }

  const doctor = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });

  res.status(200).json({ availability: doctor.availability });
});

module.exports = {
  getQueue,
  callNext,
  skip,
  recall,
  complete,
  refer,
  markNoShow,
  recentPatients,
  updateAvailability,
};
