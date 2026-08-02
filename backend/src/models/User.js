const mongoose = require('mongoose');

// One start/end pair per weekday; both blank means "no hours set for this day".
const workingHoursSchema = new mongoose.Schema(
  {
    start: { type: String, trim: true, default: '' },
    end: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

// Doctor-only. Kept deliberately simple: a working-hours pair per weekday,
// plus a single override toggle for "unavailable today/right now" that
// Smart Resource Allocation checks before assigning new patients.
const availabilitySchema = new mongoose.Schema(
  {
    monday: workingHoursSchema,
    tuesday: workingHoursSchema,
    wednesday: workingHoursSchema,
    thursday: workingHoursSchema,
    friday: workingHoursSchema,
    saturday: workingHoursSchema,
    sunday: workingHoursSchema,
    isUnavailable: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    passwordHash: {
      type: String,
      required: function passwordRequired() {
        return this.provider === 'local';
      },
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    specialization: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    availability: {
      type: availabilitySchema,
      default: () => ({}),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('User', userSchema);
