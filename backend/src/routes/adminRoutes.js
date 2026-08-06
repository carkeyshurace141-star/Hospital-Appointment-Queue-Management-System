const express = require('express');
const { body, param, query } = require('express-validator');
const {
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
} = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLog');
const { validatePhoneNumber } = require('../utils/phone');

const router = express.Router();

const addDoctorValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be at least 2 characters.'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
  body('phone')
    .trim()
    .custom((value) => validatePhoneNumber(value))
    .withMessage('Please provide a valid phone number.'),
  body('specialization')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Specialization must be at least 2 characters.'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be at least 2 characters.'),
];

const createDepartmentValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be at least 2 characters.'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description is too long.'),
];

const createSpecializationValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be at least 2 characters.'),
];

const doctorIdParamValidation = [param('id').isMongoId().withMessage('Invalid doctor id.')];

router.post(
  '/doctors',
  requireAuth,
  requireRole('admin'),
  addDoctorValidation,
  validate,
  addDoctor,
);
router.get('/doctors', requireAuth, requireRole('admin'), listDoctors);
router.delete(
  '/doctors/:id',
  requireAuth,
  requireRole('admin'),
  doctorIdParamValidation,
  validate,
  logAccess('delete_doctor', 'user'),
  deleteDoctor,
);
router.post(
  '/departments',
  requireAuth,
  requireRole('admin'),
  createDepartmentValidation,
  validate,
  createDepartment,
);
router.post(
  '/specializations',
  requireAuth,
  requireRole('admin'),
  createSpecializationValidation,
  validate,
  createSpecialization,
);
router.get(
  '/overview',
  requireAuth,
  requireRole('admin'),
  logAccess('view_overview', 'report'),
  getOverview,
);
router.get(
  '/queues',
  requireAuth,
  requireRole('admin'),
  logAccess('view_queues', 'report'),
  getQueuesOverview,
);
router.get(
  '/completed-today',
  requireAuth,
  requireRole('admin'),
  logAccess('view_completed_today', 'report'),
  getCompletedTodayDetails,
);
router.get('/audit-log', requireAuth, requireRole('admin'), getAuditLog);

const reportQueryValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid date.'),
  query('to').optional().isISO8601().withMessage('to must be a valid date.'),
  query('format').optional().isIn(['csv']).withMessage('format must be csv if provided.'),
];

router.get(
  '/reports/doctor-workload',
  requireAuth,
  requireRole('admin'),
  reportQueryValidation,
  validate,
  logAccess('view_doctor_workload_report', 'report'),
  getDoctorWorkloadReport,
);
router.get(
  '/reports/queue-performance',
  requireAuth,
  requireRole('admin'),
  reportQueryValidation,
  validate,
  logAccess('view_queue_performance_report', 'report'),
  getQueuePerformanceReport,
);
router.get(
  '/benchmark-results',
  requireAuth,
  requireRole('admin'),
  logAccess('view_benchmark_results', 'report'),
  getBenchmarkResults,
);

module.exports = router;
