const { Server } = require('socket.io');

const PING_INTERVAL_MS = 10000;

function initSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id} (${io.engine.clientsCount} total)`);

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
