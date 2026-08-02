require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');
const { validatePasswordStrength } = require('../src/utils/passwordPolicy');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function run() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      '[seed:admin] Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in your .env first.',
    );
    process.exitCode = 1;
    return;
  }

  if (!EMAIL_RE.test(ADMIN_EMAIL)) {
    console.error('[seed:admin] ADMIN_EMAIL is not a valid email address.');
    process.exitCode = 1;
    return;
  }

  const strengthError = validatePasswordStrength(ADMIN_PASSWORD);
  if (strengthError) {
    console.error(`[seed:admin] ADMIN_PASSWORD is too weak: ${strengthError}`);
    process.exitCode = 1;
    return;
  }

  await connectDB(MONGODB_URI);

  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.error(
        `[seed:admin] An admin account already exists (${existingAdmin.email}). Aborting.`,
      );
      process.exitCode = 1;
      return;
    }

    const existingEmail = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existingEmail) {
      console.error('[seed:admin] That email is already registered to another account. Aborting.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      provider: 'local',
      role: 'admin',
    });

    console.log(`[seed:admin] Admin account created: ${admin.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[seed:admin] Failed:', err);
  process.exitCode = 1;
});
