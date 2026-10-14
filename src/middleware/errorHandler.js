class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap async controllers so thrown errors reach the error handler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// SQL Server error numbers we care about
const SQL_UNIQUE_VIOLATION = [2627, 2601];

function errorHandler(err, req, res, next) {
  // SQL Server unique constraint violation → 409
  if (SQL_UNIQUE_VIOLATION.includes(err.number)) {
    const msg = err.message || '';
    let field = 'Value';
    if (msg.includes('UQ_mobileUsers_username')) field = 'Username';
    else if (msg.includes('UQ_mobileUsers_email')) field = 'Email';
    return res.status(409).json({ error: `${field} already exists` });
  }

  const status = err.status || 500;

  // Log 5xx (our bugs) but not 4xx (client's fault)
  if (status >= 500) console.error('[ERROR]', err);

  // Don't leak internal details for 500s
  const message = status >= 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { AppError, asyncHandler, errorHandler, notFound };