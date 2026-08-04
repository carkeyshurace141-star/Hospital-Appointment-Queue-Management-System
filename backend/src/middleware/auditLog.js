const AuditLog = require('../models/AuditLog');

// Records an audit entry after the main handler succeeds. Fire-and-forget
// by design - writing the audit trail must never slow down or fail the
// actual request - but failures are not swallowed silently, they're
// logged server-side so a broken audit trail is still noticed.
//
// The target id is usually not known until the controller runs (e.g. which
// appointment a clinician action applied to), so controllers that act on a
// resource not present in req.params should set `res.locals.auditTargetId`
// before responding; this falls back to req.params.id when present.
function logAccess(action, targetType) {
  return function auditLogMiddleware(req, res, next) {
    res.on('finish', () => {
      if (res.statusCode >= 400 || !req.user) return;

      AuditLog.create({
        user: req.user._id,
        action,
        targetType,
        targetId: req.params.id || res.locals.auditTargetId || null,
      }).catch((err) => {
        console.error('[auditLog] failed to record access', err);
      });
    });
    next();
  };
}

module.exports = { logAccess };
