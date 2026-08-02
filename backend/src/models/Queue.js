const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    algorithm: {
      type: String,
      enum: ['fcfs', 'priority', 'round-robin', 'multi-level-queue'],
      default: 'multi-level-queue',
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
  },
  { collection: 'queues', timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('Queue', queueSchema);
