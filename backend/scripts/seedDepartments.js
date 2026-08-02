require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Department = require('../src/models/Department');

const DEPARTMENTS = [
  { name: 'General Medicine', description: 'Everyday illnesses, check-ups and referrals.' },
  { name: 'Cardiology', description: 'Heart and cardiovascular conditions.' },
  { name: 'Orthopedics', description: 'Bones, joints, and musculoskeletal injuries.' },
  { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents.' },
];

async function run() {
  const { MONGODB_URI } = process.env;
  await connectDB(MONGODB_URI);

  try {
    for (const dept of DEPARTMENTS) {
      const existing = await Department.findOne({ name: dept.name });
      if (existing) {
        console.log(`[seed:departments] Skipping existing department: ${dept.name}`);
        continue;
      }
      const created = await Department.create(dept);
      console.log(`[seed:departments] Created department: ${created.name}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[seed:departments] Failed:', err);
  process.exitCode = 1;
});
