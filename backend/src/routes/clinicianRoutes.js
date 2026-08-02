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
    body(`hours.${day}.start`)
      .optional()
      .matches(TIME_PATTERN)
      .withMessage(`${day} start time must be in HH:MM format.`),
    body(`hours.${day}.end`)
      .optional()
      .matches(TIME_PATTERN)
      .withMessage(`${day} end time must be in HH:MM format.`),
  ]),
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
router.patch(
  '/availability',
  requireAuth,
  requireRole('doctor'),
  updateAvailabilityValidation,
  validate,
  updateAvailability,
);

module.exports = router;
