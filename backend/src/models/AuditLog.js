const mongoose = require('mongoose');

// Scaffolded for a later week — fields to be added when audit logging is built.
const auditLogSchema = new mongoose.Schema({}, { collection: 'audit_logs' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
