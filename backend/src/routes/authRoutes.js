const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  signup,
  login,
  googleAuth,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { validatePasswordStrength } = require('../utils/passwordPolicy');
const { validatePhoneNumber } = require('../utils/phone');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reset requests. Please try again later.' },
});

const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be at least 2 characters.'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
  body('phone')
    .trim()
    .custom((value) => validatePhoneNumber(value))
    .withMessage('Please provide a valid phone number.'),
  body('password').custom((value) => {
    const error = validatePasswordStrength(value);
    if (error) throw new Error(error);
    return true;
  }),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const googleValidation = [body('credential').notEmpty().withMessage('Missing Google credential.')];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').custom((value) => {
    const error = validatePasswordStrength(value);
    if (error) throw new Error(error);
    return true;
  }),
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('newPassword').custom((value) => {
    const error = validatePasswordStrength(value);
    if (error) throw new Error(error);
    return true;
  }),
];

router.post('/signup', signupValidation, validate, signup);
router.post('/login', loginLimiter, loginValidation, validate, login);
router.post('/google', loginLimiter, googleValidation, validate, googleAuth);
router.get('/me', requireAuth, me);
router.patch('/change-password', requireAuth, changePasswordValidation, validate, changePassword);
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidation,
  validate,
  forgotPassword,
);
router.post(
  '/reset-password',
  loginLimiter,
  resetPasswordValidation,
  validate,
  resetPassword,
);

module.exports = router;
