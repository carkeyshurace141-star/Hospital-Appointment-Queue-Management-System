require('dotenv').config();
const http = require('http');
const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/config/socket');
const { hydrateFromDatabase } = require('./scheduling-engine/schedulerManager');
const { startAppointmentReminderJob } = require('./src/jobs/appointmentReminderJob');
const { ensureDefaultSpecializations } = require('./src/utils/seedDefaults');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB(process.env.MONGODB_URI);
  console.log('[db] connected to MongoDB');

  const { restored } = await hydrateFromDatabase();
  console.log(`[scheduler] restored ${restored} queued patient(s) from the database`);

  const { created } = await ensureDefaultSpecializations();
  console.log(`[seed] created ${created} default specialization(s)`);

  const app = createApp();
  const httpServer = http.createServer(app);

  app.locals.io = initSocket(httpServer, process.env.CLIENT_ORIGIN);
  startAppointmentReminderJob();

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
