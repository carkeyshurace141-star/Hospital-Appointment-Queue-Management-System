// In-process registry of one MultiLevelQueueScheduler per department.
// Deliberately not persisted — schedulers reset when the server restarts.
// Longer-term persistence is out of scope for this stage of the project.
const MultiLevelQueueScheduler = require('./multiLevelQueue');

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

module.exports = {
  getScheduler,
  getCurrentServing,
  setCurrentServing,
  clearCurrentServing,
  getLastSkipped,
  setLastSkipped,
  clearLastSkipped,
  resetSchedulers,
};
