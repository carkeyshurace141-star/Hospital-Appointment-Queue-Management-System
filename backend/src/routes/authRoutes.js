const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { signup, login, googleAuth, me } = require('../controllers/authController');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

const signupValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
  body('phone')
    .trim()
    .matches(/^\+?[0-9\s\-().]{7,20}$/)
    .withMessage('Please provide a valid phone number.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const googleValidation = [body('credential').notEmpty().withMessage('Missing Google credential.')];

router.post('/signup', signupValidation, validate, signup);
router.post('/login', loginLimiter, loginValidation, validate, login);
router.post('/google', loginLimiter, googleValidation, validate, googleAuth);
router.get('/me', requireAuth, me);

module.exports = router;
