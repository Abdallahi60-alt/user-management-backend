const { z } = require('zod');

// Simple but strict email pattern — version-proof vs zod's evolving .email()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const usernamePattern = /^[a-zA-Z0-9_.-]+$/;

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(100, 'Name too long'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 chars')
    .max(100, 'Username too long')
    .regex(usernamePattern, 'Username may only contain letters, digits, _ . -'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, 'Email too long')
    .regex(emailPattern, 'Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username required').max(100),
  password: z.string().min(1, 'Password required').max(100),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(usernamePattern, 'Username may only contain letters, digits, _ . -')
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(100)
      .regex(emailPattern, 'Invalid email')
      .optional(),
    password: z.string().min(8).max(100).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

module.exports = { registerSchema, loginSchema, updateSchema };