const CHAT_WINDOW_MS = 24 * 60 * 60 * 1000;

const OPEN_STATUSES = ['booked', 'checked-in', 'in-queue', 'in-consultation'];

// Chat stays open for the lifetime of an active appointment, and for 24h
// after a clinician marks it complete (follow-up questions), but never for
// an appointment that never happened (cancelled/no-show).
function isChatOpen(appointment) {
  if (!appointment.doctor) return false;
  if (OPEN_STATUSES.includes(appointment.status)) return true;
  if (appointment.status === 'completed' && appointment.completedAt) {
    return Date.now() - new Date(appointment.completedAt).getTime() < CHAT_WINDOW_MS;
  }
  return false;
}

// ISO timestamp the window closes at, or null if it's not on a closing
// timer (still active) or already permanently closed.
function chatClosesAt(appointment) {
  if (appointment.status !== 'completed' || !appointment.completedAt) return null;
  return new Date(new Date(appointment.completedAt).getTime() + CHAT_WINDOW_MS).toISOString();
}

module.exports = { isChatOpen, chatClosesAt, CHAT_WINDOW_MS };
