const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    category: {
      type: String,
      enum: ['emergency', 'critical', 'elderly', 'disabled', 'regular'],
      required: true,
    },
    type: {
      type: String,
      enum: ['booked', 'walk-in'],
      required: true,
    },
    timeSlot: {
      type: Date,
      required: function timeSlotRequired() {
        return this.type === 'booked';
      },
    },
    status: {
      type: String,
      enum: [
        'booked',
        'checked-in',
        'in-queue',
        'in-consultation',
        'completed',
        'no-show',
        'cancelled',
      ],
      default: 'booked',
    },
    // Set once the 2-hours-before reminder email has gone out, so the
    // periodic sweep (appointmentReminderJob.js) never sends it twice.
    reminderSentAt: {
      type: Date,
      default: null,
    },
  },
  { collection: 'appointments', timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('Appointment', appointmentSchema);
