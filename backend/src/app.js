const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(mongoSanitize());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
