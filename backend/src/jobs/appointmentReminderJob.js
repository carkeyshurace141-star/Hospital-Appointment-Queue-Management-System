const Appointment = require('../models/Appointment');
const { sendAppointmentReminderEmail } = require('../utils/appointmentEmail');

const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Finds every still-booked appointment whose slot falls inside the next 2
// hours and hasn't been reminded yet, emails the patient, and stamps
// reminderSentAt so a later sweep never sends it twice (see Appointment
// model). Appointments already checked in don't need a reminder.
async function runReminderSweep(now = new Date()) {
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueAppointments = await Appointment.find({
    status: 'booked',
    timeSlot: { $gt: now, $lte: windowEnd },
    reminderSentAt: null,
  })
    .populate('department')
    .populate('doctor')
    .populate('patient');

  let sent = 0;
  for (const appointment of dueAppointments) {
    if (appointment.patient) {
      await sendAppointmentReminderEmail(appointment, appointment.patient);
      sent += 1;
    }
    appointment.reminderSentAt = now;
    await appointment.save();
  }

  return { checked: dueAppointments.length, sent };
}

function startAppointmentReminderJob(intervalMs = DEFAULT_SWEEP_INTERVAL_MS) {
  const tick = () => {
    runReminderSweep().catch((err) => {
      console.error('[reminder-job] sweep failed', err.message);
    });
  };
  tick();
  return setInterval(tick, intervalMs);
}

module.exports = { runReminderSweep, startAppointmentReminderJob, REMINDER_WINDOW_MS };
