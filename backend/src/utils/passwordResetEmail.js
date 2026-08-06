const { sendMail } = require('../config/mailer');

// `user` must have name/email (a local-provider User document, see
// forgotPassword in authController.js). `rawToken` is the one-time value
// that only ever exists in this email - the database stores just its hash.
async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${process.env.CLIENT_ORIGIN || ''}/reset-password/${rawToken}`;

  const subject = 'Reset your MediQueue password';

  const text = [
    `Hi ${user.name},`,
    '',
    'We received a request to reset your MediQueue password. This link expires in 1 hour:',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email - your password won't change.",
    '',
    '- MediQueue',
  ].join('\n');

  const html = `
    <p>Hi ${user.name},</p>
    <p>We received a request to reset your MediQueue password. This link expires in 1 hour:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, you can safely ignore this email - your password won't change.</p>
    <p>- MediQueue</p>
  `;

  // sendMail (src/config/mailer.js) already swallows its own errors, but
  // this is wrapped here too so requesting a reset can never fail just
  // because emailing the link did.
  try {
    return await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error('[mailer] failed to send password reset email', err.message);
    return { skipped: true, error: err };
  }
}

module.exports = { sendPasswordResetEmail };
