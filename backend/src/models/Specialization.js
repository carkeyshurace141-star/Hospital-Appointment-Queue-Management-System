const mongoose = require('mongoose');

const specializationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { collection: 'specializations', timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('Specialization', specializationSchema);
