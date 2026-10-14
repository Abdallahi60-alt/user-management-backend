const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mobileUserController');
const { auth, adminOnly, selfOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, updateSchema } = require('../validators/mobileUserValidators');

/**
 * @openapi
 * /mobileUsers:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password]
 *             properties:
 *               name:     { type: string, example: Ali }
 *               username: { type: string, example: ali }
 *               email:    { type: string, example: ali@test.com }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       409:
 *         description: Username or email already exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', validate(registerSchema), ctrl.create);

/**
 * @openapi
 * /mobileUsers/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and get a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: ali }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', validate(loginSchema), ctrl.login);

/**
 * @openapi
 * /mobileUsers/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { description: Missing or invalid token }
 */
router.get('/me', auth, ctrl.me);

/**
 * @openapi
 * /mobileUsers:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 *       403: { description: Admin access required }
 */
router.get('/', auth, adminOnly, ctrl.getAll);

/**
 * @openapi
 * /mobileUsers/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by id (self or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       403: { description: Not allowed }
 *       404: { description: User not found }
 */
router.get('/:id', auth, selfOrAdmin, ctrl.getById);

/**
 * @openapi
 * /mobileUsers/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user (self or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:     { type: string, example: Ali Updated }
 *               username: { type: string, example: ali }
 *               email:    { type: string, example: ali@test.com }
 *               password: { type: string, example: newpass456 }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400: { description: Validation failed }
 *       403: { description: Not allowed }
 *       404: { description: User not found }
 */
router.put('/:id', auth, selfOrAdmin, validate(updateSchema), ctrl.update);

/**
 * @openapi
 * /mobileUsers/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 *       403: { description: Admin access required }
 *       404: { description: User not found }
 */
router.delete('/:id', auth, adminOnly, ctrl.remove);

module.exports = router;