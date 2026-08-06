const { sendMail } = require('../config/mailer');

// `doctor` must have name/email/specialization/department (a freshly
// created User document, see addDoctor in adminController.js).
async function sendDoctorWelcomeEmail(doctor, temporaryPassword) {
  const loginUrl = process.env.CLIENT_ORIGIN ? `${process.env.CLIENT_ORIGIN}/login` : null;

  const subject = 'Your MediQueue doctor account has been created';

  const text = [
    `Hi ${doctor.name},`,
    '',
    'An account has been created for you on MediQueue. Login details:',
    `- Email: ${doctor.email}`,
    `- Temporary password: ${temporaryPassword}`,
    `- Specialization: ${doctor.specialization}`,
    `- Department: ${doctor.department}`,
    '',
    "You'll be asked to set a new password the first time you log in.",
    loginUrl ? `Log in here: ${loginUrl}` : '',
    '',
    '- MediQueue',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <p>Hi ${doctor.name},</p>
    <p>An account has been created for you on MediQueue. Login details:</p>
    <ul>
      <li><strong>Email:</strong> ${doctor.email}</li>
      <li><strong>Temporary password:</strong> ${temporaryPassword}</li>
      <li><strong>Specialization:</strong> ${doctor.specialization}</li>
      <li><strong>Department:</strong> ${doctor.department}</li>
    </ul>
    <p>You'll be asked to set a new password the first time you log in.</p>
    ${loginUrl ? `<p><a href="${loginUrl}">${loginUrl}</a></p>` : ''}
    <p>- MediQueue</p>
  `;

  // sendMail (src/config/mailer.js) already swallows its own errors, but
  // this is wrapped here too so creating the account can never fail just
  // because emailing the credentials did.
  try {
    return await sendMail({ to: doctor.email, subject, text, html });
  } catch (err) {
    console.error('[mailer] failed to send doctor welcome email', err.message);
    return { skipped: true, error: err };
  }
}

module.exports = { sendDoctorWelcomeEmail };
