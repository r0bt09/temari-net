const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../config/db');
const { requireAuth, issueToken, PROFILE_COLUMNS } = require('../middleware/auth');
const { email, integerId, text } = require('../middleware/validate');
const { HttpError, asyncHandler } = require('../utils/http');
const router = express.Router();
const HASH_ROUNDS = 12;
const GRADE_LEVELS = ['Pre-K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];
function gradeLevel(value, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, 'grade_level is required.', 'VALIDATION_ERROR');
    return null;
  }
  if (typeof value !== 'string' || !GRADE_LEVELS.includes(value)) throw new HttpError(400, 'grade_level must be Pre-K or Grade 1 through Grade 4.', 'VALIDATION_ERROR');
  return value;
}
router.post('/register', asyncHandler(async (req, res) => {
  const normalizedEmail = email(req.body?.email);
  const password = text(req.body?.password, 'password', { min: 10, max: 128 });
  const fullName = text(req.body?.full_name, 'full_name', { min: 2, max: 100 });
  const studentGrade = gradeLevel(req.body?.grade_level);
  let teacherId = null;
  if (req.body?.registered_by_teacher_id !== undefined && req.body.registered_by_teacher_id !== null && req.body.registered_by_teacher_id !== '') {
    teacherId = integerId(req.body.registered_by_teacher_id, 'registered_by_teacher_id');
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) throw new HttpError(400, 'password must include at least one letter and one number.', 'VALIDATION_ERROR');
  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  try {
    const user = await withTransaction(async (client) => {
      if (teacherId !== null) {
        const teacher = await client.query("SELECT id FROM users WHERE id = $1 AND role = 'teacher' FOR UPDATE", [teacherId]);
        if (!teacher.rowCount) throw new HttpError(400, 'registered_by_teacher_id must identify an existing teacher.', 'INVALID_TEACHER_REFERRAL');
      }
      const inserted = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, grade_level, registered_by_teacher_id)
         VALUES ($1, $2, $3, 'student', $4, $5)
         RETURNING ${PROFILE_COLUMNS}`,
        [fullName, normalizedEmail, passwordHash, studentGrade, teacherId]
      );
      if (teacherId !== null) await client.query('UPDATE users SET coins = coins + 10 WHERE id = $1', [teacherId]);
      return inserted.rows[0];
    });
    res.status(201).json({ user, token: issueToken(user) });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'An account with that email already exists.', 'EMAIL_IN_USE');
    throw error;
  }
}));
router.post('/login', asyncHandler(async (req, res) => {
  const normalizedEmail = email(req.body?.email);
  const password = text(req.body?.password, 'password', { min: 1, max: 128 });
  const result = await pool.query(`SELECT ${PROFILE_COLUMNS}, password_hash FROM users WHERE email = $1`, [normalizedEmail]);
  const account = result.rows[0];
  const hasUsableHash = typeof account?.password_hash === 'string' && account.password_hash.startsWith('$2');
  const valid = hasUsableHash ? await bcrypt.compare(password, account.password_hash) : false;
  if (!valid) throw new HttpError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  const { password_hash: ignored, ...user } = account;
  res.json({ user, token: issueToken(user) });
}));
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
  if (!result.rowCount) throw new HttpError(401, 'The account for this token no longer exists.', 'ACCOUNT_NOT_FOUND');
  res.json({ user: result.rows[0] });
}));
module.exports = router;
