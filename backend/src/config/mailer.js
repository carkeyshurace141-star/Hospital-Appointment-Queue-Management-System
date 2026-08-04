const nodemailer = require('nodemailer');

let transporter;
let warnedMissingConfig = false;

// Built lazily (not at require-time) so tests and any environment without
// EMAIL_* vars set never try to construct a transporter at all.
function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    if (!warnedMissingConfig) {
      console.warn('[mailer] EMAIL_HOST/EMAIL_USER/EMAIL_PASS not set - emails will be skipped.');
      warnedMissingConfig = true;
    }
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

// Best-effort send: logs and resolves rather than throwing, so a broken
// mail server never fails the request that triggered the email.
async function sendMail({ to, subject, text, html }) {
  const client = getTransporter();
  if (!client) return { skipped: true };

  try {
    await client.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    return { skipped: false };
  } catch (err) {
    console.error('[mailer] failed to send email', err.message);
    return { skipped: true, error: err };
  }
}

module.exports = { sendMail };
