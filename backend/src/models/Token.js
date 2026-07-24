const mongoose = require('mongoose');

// Scaffolded for a later week — fields to be added for refresh/reset tokens.
const tokenSchema = new mongoose.Schema({}, { collection: 'tokens' });

module.exports = mongoose.model('Token', tokenSchema);
