const express = require('express');
const {
  listDepartments,
  listDoctorsForDepartment,
  getQueueSummary,
} = require('../controllers/departmentController');

const router = express.Router();

router.get('/', listDepartments);
router.get('/:id/doctors', listDoctorsForDepartment);
router.get('/:id/queue-summary', getQueueSummary);

module.exports = router;
