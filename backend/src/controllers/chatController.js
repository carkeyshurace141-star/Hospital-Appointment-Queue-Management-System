const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorHandler');
const { isChatOpen, chatClosesAt } = require('../utils/chatEligibility');

function toPublicMessage(message) {
  return {
    id: message._id,
    appointmentId: message.appointment,
    sender: message.sender,
    recipient: message.recipient,
    body: message.body,
    createdAt: message.createdAt,
    readAt: message.readAt,
  };
}

// Loads the appointment and confirms req.user is the patient or the doctor
// on it - the only two people ever allowed to see or send in this thread.
async function loadParticipantAppointment(req) {
  const appointment = await Appointment.findById(req.params.appointmentId);
  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.status = 404;
    throw err;
  }

  const userId = req.user._id.toString();
  const isPatient = appointment.patient?.toString() === userId;
  const isDoctor = appointment.doctor?.toString() === userId;
  if (!isPatient && !isDoctor) {
    const err = new Error('You do not have permission to do that.');
    err.status = 403;
    throw err;
  }

  return { appointment, isPatient };
}

const getMessages = asyncHandler(async (req, res) => {
  const { appointment } = await loadParticipantAppointment(req);
  res.locals.auditTargetId = appointment._id.toString();

  const messages = await Message.find({ appointment: appointment._id }).sort({ createdAt: 1 });

  const unreadIds = messages
    .filter((m) => m.recipient.toString() === req.user._id.toString() && !m.readAt)
    .map((m) => m._id);

  if (unreadIds.length > 0) {
    const readAt = new Date();
    await Message.updateMany({ _id: { $in: unreadIds } }, { $set: { readAt } });
    unreadIds.forEach((id) => {
      const message = messages.find((m) => m._id.equals(id));
      if (message) message.readAt = readAt;
    });

    req.app.locals.io?.to(`appointment:${appointment._id}`).emit('chat:read', {
      appointmentId: appointment._id.toString(),
      readBy: req.user._id.toString(),
      readAt: readAt.toISOString(),
    });
  }

  res.status(200).json({
    messages: messages.map(toPublicMessage),
    chatOpen: isChatOpen(appointment),
    chatClosesAt: chatClosesAt(appointment),
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { appointment, isPatient } = await loadParticipantAppointment(req);
  res.locals.auditTargetId = appointment._id.toString();

  if (!isChatOpen(appointment)) {
    return res.status(403).json({ message: 'This conversation is closed.' });
  }

  const recipientId = isPatient ? appointment.doctor : appointment.patient;

  const message = await Message.create({
    appointment: appointment._id,
    sender: req.user._id,
    recipient: recipientId,
    body: req.body.body,
  });

  const publicMessage = toPublicMessage(message);

  const io = req.app.locals.io;
  io?.to(`appointment:${appointment._id}`).emit('chat:message', publicMessage);
  io?.to(`user:${recipientId}`).emit('chat:notification', {
    appointmentId: appointment._id.toString(),
    message: publicMessage,
  });

  res.status(201).json({ message: publicMessage });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unread = await Message.find({ recipient: req.user._id, readAt: null }).select(
    'appointment',
  );

  const byAppointmentMap = new Map();
  unread.forEach(({ appointment }) => {
    const key = appointment.toString();
    byAppointmentMap.set(key, (byAppointmentMap.get(key) || 0) + 1);
  });

  res.status(200).json({
    total: unread.length,
    byAppointment: Array.from(byAppointmentMap, ([appointmentId, count]) => ({
      appointmentId,
      count,
    })),
  });
});

module.exports = { getMessages, sendMessage, getUnreadCount };
