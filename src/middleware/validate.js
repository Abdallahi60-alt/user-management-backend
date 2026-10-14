const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));
    return res.status(400).json({ error: 'Validation failed', issues });
  }

  req.body = result.data; // coerced / trimmed / sanitized
  next();
};

module.exports = validate;