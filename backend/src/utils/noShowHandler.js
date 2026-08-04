// Removes a no-show patient from a MultiLevelQueueScheduler instance and
// immediately serves whoever is next, so the queue keeps moving. Operates
// on the scheduler directly - callers are responsible for updating the
// appointment's status and any persisted Token in the database.
function removeAndPromoteNext(scheduler, appointmentId) {
  const removed = scheduler.remove(appointmentId);
  const next = scheduler.serveNext();
  return { removed, next };
}

module.exports = { removeAndPromoteNext };
