const express = require('express');
const { body, param } = require('express-validator');
const { getMessages, sendMessage, getUnreadCount } = require('../controllers/chatController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLog');

const router = express.Router();

const appointmentIdValidation = [
  param('appointmentId').isMongoId().withMessage('Invalid appointment id.'),
];

const sendMessageValidation = [
  body('body')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty.')
    .isLength({ max: 2000 })
    .withMessage('Message is too long.'),
];

router.get('/unread-count', requireAuth, getUnreadCount);

router.get(
  '/:appointmentId/messages',
  requireAuth,
  appointmentIdValidation,
  validate,
  logAccess('view_messages', 'appointment'),
  getMessages,
);

router.post(
  '/:appointmentId/messages',
  requireAuth,
  appointmentIdValidation,
  sendMessageValidation,
  validate,
  logAccess('send_message', 'appointment'),
  sendMessage,
);

module.exports = router;
