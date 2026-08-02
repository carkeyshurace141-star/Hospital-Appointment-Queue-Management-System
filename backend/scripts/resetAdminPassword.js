require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');
const { validatePasswordStrength } = require('../src/utils/passwordPolicy');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function run() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('[reset:admin] Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env first.');
    process.exitCode = 1;
    return;
  }

  if (!EMAIL_RE.test(ADMIN_EMAIL)) {
    console.error('[reset:admin] ADMIN_EMAIL is not a valid email address.');
    process.exitCode = 1;
    return;
  }

  const strengthError = validatePasswordStrength(ADMIN_PASSWORD);
  if (strengthError) {
    console.error(`[reset:admin] ADMIN_PASSWORD is too weak: ${strengthError}`);
    process.exitCode = 1;
    return;
  }

  await connectDB(MONGODB_URI);

  try {
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('[reset:admin] No admin account exists yet. Run npm run seed:admin instead.');
      process.exitCode = 1;
      return;
    }

    const targetEmail = ADMIN_EMAIL.toLowerCase();
    const emailTaken = await User.findOne({ email: targetEmail, _id: { $ne: admin._id } });
    if (emailTaken) {
      console.error('[reset:admin] That email is already registered to another account. Aborting.');
      process.exitCode = 1;
      return;
    }

    admin.email = targetEmail;
    admin.passwordHash = await hashPassword(ADMIN_PASSWORD);
    admin.provider = 'local';
    await admin.save();

    console.log(`[reset:admin] Admin credentials reset: ${admin.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[reset:admin] Failed:', err);
  process.exitCode = 1;
});
