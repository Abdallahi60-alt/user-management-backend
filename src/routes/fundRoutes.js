const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fundController');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.listFunds);

module.exports = router;