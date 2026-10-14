const { z } = require('zod');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;   // YYYY-MM-DD
const ibanPattern = /^[A-Z]{2}[0-9A-Z]{13,32}$/i;  // 2 letters + 13-32 alphanumeric


// Arabic text: allow Arabic + Latin + digits + common punctuation/spaces
// We don't want to be too strict — names have all sorts of characters.
const nameLike = (max) =>
  z.string().trim().min(1, 'Required').max(max, `Max ${max} characters`);



const createSchema = z.object({
  CityID:          z.string().trim().max(50).nullable().optional().transform((v) => v ?? null),
  CountryID:       z.string().trim().max(50).nullable().optional().transform((v) => v ?? null),
  CustomerNameAr:  nameLike(200),
  CustomerNameEn:  nameLike(200),
  Email:           z.string().trim().toLowerCase().max(200).regex(emailPattern, 'Invalid email'),
  AddressEn:       nameLike(500),
  AddressAr:       nameLike(500),
  Mobile:          z.string().trim().min(5, 'Too short').max(50),
  IDNumber:        z.string().trim().min(3, 'Too short').max(100),
  SexId:           z.string().trim().max(50).nullable().optional().transform((v) => v ?? null),
  NationalityID:   z.string().trim().max(50).nullable().optional().transform((v) => v ?? null),
  BirthDate:       z.string().regex(datePattern, 'Use YYYY-MM-DD'),
  Iban: z
  .union([z.number().int(), z.string().regex(/^\d$/).transform(Number)])
  .refine((v) => v >= 0 && v <= 9, 'Iban must be a single digit (0-9)')
  .nullable()
  .transform((v) => (v === undefined ? null : v)),
});

// Same fields but everything optional (for partial updates)
const updateSchema = createSchema.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: 'At least one field must be provided' }
);

module.exports = { createSchema, updateSchema };