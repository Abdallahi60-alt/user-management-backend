const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/palmController');
const { auth } = require('../middleware/auth');

router.post('/login', auth, ctrl.palmLogin);

module.exports = router;