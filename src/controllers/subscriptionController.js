const { Agent, fetch: undiciFetch } = require('undici');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const CASHIN_URL = 'https://41.38.2.103/PALM_API/Cashin';

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

exports.createSubscription = asyncHandler(async (req, res) => {
  const {
    externalCode,
    IBAN,
    externalOrderID,
    fundId,
    Goal_ID,
    orderValue,
    systemDate,
    ProcessingDate,
    NAVDate,
    TransactionType,
  } = req.body;

  // Palm token comes from the client's X-Palm-Token header
  const palmToken = req.headers['x-palm-token'];
  if (!palmToken) {
    throw new AppError(400, 'Missing X-Palm-Token header');
  }

  const payload = {
    externalCode,
    IBAN: String(IBAN),
    externalOrderID,
    fundId: String(fundId),
    Goal_ID,
    orderValue: Number(orderValue),
    systemDate,
    ProcessingDate,
    NAVDate,
    TransactionType: Number(TransactionType),
  };

  let upstream;
  try {
    upstream = await undiciFetch(CASHIN_URL, {
      method: 'POST',
     headers: {
  'Content-Type': 'application/json',
  Token: palmToken,
},
      body: JSON.stringify(payload),
      dispatcher: insecureAgent,
    });
  } catch (err) {
    console.error('[Cashin] network error:', err.message);
    throw new AppError(502, 'Upstream API unreachable: ' + err.message);
  }

  const text = await upstream.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    console.error('[Cashin] upstream error', upstream.status, data);
    throw new AppError(
      upstream.status,
      data?.message || data?.error || `Upstream returned ${upstream.status}`
    );
  }

  res.status(201).json(data);
});