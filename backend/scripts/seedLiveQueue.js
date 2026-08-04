// Populates the *live*, in-memory multi-level-queue scheduler
// (scheduling-engine/schedulerManager.js) by driving the real HTTP API,
// exactly the way a patient's browser would. This is intentionally separate
// from `seed:demo` (which only writes historical/DB data): the scheduler
// lives in server memory, so the only way to get patients into a currently
// running server's queue is to actually call its endpoints.
//
// Requires the backend to be running (`npm run dev` / `npm start`) and
// `npm run seed:demo` to have been run at least once against the same
// database, since it logs in as the patients that script created.
//
// Usage: npm run seed:live-queue
// Optional: SEED_BASE_URL=http://localhost:5000/api npm run seed:live-queue

const BASE_URL = process.env.SEED_BASE_URL || 'http://localhost:5000/api';
const PATIENT_PASSWORD = 'SeedPatient#2026';

// [patient email local-part, category, type] per department, chosen to
// exercise every tier of the multi-level queue: emergency/critical jump
// the line, elderly/disabled come next, booked and walk-in alternate.
const PLAN = {
  'General Medicine': [
    ['oliver.smith', 'regular', 'walk-in'],
    ['amelia.jones', 'regular', 'booked'],
    ['george.taylor', 'elderly', 'walk-in'],
    ['isla.williams', 'critical', 'booked'],
    ['harry.brown', 'emergency', 'walk-in'],
  ],
  Cardiology: [
    ['ava.davies', 'regular', 'walk-in'],
    ['jack.evans', 'disabled', 'booked'],
    ['mia.wilson', 'regular', 'walk-in'],
    ['noah.thomas', 'elderly', 'booked'],
    ['freya.roberts', 'critical', 'walk-in'],
  ],
  Orthopedics: [
    ['leo.johnson', 'regular', 'walk-in'],
    ['grace.walker', 'regular', 'booked'],
    ['arthur.white', 'elderly', 'walk-in'],
    ['sophie.hall', 'emergency', 'booked'],
  ],
  Pediatrics: [
    ['charlie.green', 'regular', 'walk-in'],
    ['ruby.wood', 'regular', 'booked'],
    ['oscar.clarke', 'disabled', 'walk-in'],
    ['lily.baker', 'critical', 'booked'],
  ],
};

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${body.message || 'error'}`);
  }
  return body;
}

async function login(email) {
  const { token } = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: PATIENT_PASSWORD }),
  });
  return token;
}

async function run() {
  console.log(`[seed:live-queue] Talking to ${BASE_URL}`);

  // Optional: SEED_DEPARTMENTS="Orthopedics,Pediatrics" to (re)run only a
  // subset - handy for picking up where a run left off after hitting the
  // login rate limiter (10 attempts / 15 min per IP, see authRoutes.js).
  const onlyDepartments = process.env.SEED_DEPARTMENTS
    ? new Set(process.env.SEED_DEPARTMENTS.split(',').map((s) => s.trim()))
    : null;

  const { departments } = await api('/departments');
  const departmentByName = new Map(departments.map((d) => [d.name, d]));

  let enqueued = 0;
  let failed = 0;

  for (const [deptName, entries] of Object.entries(PLAN)) {
    if (onlyDepartments && !onlyDepartments.has(deptName)) continue;
    const department = departmentByName.get(deptName);
    if (!department) {
      console.warn(`[seed:live-queue] Department "${deptName}" not found - run npm run seed:demo first. Skipping.`);
      continue;
    }

    for (const [localPart, category, type] of entries) {
      const email = `${localPart}@seed.hospital-demo.test`;
      try {
        const token = await login(email);
        const auth = { Authorization: `Bearer ${token}` };

        if (type === 'walk-in') {
          const { token: tokenNumber } = await api('/appointments/walk-in', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ department: department.id, category }),
          });
          console.log(`[seed:live-queue] ${deptName}: ${email} walked in as ${category} (token #${tokenNumber})`);
        } else {
          const timeSlot = new Date(Date.now() + 60 * 60000).toISOString();
          const { appointment } = await api('/appointments', {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ department: department.id, category, timeSlot }),
          });
          const { token: tokenNumber } = await api(`/appointments/${appointment.id}/checkin`, {
            method: 'POST',
            headers: auth,
          });
          console.log(`[seed:live-queue] ${deptName}: ${email} booked+checked in as ${category} (token #${tokenNumber})`);
        }
        enqueued += 1;
      } catch (err) {
        failed += 1;
        console.error(`[seed:live-queue] Failed to enqueue ${email} in ${deptName}: ${err.message}`);
      }
    }
  }

  console.log(`\n[seed:live-queue] Done. Enqueued ${enqueued}, failed ${failed}.`);
  console.log('[seed:live-queue] Log in as a seeded doctor (see seed:demo output) and open the');
  console.log('  Clinician Dashboard to watch Call Next / Skip / Recall work the queue you just built.');
}

run().catch((err) => {
  console.error('[seed:live-queue] Failed:', err);
  process.exitCode = 1;
});
