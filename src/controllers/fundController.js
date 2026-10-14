const { getPool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /funds   → [{ id, name }, ...]
exports.listFunds = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(
    // ⚠️ adjust column names to match your schemew table
    'SELECT ID AS id, Name AS name FROM schemew ORDER BY Name;'
  );
  res.json(result.recordset);
});