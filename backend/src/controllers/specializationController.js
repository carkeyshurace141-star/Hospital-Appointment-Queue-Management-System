const Specialization = require('../models/Specialization');
const { asyncHandler } = require('../middleware/errorHandler');

function toPublicSpecialization(specialization) {
  return {
    id: specialization._id,
    name: specialization.name,
  };
}

const listSpecializations = asyncHandler(async (req, res) => {
  const specializations = await Specialization.find().sort({ name: 1 });
  res.status(200).json({ specializations: specializations.map(toPublicSpecialization) });
});

module.exports = { listSpecializations, toPublicSpecialization };
