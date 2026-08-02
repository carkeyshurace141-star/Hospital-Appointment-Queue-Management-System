const express = require('express');
const {
  listDepartments,
  listDoctorsForDepartment,
} = require('../controllers/departmentController');

const router = express.Router();

router.get('/', listDepartments);
router.get('/:id/doctors', listDoctorsForDepartment);

module.exports = router;
