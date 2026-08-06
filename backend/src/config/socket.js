const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

const PING_INTERVAL_MS = 10000;

// Optional auth: if the client connects with `auth: { token }` (as the chat
// UI does), verify it the same way middleware/auth.js does and attach
// socket.user. Connections without a token are left anonymous rather than
// rejected, so the existing unauthenticated consumers (DevSocketListener,
// the queue:updated/appointment:called listeners) keep working unchanged -
// only chat handlers require socket.user.
async function attachUser(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name role');
    if (user) socket.user = user;
  } catch (_err) {
    // Invalid/expired token: treat as anonymous rather than failing the
    // connection outright.
  }
  next();
}

async function isAppointmentParticipant(appointmentId, userId) {
  const appointment = await Appointment.findById(appointmentId).select('patient doctor');
  if (!appointment) return false;
  return (
    appointment.patient?.toString() === userId.toString() ||
    appointment.doctor?.toString() === userId.toString()
  );
}

function initSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.use(attachUser);

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id} (${io.engine.clientsCount} total)`);

    // Personal room for cross-appointment notifications (unread badges)
    // that don't require having joined that specific appointment's room.
    if (socket.user) socket.join(`user:${socket.user._id}`);

    socket.on('chat:join', async ({ appointmentId } = {}, ack) => {
      if (!socket.user) return ack?.({ ok: false, error: 'Authentication required.' });
      if (!appointmentId) return ack?.({ ok: false, error: 'appointmentId is required.' });

      const allowed = await isAppointmentParticipant(appointmentId, socket.user._id);
      if (!allowed) return ack?.({ ok: false, error: 'Not authorized for this appointment.' });

      socket.join(`appointment:${appointmentId}`);
      ack?.({ ok: true });
    });

    socket.on('chat:leave', ({ appointmentId } = {}) => {
      if (appointmentId) socket.leave(`appointment:${appointmentId}`);
    });

    socket.on('chat:typing', ({ appointmentId, isTyping } = {}) => {
      if (!socket.user || !appointmentId) return;
      socket.to(`appointment:${appointmentId}`).emit('chat:typing', {
        appointmentId,
        userId: socket.user._id.toString(),
        isTyping: Boolean(isTyping),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id} (${io.engine.clientsCount} total)`);
    });
  });

  setInterval(() => {
    io.emit('server:ping', { timestamp: new Date().toISOString() });
  }, PING_INTERVAL_MS);

  return io;
}

module.exports = initSocket;
