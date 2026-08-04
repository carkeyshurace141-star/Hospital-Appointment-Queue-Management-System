const Specialization = require('../models/Specialization');

// Baseline specializations shown in the Add Doctor dropdown even on a
// brand-new database. ensureDefaultSpecializations() runs on every server
// boot (see server.js), so these exist whether or not anyone has ever run
// `npm run seed:specializations` by hand.
const DEFAULT_SPECIALIZATIONS = [
  'General Practice',
  'MD',
  'MS',
  'Physician',
  'General Physician',
  'Surgeon',
  'Specialized Surgeon',
  'Cardiology',
  'Interventional Cardiology',
  'Orthopedic Surgery',
  'Sports Medicine',
  'Pediatrics',
  'Pediatric Cardiology',
  'Gynecologist',
  'ENT Specialist',
  'Dermatologist',
  'Psychiatrist',
  'Neurologist',
  'Radiologist',
  'Anesthesiologist',
  'Urologist',
  'Ophthalmologist',
  'Dentist',
  'Gastroenterologist',
  'Nephrologist',
  'Endocrinologist',
  'Pulmonologist',
];

// Only inserts whatever's missing, so admin-added specializations (and any
// admin who has since renamed/removed a default) are never touched.
async function ensureDefaultSpecializations() {
  const existing = await Specialization.find({}, 'name').lean();
  const existingNames = new Set(existing.map((s) => s.name));
  const missing = DEFAULT_SPECIALIZATIONS.filter((name) => !existingNames.has(name));

  if (missing.length > 0) {
    await Specialization.insertMany(missing.map((name) => ({ name })));
  }

  return { created: missing.length };
}

module.exports = { DEFAULT_SPECIALIZATIONS, ensureDefaultSpecializations };
