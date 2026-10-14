const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subscriptionController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSchema } = require('../validators/subscriptionValidators');

router.post('/', auth, validate(createSchema), ctrl.createSubscription);

module.exports = router;