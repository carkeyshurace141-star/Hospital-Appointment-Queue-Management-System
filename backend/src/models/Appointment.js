const mongoose = require('mongoose');

// Scaffolded for a later week — fields to be added when booking/scheduling is built.
const appointmentSchema = new mongoose.Schema({}, { collection: 'appointments' });

module.exports = mongoose.model('Appointment', appointmentSchema);
