const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  hashPassword,
  comparePassword,
  generateResetToken,
  hashResetToken,
} = require('../utils/password');
const { validatePasswordStrength } = require('../utils/passwordPolicy');
const { sendPasswordResetEmail } = require('../utils/passwordResetEmail');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const FORGOT_PASSWORD_RESPONSE = {
  message: 'If an account exists for that email, a reset link has been sent.',
};

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    specialization: user.specialization,
    department: user.department,
    availability: user.role === 'doctor' ? user.availability : undefined,
    mustChangePassword: user.mustChangePassword,
  };
}

const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, phone, passwordHash, provider: 'local' });

  const token = signToken(user);
  res.status(201).json({ token, user: toPublicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  res.status(200).json({ token, user: toPublicUser(user) });
});

const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid Google sign-in. Please try again.' });
  }

  if (!payload?.email || payload.email_verified === false) {
    return res.status(401).json({ message: 'Invalid Google sign-in. Please try again.' });
  }

  let user = await User.findOne({ googleId: payload.sub });
  if (!user) {
    user = await User.findOne({ email: payload.email.toLowerCase() });
  }

  if (user) {
    if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }
  } else {
    user = await User.create({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      provider: 'google',
      googleId: payload.sub,
    });
  }

  const token = signToken(user);
  res.status(200).json({ token, user: toPublicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: toPublicUser(req.user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user.passwordHash || !(await comparePassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return res.status(400).json({ message: strengthError });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  res.status(200).json({ user: toPublicUser(user) });
});

// Never reveals whether the email exists or how the account authenticates
// (local vs Google) - always the same response and shape, mirroring the
// generic "Incorrect email or password" used by login for the same reason.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user && user.provider === 'local') {
    const rawToken = generateResetToken();
    user.resetPasswordTokenHash = hashResetToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await user.save();

    await sendPasswordResetEmail(user, rawToken);
  }

  res.status(200).json(FORGOT_PASSWORD_RESPONSE);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await User.findOne({
    resetPasswordTokenHash: hashResetToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +resetPasswordExpires');

  if (!user) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return res.status(400).json({ message: strengthError });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpires = null;
  await user.save();

  const jwtToken = signToken(user);
  res.status(200).json({ token: jwtToken, user: toPublicUser(user) });
});

module.exports = {
  signup,
  login,
  googleAuth,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};
