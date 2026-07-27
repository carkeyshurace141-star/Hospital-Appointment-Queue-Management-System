import { isValidPhoneNumber } from 'libphonenumber-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwertyuiop', 'qwerty123', 'letmein123', 'welcome123', 'admin1234', 'iloveyou1',
  'sunshine1', 'princess1', 'football1', 'monkey123', 'dragon123', 'trustno1',
  'abc123456', 'passw0rd', 'p@ssw0rd', 'changeme1', 'hospital1', 'doctor123',
]);

function validateName(name) {
  if (!name.trim()) return 'Full name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
  return '';
}

function validatePhone(phone) {
  const trimmed = phone.trim();
  if (!trimmed) return 'Phone number is required.';
  const isValid = trimmed.startsWith('+')
    ? isValidPhoneNumber(trimmed)
    : isValidPhoneNumber(trimmed, 'GB');
  if (!isValid) return 'Please enter a valid phone number.';
  return '';
}

function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one symbol.';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'This password is too common. Please choose a stronger password.';
  }
  return '';
}

function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
}

function validateSpecialization(specialization) {
  if (!specialization.trim()) return 'Specialization is required.';
  if (specialization.trim().length < 2) return 'Specialization must be at least 2 characters.';
  return '';
}

function validateDepartment(department) {
  if (!department.trim()) return 'Department is required.';
  if (department.trim().length < 2) return 'Department must be at least 2 characters.';
  return '';
}

export {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
  validateSpecialization,
  validateDepartment,
};
