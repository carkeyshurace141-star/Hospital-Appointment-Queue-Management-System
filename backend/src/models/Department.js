const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { collection: 'departments', timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('Department', departmentSchema);
