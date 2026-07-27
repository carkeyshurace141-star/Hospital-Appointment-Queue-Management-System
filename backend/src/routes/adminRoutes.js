const express = require('express');
const { body } = require('express-validator');
const { addDoctor, listDoctors } = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validatePhoneNumber } = require('../utils/phone');

const router = express.Router();

const addDoctorValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be at least 2 characters.'),
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

router.post('/doctors', requireAuth, requireRole('admin'), addDoctorValidation, validate, addDoctor);
router.get('/doctors', requireAuth, requireRole('admin'), listDoctors);

module.exports = router;
