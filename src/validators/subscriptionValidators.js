const { z } = require('zod');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = z.object({
  externalCode: z.string().trim().min(1, 'Required').max(50),
  IBAN: z
    .union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)])
    .refine((v) => v >= 0, 'IBAN must be a non-negative number'),
  externalOrderID: z.string().trim().regex(guidPattern, 'Invalid GUID'),
  fundId: z
    .union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)])
    .refine((v) => v > 0, 'Select a fund'),
  Goal_ID: z.string().trim().regex(guidPattern, 'Invalid Goal_ID GUID'),
  orderValue: z
    .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
    .refine((v) => v > 0, 'Order value must be greater than 0'),
  systemDate: z.string().regex(datePattern, 'Use YYYY-MM-DD'),
  ProcessingDate: z.string().regex(datePattern, 'Use YYYY-MM-DD'),
  NAVDate: z.string().regex(datePattern, 'Use YYYY-MM-DD'),
  TransactionType: z
    .union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)])
    .refine((v) => v >= 1, 'Invalid TransactionType'),
});

module.exports = { createSchema };