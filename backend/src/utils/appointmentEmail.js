const { sendMail } = require('../config/mailer');

const CATEGORY_LABELS = {
  emergency: 'Emergency',
  critical: 'Critical',
  elderly: 'Elderly',
  disabled: 'Disabled',
  regular: 'Regular',
};

function formatTimeSlot(timeSlot) {
  return new Date(timeSlot).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Shared by the booking-confirmation and reminder emails - both need the
// same department/doctor/time/category facts, just with different framing.
function appointmentDetails(appointment) {
  const doctorLine = appointment.doctor?.name
    ? `Dr. ${appointment.doctor.name}${
        appointment.doctor.specialization ? ` (${appointment.doctor.specialization})` : ''
      }`
    : 'To be assigned';

  return {
    doctorLine,
    departmentName: appointment.department?.name || 'the department',
    categoryLabel: CATEGORY_LABELS[appointment.category] || appointment.category,
    whenText: formatTimeSlot(appointment.timeSlot),
  };
}

// sendMail (src/config/mailer.js) already swallows its own errors, but this
// wraps every call too so a booking or reminder sweep can never fail just
// because notifying the patient did - even if that guarantee ever changes
// upstream (e.g. in a test double that doesn't implement it).
async function sendSafely(mail, logLabel) {
  try {
    return await sendMail(mail);
  } catch (err) {
    console.error(`[mailer] failed to send ${logLabel}`, err.message);
    return { skipped: true, error: err };
  }
}

// `appointment` must already have `department` and `doctor` populated
// (see createAppointment in appointmentController.js).
async function sendAppointmentConfirmationEmail(appointment, patient) {
  const { doctorLine, departmentName, categoryLabel, whenText } = appointmentDetails(appointment);

  const subject = `Appointment confirmed - ${departmentName} on ${whenText}`;

  const text = [
    `Hi ${patient.name},`,
    '',
    'Your appointment has been booked. Details:',
    `- Department: ${departmentName}`,
    `- Doctor: ${doctorLine}`,
    `- Date & time: ${whenText}`,
    `- Priority category: ${categoryLabel}`,
    `- Booking reference: ${appointment._id}`,
    '',
    'Please reach 15 minutes early to allow time for check-in.',
    '',
    '- MediQueue',
  ].join('\n');

  const html = `
    <p>Hi ${patient.name},</p>
    <p>Your appointment has been booked. Details:</p>
    <ul>
      <li><strong>Department:</strong> ${departmentName}</li>
      <li><strong>Doctor:</strong> ${doctorLine}</li>
      <li><strong>Date &amp; time:</strong> ${whenText}</li>
      <li><strong>Priority category:</strong> ${categoryLabel}</li>
      <li><strong>Booking reference:</strong> ${appointment._id}</li>
    </ul>
    <p><strong>Please reach 15 minutes early</strong> to allow time for check-in.</p>
    <p>- MediQueue</p>
  `;

  return sendSafely({ to: patient.email, subject, text, html }, 'appointment confirmation');
}

// `appointment` must already have `department` and `doctor` populated
// (see appointmentReminderJob.js).
async function sendAppointmentReminderEmail(appointment, patient) {
  const { doctorLine, departmentName, categoryLabel, whenText } = appointmentDetails(appointment);

  const subject = `Reminder: your appointment is in 2 hours - ${departmentName}`;

  const text = [
    `Hi ${patient.name},`,
    '',
    'This is a reminder that your appointment is coming up in about 2 hours:',
    `- Department: ${departmentName}`,
    `- Doctor: ${doctorLine}`,
    `- Date & time: ${whenText}`,
    `- Priority category: ${categoryLabel}`,
    `- Booking reference: ${appointment._id}`,
    '',
    'Please reach 15 minutes early to allow time for check-in.',
    '',
    '- MediQueue',
  ].join('\n');

  const html = `
    <p>Hi ${patient.name},</p>
    <p>This is a reminder that your appointment is coming up in about 2 hours:</p>
    <ul>
      <li><strong>Department:</strong> ${departmentName}</li>
      <li><strong>Doctor:</strong> ${doctorLine}</li>
      <li><strong>Date &amp; time:</strong> ${whenText}</li>
      <li><strong>Priority category:</strong> ${categoryLabel}</li>
      <li><strong>Booking reference:</strong> ${appointment._id}</li>
    </ul>
    <p><strong>Please reach 15 minutes early</strong> to allow time for check-in.</p>
    <p>- MediQueue</p>
  `;

  return sendSafely({ to: patient.email, subject, text, html }, 'appointment reminder');
}

module.exports = { sendAppointmentConfirmationEmail, sendAppointmentReminderEmail };
