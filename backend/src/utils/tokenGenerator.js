const Token = require('../models/Token');

function startOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date) {
  const end = startOfDay(date);
  end.setDate(end.getDate() + 1);
  return end;
}

// Returns the next token number for a department, unique per calendar day.
// Counts today's existing tokens for the department and increments -
// deliberately not a random id, so patients can be called out in order.
async function generateToken(departmentId, date = new Date()) {
  const count = await Token.countDocuments({
    department: departmentId,
    issuedAt: { $gte: startOfDay(date), $lt: endOfDay(date) },
  });

  return count + 1;
}

module.exports = { generateToken };
