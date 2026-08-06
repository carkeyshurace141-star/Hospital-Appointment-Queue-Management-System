const mongoose = require('mongoose');

// One start/end pair per weekday; both blank means "no hours set for this day".
const workingHoursSchema = new mongoose.Schema(
  {
    start: { type: String, trim: true, default: '' },
    end: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

// One-off exception for a single calendar date (format 'YYYY-MM-DD'), e.g. a
// doctor who only works one specific day, or who is off on a date that
// wouldn't otherwise be blocked by their weekly pattern. Takes precedence
// over the matching weekday's hours - see isDoctorUnavailableOn.
const dateOverrideSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    start: { type: String, trim: true, default: '' },
    end: { type: String, trim: true, default: '' },
    isUnavailable: { type: Boolean, default: false },
  },
  { _id: false },
);

// Doctor-only. Kept deliberately simple: a working-hours pair per weekday,
// plus a single override toggle for "unavailable today/right now" that
// Smart Resource Allocation checks before assigning new patients, plus a
// list of specific-date exceptions for doctors whose availability doesn't
// follow a recurring weekly pattern.
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
    dateOverrides: { type: [dateOverrideSchema], default: [] },
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
    // Only the hash of the reset token is ever stored (see
    // utils/password.js hashResetToken) - mirrors why passwordHash isn't a
    // plaintext password. select: false keeps both out of normal queries
    // and toPublicUser(); authController.resetPassword requests them
    // explicitly.
    resetPasswordTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
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
