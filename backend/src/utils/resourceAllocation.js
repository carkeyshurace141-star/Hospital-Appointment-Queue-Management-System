const User = require('../models/User');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');

const ACTIVE_STATUSES = ['booked', 'checked-in', 'in-queue', 'in-consultation'];

// Assigns the doctor in the given department with the fewest currently
// active appointments (lowest workload). Doctors are matched to a
// department by name, since User.department is stored as free text.
async function assignDoctor(departmentId) {
  const department = await Department.findById(departmentId);
  if (!department) {
    const err = new Error('Department not found.');
    err.status = 404;
    throw err;
  }

  const doctors = await User.find({
    role: 'doctor',
    department: department.name,
    'availability.isUnavailable': { $ne: true },
  });
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

module.exports = { assignDoctor, ensureDoctorSlotAvailable, ACTIVE_STATUSES };
