const MIN_LENGTH = 10;

// Common/breached passwords rejected outright, per NCSC and NIST SP 800-63B
// guidance to block known-weak passwords instead of relying on complexity rules alone.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwertyuiop', 'qwerty123', 'letmein123', 'welcome123', 'admin1234', 'iloveyou1',
  'sunshine1', 'princess1', 'football1', 'monkey123', 'dragon123', 'trustno1',
  'abc123456', 'passw0rd', 'p@ssw0rd', 'changeme1', 'hospital1', 'doctor123',
]);

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one symbol.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'This password is too common. Please choose a stronger password.';
  }
  return '';
}

module.exports = { MIN_LENGTH, validatePasswordStrength };
