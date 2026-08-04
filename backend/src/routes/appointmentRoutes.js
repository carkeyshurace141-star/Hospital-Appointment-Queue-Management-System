const express = require('express');
const { body, param } = require('express-validator');
const {
  createAppointment,
  createWalkIn,
  listMine,
  cancelAppointment,
  rescheduleAppointment,
  checkIn,
  queueStatus,
} = require('../controllers/appointmentController');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['emergency', 'critical', 'elderly', 'disabled', 'regular'];

const futureTimeSlotValidation = body('timeSlot')
  .isISO8601()
  .withMessage('Please provide a valid date and time.')
  .custom((value) => new Date(value).getTime() > Date.now())
  .withMessage('Time slot must be in the future.');

const createAppointmentValidation = [
  body('department').isMongoId().withMessage('A valid department is required.'),
  body('doctor').optional().isMongoId().withMessage('Doctor must be a valid selection.'),
  body('category').isIn(CATEGORIES).withMessage('Please select a valid patient category.'),
  futureTimeSlotValidation,
];

const createWalkInValidation = [
  body('department').isMongoId().withMessage('A valid department is required.'),
  body('doctor').optional().isMongoId().withMessage('Doctor must be a valid selection.'),
  body('category').isIn(CATEGORIES).withMessage('Please select a valid patient category.'),
];

const rescheduleValidation = [futureTimeSlotValidation];

const idParamValidation = [param('id').isMongoId().withMessage('Invalid appointment id.')];

router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  createAppointmentValidation,
  validate,
  createAppointment,
);
router.post(
  '/walk-in',
  requireAuth,
  requireRole('patient'),
  createWalkInValidation,
  validate,
  createWalkIn,
);
router.get('/mine', requireAuth, listMine);
router.patch('/:id/cancel', requireAuth, idParamValidation, validate, cancelAppointment);
router.patch(
  '/:id/reschedule',
  requireAuth,
  idParamValidation,
  rescheduleValidation,
  validate,
  rescheduleAppointment,
);
router.post(
  '/:id/checkin',
  requireAuth,
  requireRole('patient'),
  idParamValidation,
  validate,
  checkIn,
);
router.get('/:id/queue-status', requireAuth, idParamValidation, validate, queueStatus);

module.exports = router;
