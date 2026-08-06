const express = require('express');
const { body } = require('express-validator');
const {
  getQueue,
  callNext,
  skip,
  recall,
  complete,
  refer,
  markNoShow,
  recentPatients,
  updateAvailability,
} = require('../controllers/clinicianController');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLog');

const router = express.Router();

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const referValidation = [
  body('newDepartmentId').isMongoId().withMessage('A valid destination department is required.'),
];

const updateAvailabilityValidation = [
  body('isUnavailable').optional().isBoolean().withMessage('isUnavailable must be true or false.'),
  body('hours').optional().isObject().withMessage('hours must be an object keyed by weekday.'),
  ...DAYS.flatMap((day) => [
    // checkFalsy: '' (the Remove button's cleared state) counts as "not
    // provided" and skips the pattern check, instead of failing HH:MM.
    body(`hours.${day}.start`)
      .optional({ checkFalsy: true })
      .matches(TIME_PATTERN)
      .withMessage(`${day} start time must be in HH:MM format.`),
    body(`hours.${day}.end`)
      .optional({ checkFalsy: true })
      .matches(TIME_PATTERN)
      .withMessage(`${day} end time must be in HH:MM format.`),
  ]),
  body('dateOverrides').optional().isArray().withMessage('dateOverrides must be an array.'),
  body('dateOverrides.*.date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Each date override needs a valid YYYY-MM-DD date.'),
  body('dateOverrides.*.start')
    .optional({ checkFalsy: true })
    .matches(TIME_PATTERN)
    .withMessage('Date override start time must be in HH:MM format.'),
  body('dateOverrides.*.end')
    .optional({ checkFalsy: true })
    .matches(TIME_PATTERN)
    .withMessage('Date override end time must be in HH:MM format.'),
  body('dateOverrides.*.isUnavailable')
    .optional()
    .isBoolean()
    .withMessage('isUnavailable must be true or false.'),
];

router.get(
  '/queue',
  requireAuth,
  requireRole('doctor'),
  logAccess('view_queue', 'department'),
  getQueue,
);
router.post(
  '/queue/call',
  requireAuth,
  requireRole('doctor'),
  logAccess('call_patient', 'appointment'),
  callNext,
);
router.post(
  '/queue/skip',
  requireAuth,
  requireRole('doctor'),
  logAccess('skip_patient', 'appointment'),
  skip,
);
router.post(
  '/queue/recall',
  requireAuth,
  requireRole('doctor'),
  logAccess('recall_patient', 'appointment'),
  recall,
);
router.post(
  '/queue/complete',
  requireAuth,
  requireRole('doctor'),
  logAccess('complete_consultation', 'appointment'),
  complete,
);
router.post(
  '/queue/refer',
  requireAuth,
  requireRole('doctor'),
  referValidation,
  validate,
  logAccess('refer_patient', 'appointment'),
  refer,
);
router.post(
  '/queue/no-show',
  requireAuth,
  requireRole('doctor'),
  logAccess('mark_no_show', 'appointment'),
  markNoShow,
);
router.get(
  '/recent-patients',
  requireAuth,
  requireRole('doctor'),
  logAccess('view_recent_patients', 'department'),
  recentPatients,
);
router.patch(
  '/availability',
  requireAuth,
  requireRole('doctor'),
  updateAvailabilityValidation,
  validate,
  updateAvailability,
);

module.exports = router;
