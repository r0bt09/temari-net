const express = require('express');
const { pool, withTransaction } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { integerId, text } = require('../middleware/validate');
const { HttpError, asyncHandler } = require('../utils/http');
const router = express.Router();
const GRADES = ['Pre-K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];
const SUBJECTS = ['Amharic', 'Math', 'English', 'Science'];
router.use(requireAuth, requireRole('admin'));
router.get('/overview', asyncHandler(async (req, res) => {
  const [counts, revenue, recentUsers, recentLessons, recentSponsorships] = await Promise.all([
    pool.query(`SELECT COUNT(*) FILTER (WHERE role = 'student')::int AS students,
                       COUNT(*) FILTER (WHERE role = 'teacher')::int AS teachers,
                       COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
                       COUNT(*)::int AS total_users,
                       (SELECT COUNT(*)::int FROM lessons) AS lesson_count FROM users`),
    pool.query(`SELECT COUNT(*)::int AS completed_sponsorships,
                       COALESCE(SUM(amount_etb), 0)::numeric(12,2) AS completed_etb_revenue
                  FROM sponsorships WHERE status = 'completed'`),
    pool.query('SELECT id, full_name, email, role, grade_level, coins, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 10'),
    pool.query('SELECT id, title, subject, grade_level, reward_coins, created_at FROM lessons ORDER BY id DESC LIMIT 10'),
    pool.query('SELECT id, sponsor_name, email, amount_etb, student_id, status, tx_ref, created_at FROM sponsorships ORDER BY created_at DESC, id DESC LIMIT 10')
  ]);
  const countData = counts.rows[0];
  const revenueData = revenue.rows[0];
  res.json({ overview: {
    ...countData, students_count: countData.students, teachers_count: countData.teachers, lessons_count: countData.lesson_count,
    totalStudents: countData.students, totalTeachers: countData.teachers, totalLessons: countData.lesson_count,
    counts: { students: countData.students, teachers: countData.teachers, lessons: countData.lesson_count, revenue_etb: revenueData.completed_etb_revenue },
    ...revenueData, completed_revenue_etb: revenueData.completed_etb_revenue, totalRevenue: revenueData.completed_etb_revenue,
    users: recentUsers.rows, recentUsers: recentUsers.rows,
    lessons: recentLessons.rows, recent_lessons: recentLessons.rows, recentLessons: recentLessons.rows,
    sponsorships: recentSponsorships.rows, recent_sponsorships: recentSponsorships.rows, recentSponsorships: recentSponsorships.rows
  } });
}));
router.get('/lessons', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins, created_at FROM lessons ORDER BY id');
  res.json({ lessons: result.rows });
}));
router.get('/sponsorships', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, sponsor_name, email, phone_number, amount_etb, student_id, status, tx_ref, created_at FROM sponsorships ORDER BY created_at DESC, id DESC');
  res.json({ sponsorships: result.rows });
}));
router.post('/lessons', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const title = text(body.title, 'title', { min: 2, max: 160 });
  const subject = text(body.subject, 'subject', { min: 1, max: 16 });
  const gradeLevel = text(body.grade_level, 'grade_level', { min: 1, max: 16 });
  const question = text(body.question, 'question', { min: 2, max: 1_500 });
  if (!SUBJECTS.includes(subject)) throw new HttpError(400, 'subject must be Amharic, Math, English, or Science.', 'VALIDATION_ERROR');
  if (!GRADES.includes(gradeLevel)) throw new HttpError(400, 'grade_level must be Pre-K or Grade 1 through Grade 4.', 'VALIDATION_ERROR');
  const options = body.options;
  if (!Array.isArray(options) || options.length !== 4 || options.some((option) => typeof option !== 'string' || !option.trim() || option.length > 300)) {
    throw new HttpError(400, 'options must be an array of exactly four non-empty text options.', 'VALIDATION_ERROR');
  }
  const correctAnswer = text(body.correct_answer, 'correct_answer', { min: 1, max: 300 });
  if (!options.includes(correctAnswer)) throw new HttpError(400, 'correct_answer must exactly match one of the four options.', 'VALIDATION_ERROR');
  const pronunciationWord = body.pronunciation_word === undefined || body.pronunciation_word === null || body.pronunciation_word === '' ? null : text(body.pronunciation_word, 'pronunciation_word', { min: 1, max: 120 });
  const reward = body.reward_coins === undefined ? 15 : Number(body.reward_coins);
  if (!Number.isInteger(reward) || reward < 0 || reward > 1000) throw new HttpError(400, 'reward_coins must be an integer from 0 through 1000.', 'VALIDATION_ERROR');
  const result = await pool.query(
    `INSERT INTO lessons (title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING id, title, subject, grade_level, question, options, correct_answer, pronunciation_word, reward_coins, created_at`,
    [title, subject, gradeLevel, question, JSON.stringify(options), correctAnswer, pronunciationWord, reward]
  );
  res.status(201).json({ lesson: result.rows[0] });
}));
router.delete('/lessons/:lessonId', asyncHandler(async (req, res) => {
  const lessonId = integerId(req.params.lessonId, 'lessonId');
  const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING id, title', [lessonId]);
  if (!result.rowCount) throw new HttpError(404, 'Lesson not found.', 'LESSON_NOT_FOUND');
  res.json({ deleted: result.rows[0] });
}));
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const userId = integerId(req.params.userId, 'userId');
  if (userId === Number(req.user.id)) throw new HttpError(409, 'An administrator cannot delete their own account.', 'SELF_DELETE_BLOCKED');
  const deleted = await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [74120001]);
    const target = await client.query('SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!target.rowCount) return null;
    if (target.rows[0].role === 'admin') {
      const admins = await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
      if (admins.rows[0].count <= 1) throw new HttpError(409, 'The final administrator account cannot be deleted.', 'LAST_ADMIN');
    }
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    return { id: target.rows[0].id, email: target.rows[0].email, role: target.rows[0].role };
  });
  if (!deleted) throw new HttpError(404, 'User not found.', 'USER_NOT_FOUND');
  res.json({ deleted });
}));
module.exports = router;
