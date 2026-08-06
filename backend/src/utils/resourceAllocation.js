const User = require('../models/User');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');

const ACTIVE_STATUSES = ['booked', 'checked-in', 'in-queue', 'in-consultation'];

// Doctors think of "Monday 9-5" and patients pick a date/time in their own
// browser's local clock - neither carries an explicit timezone. Rather than
// pinning both to one hardcoded zone (which only agrees with reality for
// users physically in that zone), we deliberately omit `timeZone` here so
// Intl falls back to the machine's own local timezone - the server's for
// the backend, the browser's for the frontend mirror in
// BookAppointmentPage.jsx. That keeps a single-location hospital (staff and
// patients in the same place) self-consistent without any config, and Intl
// still handles that local zone's own DST switches automatically.
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
});
// 24h HH:mm, zero-padded, so it can be compared against the 'HH:mm'
// start/end strings with plain string comparison.
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// en-CA formats as 'YYYY-MM-DD', matching the dateOverride date strings.
function calendarDateKey(date) {
  return dateKeyFormatter.format(date);
}

function weekdayKey(date) {
  return weekdayFormatter.format(date).toLowerCase();
}

// 'HH:mm' for the given instant, in the local timezone.
function clockTime(date) {
  return timeFormatter.format(date);
}

// A doctor's weekly hours (Monday-Sunday) repeat every week, but a doctor
// whose schedule doesn't fit that pattern can add a specific-date entry -
// see availabilitySchema.dateOverrides in the User model. That entry always
// wins over the weekday grid and the global toggle for its date, so marking
// a single day off (or on) actually takes effect here. Otherwise, a weekday
// with no start/end time set means the doctor hasn't given hours for that
// day, so they're treated as unavailable - not just cosmetically blank.
//
// Having hours for the day isn't enough on its own - the requested instant
// also has to fall inside that day's [start, end) window, or a slot like
// 11pm on a day the doctor only works 9-5 would incorrectly pass.
function isDoctorUnavailableOn(doctor, date) {
  const availability = doctor.availability || {};
  const parsed = new Date(date);
  // An invalid/missing date (e.g. a walk-in booking mid-validation, before
  // the required-field check runs) falls back to the global toggle only -
  // there's no calendar date yet to match a date override or weekday against.
  if (Number.isNaN(parsed.getTime())) {
    return Boolean(availability.isUnavailable);
  }

  const dateKey = calendarDateKey(parsed);
  const override = (availability.dateOverrides || []).find((entry) => entry.date === dateKey);

  let hours;
  if (override) {
    if (override.isUnavailable) return true;
    // An override with no hours of its own isn't a blanket "available all
    // day" - it just means the doctor hasn't given hours for this date.
    if (!(override.start && override.end)) return true;
    hours = override;
  } else {
    if (availability.isUnavailable) return true;
    hours = availability[weekdayKey(parsed)];
    if (!(hours && hours.start && hours.end)) return true;
  }

  const time = clockTime(parsed);
  return time < hours.start || time >= hours.end;
}

// Assigns the doctor in the given department with the fewest currently
// active appointments (lowest workload). Doctors are matched to a
// department by name, since User.department is stored as free text.
// `date` defaults to now (used for walk-ins) but should be the requested
// timeSlot for booked appointments, so date-specific overrides apply.
async function assignDoctor(departmentId, date = new Date()) {
  const department = await Department.findById(departmentId);
  if (!department) {
    const err = new Error('Department not found.');
    err.status = 404;
    throw err;
  }

  const candidates = await User.find({ role: 'doctor', department: department.name });
  const doctors = candidates.filter((doctor) => !isDoctorUnavailableOn(doctor, date));
  if (doctors.length === 0) {
    const err = new Error('No doctors are currently available in this department.');
    err.status = 409;
    throw err;
  }

  const workloads = await Promise.all(
    doctors.map((doctor) =>
      Appointment.countDocuments({ doctor: doctor._id, status: { $in: ACTIVE_STATUSES } }),
    ),
  );

  let chosenDoctor = doctors[0];
  let lowestWorkload = workloads[0];
  for (let i = 1; i < doctors.length; i += 1) {
    if (workloads[i] < lowestWorkload) {
      lowestWorkload = workloads[i];
      chosenDoctor = doctors[i];
    }
  }

  return chosenDoctor;
}

// Guards against double-booking a doctor at the exact same time. Cancelled/
// completed/no-show appointments don't count, so cancelling (or the slot
// simply not being reserved) always frees that doctor's time back up for
// someone else to book. `excludeAppointmentId` lets a reschedule check
// availability without conflicting with the appointment being moved.
async function ensureDoctorSlotAvailable(doctorId, timeSlot, excludeAppointmentId = null) {
  const conflict = await Appointment.findOne({
    doctor: doctorId,
    timeSlot,
    status: { $in: ACTIVE_STATUSES },
    ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
  });

  if (conflict) {
    const err = new Error(
      'This doctor already has an appointment at that time. Please choose another slot.',
    );
    err.status = 409;
    throw err;
  }
}

module.exports = {
  assignDoctor,
  ensureDoctorSlotAvailable,
  isDoctorUnavailableOn,
  ACTIVE_STATUSES,
};
