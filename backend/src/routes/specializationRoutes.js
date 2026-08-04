const express = require('express');
const { listSpecializations } = require('../controllers/specializationController');

const router = express.Router();

router.get('/', listSpecializations);

module.exports = router;
