const { HttpError } = require('../utils/http');

function text(value, field, { min = 1, max = 200, required = true } = {}) {
  if (value === undefined || value === null) {
    if (!required) return null;
    throw new HttpError(400, `${field} is required.`, 'VALIDATION_ERROR');
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`, 'VALIDATION_ERROR');
  const cleaned = value.trim();
  if ((!required && cleaned.length === 0) || cleaned.length === 0 && min === 0) return null;
  if (cleaned.length < min || cleaned.length > max) throw new HttpError(400, `${field} must be between ${min} and ${max} characters.`, 'VALIDATION_ERROR');
  return cleaned;
}

function object(value, field, { required = true, maxBytes = 20_000 } = {}) {
  if (value === undefined || value === null) {
    if (!required) return {};
    throw new HttpError(400, `${field} is required.`, 'VALIDATION_ERROR');
  }
  if (typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${field} must be a JSON object.`, 'VALIDATION_ERROR');
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > maxBytes) throw new HttpError(413, `${field} is too large.`, 'VALIDATION_ERROR');
  return value;
}

function integerId(value, field = 'id') {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new HttpError(400, `${field} must be a positive integer.`, 'VALIDATION_ERROR');
  return parsed;
}

function email(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'email is required.', 'VALIDATION_ERROR');
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpError(400, 'email must be a valid email address.', 'VALIDATION_ERROR');
  }
  return normalized;
}

module.exports = { text, object, integerId, email };
