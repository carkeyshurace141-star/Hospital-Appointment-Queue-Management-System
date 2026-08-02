// Shared by any controller that mutates a department's in-memory scheduler
// (appointmentController, clinicianController) so every caller broadcasts
// the queue:updated event in the same shape, documented in
// docs/event-contracts.md.
function buildQueueSnapshot(scheduler) {
  return scheduler.toArray().map((patient) => ({
    tokenNumber: patient.tokenNumber,
    category: patient.category,
    status: 'waiting',
  }));
}

function broadcastQueueUpdate(io, departmentId, scheduler) {
  if (!io) return;
  io.emit('queue:updated', {
    departmentId: departmentId.toString(),
    queueSnapshot: buildQueueSnapshot(scheduler),
  });
}

module.exports = { buildQueueSnapshot, broadcastQueueUpdate };
