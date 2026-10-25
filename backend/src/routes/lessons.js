const express = require('express');
const { pool, withTransaction } = require('../config/db');
const { requireAuth, requireRole, PROFILE_COLUMNS } = require('../middleware/auth');
const { integerId, text } = require('../middleware/validate');
const { HttpError, asyncHandler } = require('../utils/http');
const router = express.Router();
const GRADE_LEVELS = ['Pre-K', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];
const SUBJECTS = ['Amharic', 'Math', 'English', 'Science'];
router.get('/', asyncHandler(async (req, res) => {
  const clauses = [];
  const values = [];
  for (const [parameter, column, choices] of [['grade_level', 'grade_level', GRADE_LEVELS], ['subject', 'subject', SUBJECTS]]) {
    if (req.query[parameter] === undefined) continue;
    const value = text(req.query[parameter], parameter, { min: 1, max: 16 });
    if (!choices.includes(value)) throw new HttpError(400, `${parameter} is not supported.`, 'VALIDATION_ERROR');
    values.push(value);
    clauses.push(`${column} = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT id, title, subject, grade_level, question, options, correct_answer,
            pronunciation_word, reward_coins, created_at
       FROM lessons ${where} ORDER BY id`, values
  );
  res.json({ lessons: result.rows });
}));
router.post('/submit', requireAuth, requireRole('student'), asyncHandler(async (req, res) => {
  const studentId = integerId(req.body?.student_id, 'student_id');
  if (studentId !== Number(req.user.id)) throw new HttpError(403, 'You may submit progress only for your own student account.', 'STUDENT_MISMATCH');
  const lessonId = integerId(req.body?.lesson_id, 'lesson_id');
  const selectedOption = req.body?.selected_option;
  if (typeof selectedOption !== 'string' || !selectedOption.trim() || selectedOption.length > 300) {
    throw new HttpError(400, 'selected_option must be a non-empty text option.', 'VALIDATION_ERROR');
  }
  const outcome = await withTransaction(async (client) => {
    const student = await client.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1 AND role = 'student' FOR UPDATE`, [studentId]);
    if (!student.rowCount) throw new HttpError(404, 'Student not found.', 'STUDENT_NOT_FOUND');
    const lessonResult = await client.query('SELECT id, correct_answer, reward_coins FROM lessons WHERE id = $1', [lessonId]);
    if (!lessonResult.rowCount) throw new HttpError(404, 'Lesson not found.', 'LESSON_NOT_FOUND');
    const lesson = lessonResult.rows[0];
    const correct = selectedOption === lesson.correct_answer;
    const previous = await client.query('SELECT completed_at FROM progress WHERE student_id = $1 AND lesson_id = $2 FOR UPDATE', [studentId, lessonId]);
    const alreadyCompleted = Boolean(previous.rows[0]?.completed_at);
    const earnedCoins = correct && !alreadyCompleted ? Number(lesson.reward_coins) : 0;
    await client.query(
      `INSERT INTO progress (student_id, lesson_id, score, completed_at)
       VALUES ($1, $2, $3, CASE WHEN $3 = 100 THEN NOW() ELSE NULL END)
       ON CONFLICT (student_id, lesson_id) DO UPDATE SET
         score = CASE WHEN progress.completed_at IS NOT NULL THEN 100 ELSE EXCLUDED.score END,
         completed_at = COALESCE(progress.completed_at, EXCLUDED.completed_at)`,
      [studentId, lessonId, correct ? 100 : 0]
    );
    const updated = await client.query(
      `UPDATE users SET coins = coins + $1 WHERE id = $2 RETURNING ${PROFILE_COLUMNS}`,
      [earnedCoins, studentId]
    );
    return { correct, earnedCoins, correctAnswer: lesson.correct_answer, user: updated.rows[0] };
  });
  res.json(outcome);
}));
module.exports = router;
