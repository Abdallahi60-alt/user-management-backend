const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/finProfileController');
const { auth, adminOnly, ownsFinProfileOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSchema, updateSchema } = require('../validators/finProfileValidators');

// all finprofile routes require auth
router.use(auth);

router.post('/',  validate(createSchema), ctrl.create);
router.get('/me', ctrl.getMine);

router.get('/',       adminOnly, ctrl.getAll);
router.get('/:id',    ownsFinProfileOrAdmin, ctrl.getById);
router.put('/:id',    ownsFinProfileOrAdmin, validate(updateSchema), ctrl.update);
router.delete('/:id', ownsFinProfileOrAdmin, ctrl.remove);

module.exports = router;