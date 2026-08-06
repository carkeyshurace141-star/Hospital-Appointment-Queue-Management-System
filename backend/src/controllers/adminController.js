const User = require('../models/User');
const Department = require('../models/Department');
const Specialization = require('../models/Specialization');
const Appointment = require('../models/Appointment');
const Token = require('../models/Token');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errorHandler');
const { hashPassword, generateTemporaryPassword } = require('../utils/password');
const { toPublicDepartment } = require('./departmentController');
const { toPublicSpecialization } = require('./specializationController');
const { ACTIVE_STATUSES } = require('../utils/resourceAllocation');
const { computeAndCacheBenchmark, getCachedBenchmark } = require('../utils/benchmarkCache');
const { sendDoctorWelcomeEmail } = require('../utils/doctorEmail');
const { toCsv } = require('../utils/csv');
const { getScheduler, getCurrentServing } = require('../../scheduling-engine/schedulerManager');

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

// Reports default to the last 7 days when no explicit range is given.
function parseDateRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function sendCsv(res, filename, rows) {
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(toCsv(rows));
}

function toDoctorSummary(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    specialization: user.specialization,
    department: user.department,
    createdAt: user.createdAt,
    // Lets the admin overview's "Doctors on duty" / "Doctors unavailable"
    // tiles split the already-loaded doctor list client-side instead of
    // needing their own endpoints.
    unavailable: Boolean(user.availability?.isUnavailable),
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

  // Best-effort: sendDoctorWelcomeEmail never throws, so a mail outage
  // never turns a successful account creation into a failed request - the
  // admin still sees the credentials on screen (and can share them
  // manually) either way.
  await sendDoctorWelcomeEmail(doctor, temporaryPassword);

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

const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' });
  if (!doctor) {
    return res.status(404).json({ message: 'Doctor not found.' });
  }

  // Deleting a doctor mid-appointment would strand whoever they're
  // scheduled with or currently seeing - the in-memory queue state isn't
  // keyed by doctor, so it wouldn't even notice. Reassign or complete those
  // first.
  const activeAppointments = await Appointment.countDocuments({
    doctor: doctor._id,
    status: { $in: ACTIVE_STATUSES },
  });
  if (activeAppointments > 0) {
    return res.status(409).json({
      message:
        'This doctor has active appointments. Reassign or complete them before deleting the account.',
    });
  }

  await doctor.deleteOne();
  res.status(200).json({ message: 'Doctor account deleted.' });
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const existing = await Department.findOne({ name: name.trim() });
  if (existing) {
    return res.status(409).json({ message: 'A department with that name already exists.' });
  }

  const department = await Department.create({ name, description });
  res.status(201).json({ department: toPublicDepartment(department) });
});

const createSpecialization = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const existing = await Specialization.findOne({ name: name.trim() });
  if (existing) {
    return res.status(409).json({ message: 'A specialization with that name already exists.' });
  }

  const specialization = await Specialization.create({ name });
  res.status(201).json({ specialization: toPublicSpecialization(specialization) });
});

// Live snapshot for the admin System Performance Overview. Deliberately
// simple, DB-derived numbers rather than reaching into the in-memory
// schedulers, so this stays correct across server restarts and reflects
// what's actually persisted.
const getOverview = asyncHandler(async (req, res) => {
  const start = startOfToday();

  const [patientsQueued, doctorsOnDuty, doctorsUnavailable, consultationsCompletedToday, calledToday] =
    await Promise.all([
      Appointment.countDocuments({ status: 'in-queue' }),
      User.countDocuments({ role: 'doctor', 'availability.isUnavailable': { $ne: true } }),
      User.countDocuments({ role: 'doctor', 'availability.isUnavailable': true }),
      Token.countDocuments({ status: 'completed', completedAt: { $gte: start } }),
      Token.find({ issuedAt: { $gte: start }, calledAt: { $ne: null } }, 'issuedAt calledAt'),
    ]);

  const averageWaitMinutesToday =
    calledToday.length === 0
      ? 0
      : Math.round(
          (calledToday.reduce((sum, t) => sum + (t.calledAt - t.issuedAt) / 60000, 0) /
            calledToday.length) *
            10,
        ) / 10;

  res.status(200).json({
    patientsQueued,
    averageWaitMinutesToday,
    doctorsOnDuty,
    doctorsUnavailable,
    consultationsCompletedToday,
  });
});

// Per-consultation detail behind the overview's "Completed today" tile -
// same underlying count as getOverview.consultationsCompletedToday, but
// with who/where/when so it's actually useful once clicked into.
const getCompletedTodayDetails = asyncHandler(async (req, res) => {
  const start = startOfToday();

  const tokens = await Token.find({ status: 'completed', completedAt: { $gte: start } })
    .sort({ completedAt: -1 })
    .populate('department', 'name')
    .populate({
      path: 'appointment',
      populate: [
        { path: 'patient', select: 'name' },
        { path: 'doctor', select: 'name' },
      ],
    });

  res.status(200).json({
    completed: tokens.map((token) => ({
      tokenNumber: token.tokenNumber,
      patientName: token.appointment?.patient?.name || 'Unknown',
      doctorName: token.appointment?.doctor?.name || 'Unassigned',
      department: token.department?.name || 'Unknown',
      completedAt: token.completedAt,
    })),
  });
});

// Enriches the scheduler's bare patient records (id/category/type/
// tokenNumber/queuedAt) with the patient's name, mirroring
// clinicianController.enrichPatients but for the admin's cross-department
// view rather than a single doctor's own queue.
async function enrichQueuePatients(patients) {
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

// Full live detail for every department's queue at once - who's currently
// being seen and everyone waiting behind them - so the admin can drill into
// any department's queue without needing that doctor's own dashboard.
const getQueuesOverview = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });

  const queues = await Promise.all(
    departments.map(async (department) => {
      const scheduler = getScheduler(department._id);
      const current = getCurrentServing(department._id);

      const [currentDetails, waiting] = await Promise.all([
        enrichQueuePatients(current ? [current] : []),
        enrichQueuePatients(scheduler.toArray()),
      ]);

      return {
        department: { id: department._id, name: department.name },
        current: currentDetails[0] || null,
        waiting,
        waitingCount: waiting.length,
      };
    }),
  );

  res.status(200).json({ queues });
});

const getAuditLog = asyncHandler(async (req, res) => {
  const { user, action, from, to, page = 1, pageSize = 20 } = req.query;

  const filter = {};
  if (user) filter.user = user;
  if (action) filter.action = action;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNumber = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((pageNumber - 1) * pageSizeNumber)
      .limit(pageSizeNumber)
      .populate('user', 'name email'),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    logs: logs.map((log) => ({
      id: log._id,
      user: log.user ? { id: log.user._id, name: log.user.name, email: log.user.email } : null,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      timestamp: log.timestamp,
    })),
    total,
    page: pageNumber,
    pageSize: pageSizeNumber,
  });
});

// Appointments completed per doctor over the range, counted off Token
// completedAt (the source of truth for "when a consultation finished").
const getDoctorWorkloadReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);

  const rows = await Token.aggregate([
    { $match: { status: 'completed', completedAt: { $gte: from, $lte: to } } },
    {
      $lookup: {
        from: 'appointments',
        localField: 'appointment',
        foreignField: '_id',
        as: 'appointment',
      },
    },
    { $unwind: '$appointment' },
    { $match: { 'appointment.doctor': { $ne: null } } },
    { $group: { _id: '$appointment.doctor', completedCount: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'doctor' } },
    { $unwind: '$doctor' },
    {
      $project: {
        _id: 0,
        doctorId: '$_id',
        doctorName: '$doctor.name',
        department: '$doctor.department',
        completedCount: 1,
      },
    },
    { $sort: { completedCount: -1 } },
  ]);

  if (req.query.format === 'csv') {
    return sendCsv(res, 'doctor-workload.csv', rows);
  }

  res.status(200).json({ from, to, rows });
});

// Average wait (issuedAt -> calledAt) and token volume per department over
// the range - "queue length over a range" is read as total tokens issued
// in that window, not an instantaneous snapshot.
const getQueuePerformanceReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);

  const rows = await Token.aggregate([
    { $match: { issuedAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: '$department',
        tokenCount: { $sum: 1 },
        avgWaitMinutes: {
          $avg: {
            $cond: [
              { $ifNull: ['$calledAt', false] },
              { $divide: [{ $subtract: ['$calledAt', '$issuedAt'] }, 60000] },
              null,
            ],
          },
        },
      },
    },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
    { $unwind: '$department' },
    {
      $project: {
        _id: 0,
        departmentId: '$_id',
        departmentName: '$department.name',
        tokenCount: 1,
        avgWaitMinutes: { $round: [{ $ifNull: ['$avgWaitMinutes', 0] }, 1] },
      },
    },
    { $sort: { tokenCount: -1 } },
  ]);

  if (req.query.format === 'csv') {
    return sendCsv(res, 'queue-performance.csv', rows);
  }

  res.status(200).json({ from, to, rows });
});

// Computed automatically once at server startup (see server.js); this just
// serves the cached result so viewing the report never needs `npm run
// benchmark` run by hand. Falls back to computing it on the spot in the
// unlikely case the cache is empty (e.g. hot-reload during development).
const getBenchmarkResults = asyncHandler(async (req, res) => {
  const benchmark = getCachedBenchmark() || computeAndCacheBenchmark();
  res.status(200).json(benchmark);
});

module.exports = {
  addDoctor,
  listDoctors,
  deleteDoctor,
  createDepartment,
  createSpecialization,
  getOverview,
  getCompletedTodayDetails,
  getQueuesOverview,
  getAuditLog,
  getDoctorWorkloadReport,
  getQueuePerformanceReport,
  getBenchmarkResults,
};
