require('dotenv').config();
const http = require('http');
const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/config/socket');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGODB_URI);
  console.log('[db] connected to MongoDB');

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer, process.env.CLIENT_ORIGIN);

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
