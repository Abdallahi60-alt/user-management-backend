const crypto = require('crypto');
const { Agent, fetch: undiciFetch } = require('undici');
const { getPool, sql } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const newGuid = () => crypto.randomUUID();

const PALM_ADD_CUSTOMER_URL = 'https://41.38.2.103/PALM_API/AddCustomer';
const palmAgent = new Agent({ connect: { rejectUnauthorized: false } });
// Convert SQL Server's ISO date (1999-02-02T00:00:00.000Z) or YYYY-MM-DD
// to Palm's required format: MM-dd-yyyy
function toPalmDate(dateVal) {
  if (!dateVal) return '';

  // mssql returns Date objects for DATE columns — handle both cases
  if (dateVal instanceof Date) {
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    const y = dateVal.getFullYear();
    return `${m}-${d}-${y}`;
  }

  // Fallback: assume ISO-ish string 'YYYY-MM-DD...'
  const s = String(dateVal).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return '';
  return `${m}-${d}-${y}`;
}

// Palm returns HTTP 200 even for business errors (e.g. "Check birth date...").
// This inspects the body to determine if it actually succeeded.
function isPalmSuccess(httpOk, data) {
  if (!httpOk) return false;
  if (!data) return false;
  if (typeof data.status === 'number') return data.status < 400;
  if (data.message && /check|error|invalid|fail|exist/i.test(data.message)) return false;
  return true;
}

// POST /finprofile
exports.create = asyncHandler(async (req, res) => {
  const {
    CityID, CountryID, CustomerNameAr, CustomerNameEn, Email,
    AddressEn, AddressAr, Mobile, IDNumber, SexId, NationalityID, BirthDate,
    Iban,
  } = req.body;

  const palmToken = req.headers['x-palm-token'];
  const externalCode = newGuid();

  // ---------- 1. Insert into finprofile ----------
  const pool = await getPool();
  const result = await pool
    .request()
    .input('UserId',          sql.Int, req.user.id)
    .input('ExternalCode',    sql.NVarChar(50), externalCode)
    .input('CityID',          sql.NVarChar(50), CityID)
    .input('CountryID',       sql.NVarChar(50), CountryID)
    .input('CustomerNameAr',  sql.NVarChar(200), CustomerNameAr)
    .input('CustomerNameEn',  sql.NVarChar(200), CustomerNameEn)
    .input('Email',           sql.NVarChar(200), Email)
    .input('AddressEn',       sql.NVarChar(500), AddressEn)
    .input('AddressAr',       sql.NVarChar(500), AddressAr)
    .input('Mobile',          sql.NVarChar(50),  Mobile)
    .input('IDNumber',        sql.NVarChar(100), IDNumber)
    .input('SexId',           sql.NVarChar(50), SexId)
    .input('NationalityID',   sql.NVarChar(50), NationalityID)
    .input('BirthDate',       sql.Date, BirthDate)
    .input('Iban',            sql.Int, Iban)
    .query(`
      INSERT INTO finprofile (
        UserId, ExternalCode, CityID, CountryID,
        CustomerNameAr, CustomerNameEn, Email,
        AddressEn, AddressAr, Mobile, IDNumber,
        SexId, NationalityID, BirthDate, Iban
      )
      OUTPUT INSERTED.*
      VALUES (
        @UserId, @ExternalCode, @CityID, @CountryID,
        @CustomerNameAr, @CustomerNameEn, @Email,
        @AddressEn, @AddressAr, @Mobile, @IDNumber,
        @SexId, @NationalityID, @BirthDate, @Iban
      )
    `);

  const profile = result.recordset[0];

  // ---------- 2. Push to Palm AddCustomer (best-effort) ----------
  let palmSync = { ok: false };

    

  if (!palmToken) {
    palmSync = { ok: false, error: 'No Palm token provided' };
  } else {
    const palmBody = {
      ExternalCode:   profile.ExternalCode,
      CityID:         profile.CityID ?? '',
      CountryID:      profile.CountryID ?? '',
      CustomerNameAr: profile.CustomerNameAr ?? '',
      CustomerNameEn: profile.CustomerNameEn ?? '',
      Email:          profile.Email ?? '',
      IDType:         '1',
      AddressEn:      profile.AddressEn ?? '',
      AddressAr:      profile.AddressAr ?? '',
      Mobile:         profile.Mobile ?? '',
      IDNumber:       profile.IDNumber ?? '',
      SexId:          profile.SexId ?? '',
      NationalityID:  profile.NationalityID ?? '',
      BirthDate:      toPalmDate(profile.BirthDate),
    };
    console.log('[AddCustomer] sending BirthDate:', palmBody.BirthDate);

    try {
      const upstream = await undiciFetch(PALM_ADD_CUSTOMER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: palmToken,
        },
        body: JSON.stringify(palmBody),
        dispatcher: palmAgent,
      });

      const text = await upstream.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

      const success = isPalmSuccess(upstream.ok, data);

      palmSync = {
        ok: success,
        status: upstream.status,
        response: data,
      };

      if (!success) {
        console.error('[AddCustomer] Palm rejected:', upstream.status, data);
      } else {
        console.log('[AddCustomer] Palm accepted customer', profile.ExternalCode);
      }
    } catch (err) {
      console.error('[AddCustomer] network error:', err.message);
      palmSync = { ok: false, error: err.message };
    }
  }

  res.status(201).json({ profile, palmSync });
});

// GET /finprofile/me   (current user's profile)
exports.getMine = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('UserId', sql.Int, req.user.id)
    .query('SELECT * FROM finprofile WHERE UserId = @UserId');

  if (!result.recordset.length) {
    return res.status(404).json({ error: 'No fin profile yet' });
  }
  res.json(result.recordset[0]);
});

// GET /finprofile   (admin only)
exports.getAll = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM finprofile');
  res.json(result.recordset);
});

// GET /finprofile/:id   (admin, or owner)
exports.getById = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.params.id)
    .query('SELECT * FROM finprofile WHERE id = @id');

  if (!result.recordset.length) throw new AppError(404, 'Fin profile not found');
  res.json(result.recordset[0]);
});

// PUT /finprofile/:id   (admin, or owner)
exports.update = asyncHandler(async (req, res) => {
  const {
    CityID, CountryID, CustomerNameAr, CustomerNameEn, Email,
    AddressEn, AddressAr, Mobile, IDNumber, SexId, NationalityID, BirthDate, Iban, 
  } = req.body;

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id',             sql.Int, req.params.id)
    .input('CityID',         sql.NVarChar(50), CityID)
    .input('CountryID',      sql.NVarChar(50), CountryID)
    .input('CustomerNameAr', sql.NVarChar(200), CustomerNameAr)
    .input('CustomerNameEn', sql.NVarChar(200), CustomerNameEn)
    .input('Email',          sql.NVarChar(200), Email)
    .input('AddressEn',      sql.NVarChar(500), AddressEn)
    .input('AddressAr',      sql.NVarChar(500), AddressAr)
    .input('Mobile',         sql.NVarChar(50),  Mobile)
    .input('IDNumber',       sql.NVarChar(100), IDNumber)
    .input('SexId',          sql.NVarChar(50), SexId)
    .input('NationalityID',  sql.NVarChar(50), NationalityID)
    .input('BirthDate',      sql.Date, BirthDate)
    .input('Iban', sql.Int, Iban)
    .query(`
      UPDATE finprofile SET
        CityID         = COALESCE(@CityID,         CityID),
        CountryID      = COALESCE(@CountryID,      CountryID),
        CustomerNameAr = COALESCE(@CustomerNameAr, CustomerNameAr),
        CustomerNameEn = COALESCE(@CustomerNameEn, CustomerNameEn),
        Email          = COALESCE(@Email,          Email),
        AddressEn      = COALESCE(@AddressEn,      AddressEn),
        AddressAr      = COALESCE(@AddressAr,      AddressAr),
        Mobile         = COALESCE(@Mobile,         Mobile),
        IDNumber       = COALESCE(@IDNumber,       IDNumber),
        SexId          = COALESCE(@SexId,          SexId),
        NationalityID  = COALESCE(@NationalityID,  NationalityID),
        BirthDate      = COALESCE(@BirthDate,      BirthDate),
        Iban = COALESCE(@Iban, Iban),
        UpdatedAt      = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

  if (!result.recordset.length) throw new AppError(404, 'Fin profile not found');
  res.json(result.recordset[0]);
});

// DELETE /finprofile/:id   (admin, or owner)
exports.remove = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM finprofile OUTPUT DELETED.id WHERE id = @id');

  if (!result.recordset.length) throw new AppError(404, 'Fin profile not found');
  res.json({ deleted: true, id: req.params.id });
});