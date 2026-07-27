const { isValidPhoneNumber } = require('libphonenumber-js');

function validatePhoneNumber(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;
  // Numbers with an explicit country code are validated internationally;
  // bare national numbers are assumed UK, matching this hospital's locale.
  if (trimmed.startsWith('+')) {
    return isValidPhoneNumber(trimmed);
  }
  return isValidPhoneNumber(trimmed, 'GB');
}

module.exports = { validatePhoneNumber };
