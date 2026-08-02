require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');
const { validatePasswordStrength } = require('../src/utils/passwordPolicy');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(query) {
  return new Promise((resolve) => {
    const { stdin } = process;
    process.stdout.write(query);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input);
          break;
        case '':
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '':
        case '\b':
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          input += char;
          process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

async function run() {
  const name = await ask('Admin name: ');
  const emailInput = await ask('Admin email: ');
  const email = emailInput.toLowerCase();

  if (!name || name.length < 2) {
    console.error('[add:admin] Name must be at least 2 characters.');
    process.exitCode = 1;
    return;
  }

  if (!EMAIL_RE.test(email)) {
    console.error('[add:admin] Email is not a valid email address.');
    process.exitCode = 1;
    return;
  }

  const password = await askHidden('Admin password: ');
  const confirmPassword = await askHidden('Confirm password: ');

  if (password !== confirmPassword) {
    console.error('[add:admin] Passwords do not match.');
    process.exitCode = 1;
    return;
  }

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    console.error(`[add:admin] Password is too weak: ${strengthError}`);
    process.exitCode = 1;
    return;
  }

  await connectDB(process.env.MONGODB_URI);

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.error('[add:admin] That email is already registered to another account. Aborting.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(password);
    const admin = await User.create({
      name,
      email,
      passwordHash,
      provider: 'local',
      role: 'admin',
    });

    console.log(`[add:admin] Admin account created: ${admin.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[add:admin] Failed:', err);
  process.exitCode = 1;
});
