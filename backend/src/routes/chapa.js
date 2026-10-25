const express = require('express');
const crypto = require('node:crypto');
const { pool, withTransaction } = require('../config/db');
const { email, integerId, text } = require('../middleware/validate');
const { HttpError, asyncHandler } = require('../utils/http');
const router = express.Router();
const CHAPA_API = 'https://api.chapa.co/v1';
function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function txReference() {
  return `TEMARINET-TX-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
}
function mockEnabled() { return !process.env.CHAPA_SECRET_KEY; }
function page(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)} | Temari Net</title><style>body{margin:0;background:#f3f7f4;color:#183b2d;font:16px/1.5 system-ui,sans-serif}.wrap{max-width:620px;margin:8vh auto;padding:36px;background:#fff;border-radius:20px;box-shadow:0 12px 36px #183b2d18}h1{color:#16764b}button,a.button{display:inline-block;border:0;border-radius:10px;background:#16764b;color:white;padding:13px 19px;font-weight:700;text-decoration:none;cursor:pointer}small{color:#53665b}</style></head><body><main class="wrap"><h1>${htmlEscape(title)}</h1>${content}<p><small>Temari Net · Supporting brighter learning in Ethiopia</small></p></main></body></html>`;
}
async function completeSponsorship(txRef, requestedStatus) {
  return withTransaction(async (client) => {
    const result = await client.query('SELECT id, student_id, amount_etb, status FROM sponsorships WHERE tx_ref = $1 FOR UPDATE', [txRef]);
    if (!result.rowCount) throw new HttpError(404, 'Sponsorship transaction not found.', 'TRANSACTION_NOT_FOUND');
    const row = result.rows[0];
    if (row.status === 'completed') return { status: 'completed', alreadyCompleted: true };
    const status = requestedStatus === 'success' ? 'completed' : requestedStatus;
    await client.query('UPDATE sponsorships SET status = $1 WHERE id = $2', [status, row.id]);
    if (status === 'completed' && row.student_id !== null) {
      await client.query("UPDATE users SET coins = coins + 50 WHERE id = $1 AND role = 'student'", [row.student_id]);
    }
    return { status, alreadyCompleted: false };
  });
}
async function getSponsorship(txRef) {
  const result = await pool.query('SELECT id, sponsor_name, email, phone_number, amount_etb, student_id, status, tx_ref, created_at FROM sponsorships WHERE tx_ref = $1', [txRef]);
  if (!result.rowCount) throw new HttpError(404, 'Sponsorship transaction not found.', 'TRANSACTION_NOT_FOUND');
  return result.rows[0];
}
router.post('/initialize', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const sponsorName = text(body.sponsor_name, 'sponsor_name', { min: 2, max: 100 });
  const sponsorEmail = email(body.email);
  const phoneNumber = text(body.phone_number, 'phone_number', { min: 7, max: 32 });
  if (!/^[+\d][\d\s().-]{5,31}$/.test(phoneNumber)) throw new HttpError(400, 'phone_number must be a valid phone number.', 'VALIDATION_ERROR');
  const amountText = body.amount_etb === undefined || body.amount_etb === null || body.amount_etb === '' ? '50' : String(body.amount_etb).trim();
  const amount = Number(amountText);
  if (!/^(?:[1-9]\d{0,5}|1000000)(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount < 1 || amount > 1000000) {
    throw new HttpError(400, 'amount_etb must be between 1 and 1,000,000 ETB with at most two decimal places.', 'VALIDATION_ERROR');
  }
  let studentId = null;
  if (body.student_id !== undefined && body.student_id !== null && body.student_id !== '') {
    studentId = integerId(body.student_id, 'student_id');
    const student = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'student'", [studentId]);
    if (!student.rowCount) throw new HttpError(404, 'The selected student was not found.', 'STUDENT_NOT_FOUND');
  }
  const txRef = txReference();
  const inserted = await pool.query(
    `INSERT INTO sponsorships (sponsor_name, email, phone_number, amount_etb, student_id, status, tx_ref)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     RETURNING id, sponsor_name, email, phone_number, amount_etb, student_id, status, tx_ref, created_at`,
    [sponsorName, sponsorEmail, phoneNumber, amount, studentId, txRef]
  );
  const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
  const secretKey = process.env.CHAPA_SECRET_KEY;
  if (!secretKey) {
    return res.status(201).json({ sponsorship: inserted.rows[0], checkoutUrl: `${baseUrl}/api/chapa/mock-checkout/${encodeURIComponent(txRef)}`, txRef, simulated: true });
  }
  try {
    const response = await fetch(`${CHAPA_API}/transaction/initialize`, {
      method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        amount: amount.toFixed(2), currency: 'ETB', email: sponsorEmail, first_name: sponsorName,
        phone_number: phoneNumber, tx_ref: txRef,
        callback_url: `${baseUrl}/api/chapa/webhook`,
        return_url: `${baseUrl}/api/chapa/success?tx_ref=${encodeURIComponent(txRef)}`,
        customization: { title: 'TEMARI NET Sponsorship', description: 'Support a student with 50 ETB' }
      })
    });
    const provider = await response.json().catch(() => ({}));
    const checkoutUrl = provider?.data?.checkout_url;
    if (!response.ok || typeof checkoutUrl !== 'string' || !checkoutUrl) {
      await pool.query("UPDATE sponsorships SET status = 'failed' WHERE tx_ref = $1 AND status = 'pending'", [txRef]);
      throw new HttpError(502, 'Chapa could not initialize this checkout. Please try again later.', 'CHAPA_INITIALIZATION_FAILED');
    }
    res.status(201).json({ sponsorship: inserted.rows[0], checkoutUrl, txRef, simulated: false });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error('Chapa initialization request failed:', error.message);
    await pool.query("UPDATE sponsorships SET status = 'failed' WHERE tx_ref = $1 AND status = 'pending'", [txRef]).catch(() => {});
    throw new HttpError(502, 'Chapa could not be reached. Please try again later.', 'CHAPA_UNAVAILABLE');
  }
}));
router.get('/verify/:txRef', asyncHandler(async (req, res) => {
  const txRef = text(req.params.txRef, 'txRef', { min: 20, max: 100 });
  const sponsorship = await getSponsorship(txRef);
  if (!process.env.CHAPA_SECRET_KEY) return res.json({ txRef, status: sponsorship.status, simulated: true });
  if (sponsorship.status === 'completed') return res.json({ txRef, status: 'completed', simulated: false });
  let response;
  try {
    response = await fetch(`${CHAPA_API}/transaction/verify/${encodeURIComponent(txRef)}`, {
      headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` }, signal: AbortSignal.timeout(12_000)
    });
  } catch (error) { throw new HttpError(502, 'Chapa could not be reached for verification.', 'CHAPA_UNAVAILABLE'); }
  const provider = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, 'Chapa verification failed.', 'CHAPA_VERIFICATION_FAILED');
  const data = provider?.data || {};
  let status = String(data.status || 'pending').toLowerCase();
  if (status === 'success' && (data.currency !== 'ETB' || data.amount === undefined || Number(data.amount) !== Number(sponsorship.amount_etb))) {
    throw new HttpError(409, 'The verified amount or currency does not match this sponsorship.', 'CHAPA_AMOUNT_MISMATCH');
  }
  if (!['success', 'failed', 'pending'].includes(status)) status = 'pending';
  const saved = await completeSponsorship(txRef, status);
  res.json({ txRef, status: saved.status, simulated: false });
}));
async function webhookHandler(req, res) {
  const secret = process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY;
  if (!secret) throw new HttpError(503, 'Chapa webhook verification is not configured.', 'CHAPA_NOT_CONFIGURED');
  const signature = (req.get('x-chapa-signature') || '').replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(signature) || !Buffer.isBuffer(req.rawBody)) throw new HttpError(401, 'Webhook signature is missing or invalid.', 'INVALID_WEBHOOK_SIGNATURE');
  const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) throw new HttpError(401, 'Webhook signature is missing or invalid.', 'INVALID_WEBHOOK_SIGNATURE');
  let payload;
  try { payload = JSON.parse(req.rawBody.toString('utf8')); }
  catch (error) { throw new HttpError(400, 'Webhook payload must be valid JSON.', 'INVALID_WEBHOOK_PAYLOAD'); }
  const data = payload?.data || payload;
  const txRef = data?.tx_ref || data?.reference;
  const providerStatus = String(data?.status || '').toLowerCase();
  if (typeof txRef !== 'string' || !['success', 'failed', 'pending'].includes(providerStatus)) throw new HttpError(400, 'Webhook payload is missing a valid transaction reference or status.', 'INVALID_WEBHOOK_PAYLOAD');
  const sponsorship = await getSponsorship(txRef);
  if (providerStatus === 'success' && (data.currency !== 'ETB' || data.amount === undefined || Number(data.amount) !== Number(sponsorship.amount_etb))) {
    throw new HttpError(409, 'Webhook amount or currency does not match the sponsorship.', 'CHAPA_AMOUNT_MISMATCH');
  }
  const saved = await completeSponsorship(txRef, providerStatus);
  res.json({ received: true, txRef, status: saved.status });
}
router.post('/webhook', asyncHandler(webhookHandler));
router.get('/mock-checkout/:txRef', asyncHandler(async (req, res) => {
  if (!mockEnabled()) throw new HttpError(404, 'Local mock checkout is disabled while Chapa is configured.', 'MOCK_CHECKOUT_DISABLED');
  const txRef = text(req.params.txRef, 'txRef', { min: 20, max: 100 });
  const sponsorship = await getSponsorship(txRef);
  let content;
  if (sponsorship.status === 'completed') content = '<p>This sponsorship is already complete. Thank you for supporting a learner.</p><a class="button" href="/api/chapa/success?tx_ref=' + encodeURIComponent(txRef) + '">View confirmation</a>';
  else if (sponsorship.status === 'failed') content = '<p>This sponsorship did not complete.</p>';
  else content = `<p>This local demonstration checkout will not take or transfer any money.</p><p><strong>Support amount:</strong> ${htmlEscape(sponsorship.amount_etb)} ETB</p><p><strong>Reference:</strong> ${htmlEscape(sponsorship.tx_ref)}</p><form method="post" action="/api/chapa/mock-checkout/${encodeURIComponent(txRef)}/complete"><button type="submit">Confirm local sponsorship</button></form>`;
  res.type('html').send(page('Temari Net Sponsorship', content));
}));
router.post('/mock-checkout/:txRef/complete', asyncHandler(async (req, res) => {
  if (!mockEnabled()) throw new HttpError(404, 'Local mock checkout is disabled while Chapa is configured.', 'MOCK_CHECKOUT_DISABLED');
  const txRef = text(req.params.txRef, 'txRef', { min: 20, max: 100 });
  const sponsorship = await getSponsorship(txRef);
  if (sponsorship.status === 'pending') await completeSponsorship(txRef, 'success');
  res.redirect(303, `/api/chapa/success?tx_ref=${encodeURIComponent(txRef)}`);
}));
router.get('/success', asyncHandler(async (req, res) => {
  const txRef = text(req.query.tx_ref, 'tx_ref', { min: 20, max: 100 });
  const sponsorship = await getSponsorship(txRef);
  const message = sponsorship.status === 'completed' ? `Thank you! Your ${htmlEscape(sponsorship.amount_etb)} ETB sponsorship is confirmed.` : sponsorship.status === 'failed' ? 'This sponsorship was not completed.' : 'Your sponsorship is awaiting confirmation.';
  const content = `<p>${htmlEscape(message)}</p><p><strong>Reference:</strong> ${htmlEscape(sponsorship.tx_ref)}</p><p><strong>Amount:</strong> ${htmlEscape(sponsorship.amount_etb)} ETB</p><p><strong>Status:</strong> ${htmlEscape(sponsorship.status)}</p><a class="button" href="/api/chapa/verify/${encodeURIComponent(txRef)}">Check payment status</a>`;
  res.type('html').send(page('Sponsorship confirmation', content));
}));
module.exports = router;
