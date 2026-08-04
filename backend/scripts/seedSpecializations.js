require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { ensureDefaultSpecializations } = require('../src/utils/seedDefaults');

// Manual/CI entry point for the same defaults the server seeds
// automatically on every boot (see ensureDefaultSpecializations in
// server.js) - useful for scripting a deploy without starting the server.
async function run() {
  const { MONGODB_URI } = process.env;
  await connectDB(MONGODB_URI);

  try {
    const { created } = await ensureDefaultSpecializations();
    console.log(`[seed:specializations] Created ${created} new specialization(s).`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[seed:specializations] Failed:', err);
  process.exitCode = 1;
});
