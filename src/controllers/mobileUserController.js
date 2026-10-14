const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
require('dotenv').config();

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '1d' }
  );
}

// POST /mobileUsers
exports.create = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const pool = await getPool();
  const result = await pool
    .request()
    .input('name', sql.NVarChar(100), name)
    .input('username', sql.NVarChar(100), username)
    .input('email', sql.NVarChar(100), email)
    .input('password', sql.NVarChar(100), hash)
    .query(`
      INSERT INTO mobileUsers (name, username, email, password, role)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.username, INSERTED.email, INSERTED.role
      VALUES (@name, @username, @email, @password, 'user')
    `);

  const user = result.recordset[0];
  res.status(201).json({ user, token: signToken(user) });
});

// POST /mobileUsers/login
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const pool = await getPool();
  const result = await pool
    .request()
    .input('username', sql.NVarChar(100), username)
    .query('SELECT id, name, username, email, password, role FROM mobileUsers WHERE username = @username');

  const user = result.recordset[0];
  if (!user) throw new AppError(401, 'Invalid credentials');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new AppError(401, 'Invalid credentials');

  delete user.password;
  res.json({ user, token: signToken(user) });
});

// GET /mobileUsers/me
exports.me = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.user.id)
    .query('SELECT id, name, username, email, role FROM mobileUsers WHERE id = @id');

  if (!result.recordset.length) throw new AppError(404, 'User not found');
  res.json(result.recordset[0]);
});

// GET /mobileUsers
exports.getAll = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .query('SELECT id, name, username, email, role FROM mobileUsers');
  res.json(result.recordset);
});

// GET /mobileUsers/:id
exports.getById = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.params.id)
    .query('SELECT id, name, username, email, role FROM mobileUsers WHERE id = @id');

  if (!result.recordset.length) throw new AppError(404, 'User not found');
  res.json(result.recordset[0]);
});

// PUT /mobileUsers/:id
exports.update = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;

  const pool = await getPool();
  const request = pool
    .request()
    .input('id', sql.Int, req.params.id)
    .input('name', sql.NVarChar(100), name ?? null)
    .input('username', sql.NVarChar(100), username ?? null)
    .input('email', sql.NVarChar(100), email ?? null);

  let query;
  if (password) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    request.input('password', sql.NVarChar(100), hash);
    query = `
      UPDATE mobileUsers
      SET name = COALESCE(@name, name),
          username = COALESCE(@username, username),
          email = COALESCE(@email, email),
          password = @password
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.username, INSERTED.email, INSERTED.role
      WHERE id = @id
    `;
  } else {
    query = `
      UPDATE mobileUsers
      SET name = COALESCE(@name, name),
          username = COALESCE(@username, username),
          email = COALESCE(@email, email)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.username, INSERTED.email, INSERTED.role
      WHERE id = @id
    `;
  }

  const result = await request.query(query);
  if (!result.recordset.length) throw new AppError(404, 'User not found');
  res.json(result.recordset[0]);
});

// DELETE /mobileUsers/:id
exports.remove = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM mobileUsers OUTPUT DELETED.id WHERE id = @id');

  if (!result.recordset.length) throw new AppError(404, 'User not found');
  res.json({ deleted: true, id: req.params.id });
});