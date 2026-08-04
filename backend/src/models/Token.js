const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    tokenNumber: {
      type: Number,
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'completed', 'no-show', 'cancelled'],
      default: 'waiting',
    },
  },
  { collection: 'tokens' },
);

module.exports = mongoose.model('Token', tokenSchema);
