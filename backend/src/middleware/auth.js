const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

async function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
