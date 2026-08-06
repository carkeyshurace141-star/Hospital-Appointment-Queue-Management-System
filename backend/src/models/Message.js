const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { collection: 'messages', timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ appointment: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, readAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
