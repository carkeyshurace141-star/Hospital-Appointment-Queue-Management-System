// In-process registry of one MultiLevelQueueScheduler per department.
// Not persisted directly - schedulers reset when the server restarts - but
// hydrateFromDatabase() below rebuilds them from the Appointment/Token
// collections on startup so a restart never silently drops patients who are
// still waiting.
const MultiLevelQueueScheduler = require('./multiLevelQueue');
const Appointment = require('../src/models/Appointment');
const Token = require('../src/models/Token');

const schedulers = new Map();

// Alongside each department's scheduler, the Clinician Dashboard needs to
// track two extra pieces of in-memory state that don't belong inside the
// scheduler itself: which patient is currently being seen (removed from
// the queue by Call/Recall, but not yet Completed/Skipped/marked No-Show),
// and the last patient who was Skipped, so Recall can bring back that
// specific patient rather than whoever is next by priority.
const currentServing = new Map();
const lastSkipped = new Map();

function key(departmentId) {
  return departmentId.toString();
}

function getScheduler(departmentId) {
  const departmentKey = key(departmentId);
  if (!schedulers.has(departmentKey)) {
    schedulers.set(departmentKey, new MultiLevelQueueScheduler());
  }
  return schedulers.get(departmentKey);
}

function getCurrentServing(departmentId) {
  return currentServing.get(key(departmentId)) || null;
}

function setCurrentServing(departmentId, patient) {
  currentServing.set(key(departmentId), patient);
}

function clearCurrentServing(departmentId) {
  currentServing.delete(key(departmentId));
}

function getLastSkipped(departmentId) {
  return lastSkipped.get(key(departmentId)) || null;
}

function setLastSkipped(departmentId, patient) {
  lastSkipped.set(key(departmentId), patient);
}

function clearLastSkipped(departmentId) {
  lastSkipped.delete(key(departmentId));
}

// Test-only escape hatch to reset state between test cases/suites.
function resetSchedulers() {
  schedulers.clear();
  currentServing.clear();
  lastSkipped.clear();
}

// Rebuilds every department's in-memory scheduler from the database. Called
// once at server startup so a restart can never leave the DB saying a
// patient is "in-queue" while the live queue itself has no idea they exist.
//
// 'in-consultation' appointments are restored to the queue too (as
// currentServing is transient in-memory state that a restart always loses
// anyway) so a patient who was mid-consultation when the server went down
// isn't left stranded - the doctor just calls them again via Call Next.
async function hydrateFromDatabase() {
  const appointments = await Appointment.find({
    status: { $in: ['in-queue', 'in-consultation'] },
  }).sort({ createdAt: 1 });

  if (appointments.length === 0) return { restored: 0 };

  const appointmentIds = appointments.map((appointment) => appointment._id);
  const tokens = await Token.find({ appointment: { $in: appointmentIds } });
  const tokenByAppointment = new Map(tokens.map((t) => [t.appointment.toString(), t]));

  let restored = 0;
  for (const appointment of appointments) {
    const token = tokenByAppointment.get(appointment._id.toString());
    const scheduler = getScheduler(appointment.department);

    scheduler.enqueue({
      id: appointment._id.toString(),
      category: appointment.category,
      type: appointment.type,
      tokenNumber: token ? token.tokenNumber : null,
      queuedAt: (token ? token.issuedAt : appointment.createdAt).getTime(),
    });
    restored += 1;

    if (appointment.status !== 'in-queue') {
      appointment.status = 'in-queue';
      await appointment.save();
    }
    if (token && token.status !== 'waiting') {
      token.status = 'waiting';
      token.calledAt = null;
      await token.save();
    }
  }

  return { restored };
}

module.exports = {
  getScheduler,
  getCurrentServing,
  setCurrentServing,
  clearCurrentServing,
  getLastSkipped,
  setLastSkipped,
  clearLastSkipped,
  resetSchedulers,
  hydrateFromDatabase,
};
