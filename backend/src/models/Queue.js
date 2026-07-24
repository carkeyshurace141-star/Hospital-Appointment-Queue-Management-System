const mongoose = require('mongoose');

// Scaffolded for a later week — fields to be added when live queue management is built.
const queueSchema = new mongoose.Schema({}, { collection: 'queues' });

module.exports = mongoose.model('Queue', queueSchema);
