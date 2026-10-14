const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
require('dotenv').config();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// "owner or admin" — allows a user to act on their own record
function selfOrAdmin(req, res, next) {
  const targetId = Number(req.params.id);
  if (req.user?.role === 'admin' || req.user?.id === targetId) {
    return next();
  }
  return res.status(403).json({ error: 'Not allowed' });
}
async function ownsFinProfileOrAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT UserId FROM finprofile WHERE id = @id');

    const row = result.recordset[0];
    if (!row || row.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    next();
  } catch (err) {
    next(err);
  }
}


module.exports = { auth, adminOnly, selfOrAdmin, ownsFinProfileOrAdmin };