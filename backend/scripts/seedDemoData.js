require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const Token = require('../src/models/Token');
const { hashPassword } = require('../src/utils/password');

// Fixed demo credentials — printed at the end. Every seeded account uses
// one of these two passwords so they're easy to log in with by hand.
const PATIENT_PASSWORD = 'SeedPatient#2026';
const DOCTOR_PASSWORD = 'SeedDoctor#2026';
const ADMIN_PASSWORD = 'SeedAdmin#2026';

// +44 7700 900xxx is Ofcom's reserved "drama/fiction" range: it passes
// libphonenumber's GB validity check like a real mobile number but can
// never belong to an actual subscriber, so it's safe to reuse in seed data.
function ukPhone(n) {
  return `+447700900${String(n).padStart(3, '0')}`;
}

const DEPARTMENTS = [
  { name: 'General Medicine', description: 'Everyday illnesses, check-ups and referrals.' },
  { name: 'Cardiology', description: 'Heart and cardiovascular conditions.' },
  { name: 'Orthopedics', description: 'Bones, joints, and musculoskeletal injuries.' },
  { name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents.' },
];

// Two doctors per department. One (Ben Carter) is left unavailable so
// resourceAllocation.assignDoctor has something to skip over.
const DOCTORS = [
  { name: 'Dr. Alice Whitfield', department: 'General Medicine', specialization: 'General Practice', unavailable: false },
  { name: 'Dr. Ben Carter', department: 'General Medicine', specialization: 'General Practice', unavailable: true },
  { name: 'Dr. Priya Shah', department: 'Cardiology', specialization: 'Cardiology', unavailable: false },
  { name: 'Dr. Michael O’Brien', department: 'Cardiology', specialization: 'Interventional Cardiology', unavailable: false },
  { name: 'Dr. Grace Adeyemi', department: 'Orthopedics', specialization: 'Orthopedic Surgery', unavailable: false },
  { name: 'Dr. Tom Baxter', department: 'Orthopedics', specialization: 'Sports Medicine', unavailable: false },
  { name: 'Dr. Sarah Lin', department: 'Pediatrics', specialization: 'Pediatrics', unavailable: false },
  { name: 'Dr. James Whitmore', department: 'Pediatrics', specialization: 'Pediatric Cardiology', unavailable: false },
];

const PATIENT_NAMES = [
  'Oliver Smith', 'Amelia Jones', 'George Taylor', 'Isla Williams', 'Harry Brown',
  'Ava Davies', 'Jack Evans', 'Mia Wilson', 'Noah Thomas', 'Freya Roberts',
  'Leo Johnson', 'Grace Walker', 'Arthur White', 'Sophie Hall', 'Charlie Green',
  'Ruby Wood', 'Oscar Clarke', 'Lily Baker',
];

const CATEGORY_WEIGHTS = [
  'regular', 'regular', 'regular', 'regular', 'regular',
  'elderly', 'elderly', 'disabled', 'critical', 'emergency',
];

const WORKING_HOURS = { start: '09:00', end: '17:00' };
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function dayOffset(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

async function upsertDepartments() {
  const departments = [];
  for (const dept of DEPARTMENTS) {
    let doc = await Department.findOne({ name: dept.name });
    if (!doc) {
      doc = await Department.create(dept);
      console.log(`[seed:demo] Created department: ${doc.name}`);
    }
    departments.push(doc);
  }
  return departments;
}

async function upsertDoctors() {
  const passwordHash = await hashPassword(DOCTOR_PASSWORD);
  const doctors = [];
  let i = 0;
  for (const spec of DOCTORS) {
    i += 1;
    const email = `${spec.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@seed.hospital-demo.test`;
    let doc = await User.findOne({ email });
    const availability = {
      isUnavailable: spec.unavailable,
      ...Object.fromEntries(WEEKDAYS.map((day) => [day, WORKING_HOURS])),
    };
    if (!doc) {
      doc = await User.create({
        name: spec.name,
        email,
        phone: ukPhone(100 + i),
        passwordHash,
        provider: 'local',
        role: 'doctor',
        specialization: spec.specialization,
        department: spec.department,
        availability,
      });
      console.log(`[seed:demo] Created doctor: ${doc.name} (${doc.department})`);
    } else {
      doc.availability = availability;
      doc.department = spec.department;
      doc.specialization = spec.specialization;
      await doc.save();
    }
    doctors.push(doc);
  }
  return doctors;
}

async function upsertPatients() {
  const passwordHash = await hashPassword(PATIENT_PASSWORD);
  const patients = [];
  let i = 0;
  for (const name of PATIENT_NAMES) {
    i += 1;
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@seed.hospital-demo.test`;
    let doc = await User.findOne({ email });
    if (!doc) {
      doc = await User.create({
        name,
        email,
        phone: ukPhone(i),
        passwordHash,
        provider: 'local',
        role: 'patient',
      });
      console.log(`[seed:demo] Created patient: ${doc.name}`);
    }
    patients.push(doc);
  }
  return patients;
}

async function upsertAdmin() {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log(`[seed:demo] Admin already exists (${existingAdmin.email}), skipping.`);
    return existingAdmin;
  }
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const admin = await User.create({
    name: 'Demo Admin',
    email: 'admin@seed.hospital-demo.test',
    phone: ukPhone(999),
    passwordHash,
    provider: 'local',
    role: 'admin',
  });
  console.log(`[seed:demo] Created admin: ${admin.email}`);
  return admin;
}

// Builds historical (completed/no-show/cancelled) and upcoming (booked)
// appointments + matching Token records, entirely at the DB level.
//
// Deliberately does NOT create any 'in-queue' / 'in-consultation'
// appointments: those only make sense alongside the live in-memory
// scheduler (see scheduling-engine/schedulerManager.js), which a one-off
// script can't reach into. Use `npm run seed:live-queue` against a running
// server to populate real, currently-waiting queues for testing FCFS /
// priority / round-robin / multi-level-queue behaviour end to end.
async function seedAppointments(departments, doctors, patients) {
  const doctorsByDept = new Map();
  for (const doc of doctors) {
    if (!doctorsByDept.has(doc.department)) doctorsByDept.set(doc.department, []);
    doctorsByDept.get(doc.department).push(doc);
  }

  const tokenCounters = new Map(); // `${deptId}|${dateKey}` -> next token number
  function nextTokenNumber(deptId, date) {
    const key = `${deptId}|${dateKey(date)}`;
    const n = (tokenCounters.get(key) || 0) + 1;
    tokenCounters.set(key, n);
    return n;
  }

  let patientCursor = 0;
  let categoryCursor = 0;
  function nextPatient() {
    const p = patients[patientCursor % patients.length];
    patientCursor += 1;
    return p;
  }
  function nextCategory() {
    const c = CATEGORY_WEIGHTS[categoryCursor % CATEGORY_WEIGHTS.length];
    categoryCursor += 1;
    return c;
  }

  const appointmentDocs = [];
  const tokenDocs = [];

  function addCompleted(department, doctor, date, extraMinutesAgo) {
    const category = nextCategory();
    const type = Math.random() < 0.5 ? 'walk-in' : 'booked';
    const patient = nextPatient();
    const appointmentId = new mongoose.Types.ObjectId();

    const issuedAt = new Date(date.getTime() - extraMinutesAgo * 60000);
    const consultLength = 5 + Math.round(Math.random() * 20); // 5-25 min
    const calledAt = new Date(issuedAt.getTime() + 5 * 60000);
    const completedAt = new Date(calledAt.getTime() + consultLength * 60000);

    appointmentDocs.push({
      _id: appointmentId,
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category,
      type,
      timeSlot: type === 'booked' ? issuedAt : undefined,
      status: 'completed',
      createdAt: issuedAt,
    });
    tokenDocs.push({
      appointment: appointmentId,
      department: department._id,
      tokenNumber: nextTokenNumber(department._id, issuedAt),
      issuedAt,
      calledAt,
      completedAt,
      status: 'completed',
    });
  }

  function addNoShow(department, doctor, date) {
    const category = nextCategory();
    const type = Math.random() < 0.5 ? 'walk-in' : 'booked';
    const patient = nextPatient();
    const appointmentId = new mongoose.Types.ObjectId();
    const issuedAt = new Date(date.getTime() - 30 * 60000);

    appointmentDocs.push({
      _id: appointmentId,
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category,
      type,
      timeSlot: type === 'booked' ? issuedAt : undefined,
      status: 'no-show',
      createdAt: issuedAt,
    });
    tokenDocs.push({
      appointment: appointmentId,
      department: department._id,
      tokenNumber: nextTokenNumber(department._id, issuedAt),
      issuedAt,
      calledAt: null,
      completedAt: null,
      status: 'no-show',
    });
  }

  function addCancelled(department, doctor, futureDate) {
    const category = nextCategory();
    const patient = nextPatient();
    appointmentDocs.push({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category,
      type: 'booked',
      timeSlot: futureDate,
      status: 'cancelled',
    });
  }

  function addUpcomingBooked(department, doctor, futureDate) {
    const category = nextCategory();
    const patient = nextPatient();
    appointmentDocs.push({
      patient: patient._id,
      doctor: doctor._id,
      department: department._id,
      category,
      type: 'booked',
      timeSlot: futureDate,
      status: 'booked',
    });
  }

  const now = new Date();

  for (const department of departments) {
    const deptDoctors = doctorsByDept.get(department.name) || [];
    if (deptDoctors.length === 0) continue;

    // Completed history: past 5 days, 2 per day, plus 3 completed today
    // so averageConsultationMinutesToday has real data to average.
    for (let daysAgo = 5; daysAgo >= 1; daysAgo -= 1) {
      const day = dayOffset(now, -daysAgo);
      for (let i = 0; i < 2; i += 1) {
        const doctor = deptDoctors[i % deptDoctors.length];
        addCompleted(department, doctor, day, 60 + i * 20);
      }
    }
    for (let i = 0; i < 3; i += 1) {
      const doctor = deptDoctors[i % deptDoctors.length];
      addCompleted(department, doctor, now, 90 + i * 15);
    }

    // A couple of no-shows in the last few days.
    addNoShow(department, deptDoctors[0], dayOffset(now, -2));
    addNoShow(department, deptDoctors[deptDoctors.length - 1], dayOffset(now, -1));

    // A cancelled booking or two.
    addCancelled(department, deptDoctors[0], dayOffset(now, 3));
    addCancelled(department, deptDoctors[0], dayOffset(now, 5));

    // Upcoming booked appointments patients can check in themselves.
    for (let i = 1; i <= 3; i += 1) {
      const doctor = deptDoctors[i % deptDoctors.length];
      addUpcomingBooked(department, doctor, dayOffset(now, i));
    }
  }

  if (appointmentDocs.length > 0) {
    await Appointment.insertMany(appointmentDocs);
  }
  if (tokenDocs.length > 0) {
    await Token.insertMany(tokenDocs);
  }

  return { appointments: appointmentDocs.length, tokens: tokenDocs.length };
}

async function run() {
  const { MONGODB_URI } = process.env;
  await connectDB(MONGODB_URI);
  console.log('[seed:demo] Connected to MongoDB');

  try {
    const alreadySeeded = !process.env.SEED_FORCE && (await Appointment.exists({}));
    const departments = await upsertDepartments();
    const doctors = await upsertDoctors();
    const patients = await upsertPatients();
    await upsertAdmin();

    let counts = { appointments: 0, tokens: 0 };
    if (alreadySeeded) {
      console.log(
        '[seed:demo] Appointments already exist in this database — skipping appointment/token seeding to avoid duplicates. Re-run with SEED_FORCE=1 to add another batch anyway.',
      );
    } else {
      counts = await seedAppointments(departments, doctors, patients);
    }

    console.log('\n[seed:demo] Done.');
    console.log(`  Departments: ${departments.length}`);
    console.log(`  Doctors:     ${doctors.length}`);
    console.log(`  Patients:    ${patients.length}`);
    console.log(`  Appointments created: ${counts.appointments}`);
    console.log(`  Tokens created:       ${counts.tokens}`);
    console.log('\n[seed:demo] Demo logins (all @seed.hospital-demo.test):');
    console.log(`  Admin:    admin@seed.hospital-demo.test / ${ADMIN_PASSWORD}`);
    console.log(`  Doctor:   alice.whitfield@seed.hospital-demo.test / ${DOCTOR_PASSWORD}`);
    console.log(`  Patient:  oliver.smith@seed.hospital-demo.test / ${PATIENT_PASSWORD}`);
    console.log(
      '  (every seeded doctor shares the doctor password, every patient shares the patient password)',
    );
    console.log(
      '\n[seed:demo] No live queue was populated (the multi-level scheduler is in-memory only).',
    );
    console.log('  Run `npm run seed:live-queue` against a running server to do that.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('[seed:demo] Failed:', err);
  process.exitCode = 1;
});
