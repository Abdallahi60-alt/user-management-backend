const { Agent, fetch: undiciFetch } = require('undici');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const PALM_LOGIN_URL = 'https://41.38.2.103/PALM_API/Login';

// hardcoded per your spec — move to .env if you want
const PALM_USERNAME = 'Palm';
const PALM_PASSWORD =
  'U3aRoQyMcn565cSSKhASUnx8WRRGybsI6ZRflxR35Xs/GqCUOpOmlUXjBl0y80ktLzyC11fJC/ltjjo92wwdpw==';

// same self-signed cert workaround as the Cashin call
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

// POST /palm-login   (protected by our own JWT)
exports.palmLogin = asyncHandler(async (req, res) => {
  const payload = {
    UserName: PALM_USERNAME,
    Password: PALM_PASSWORD,
  };

  let upstream;
  try {
    upstream = await undiciFetch(PALM_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      dispatcher: insecureAgent,
    });
  } catch (err) {
    console.error('[Palm Login] network error:', err.message);
    throw new AppError(502, 'Palm API unreachable: ' + err.message);
  }

  const text = await upstream.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    console.error('[Palm Login] upstream error', upstream.status, data);
    throw new AppError(
      upstream.status,
      data?.message || data?.error || `Palm API returned ${upstream.status}`
    );
  }

  // The .NET API could return the token under different keys.
  // Common shapes: { token: "..." }, { Token: "..." }, { data: { token: "..." } }, or just a raw string.
  const token =
    data?.token ??
    data?.Token ??
    data?.data?.token ??
    data?.data?.Token ??
    (typeof data === 'string' ? data : null);

  if (!token) {
    console.error('[Palm Login] no token in response:', data);
    throw new AppError(502, 'Palm API response did not contain a token');
  }

  res.json({ token, raw: data });
});