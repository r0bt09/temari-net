const express = require('express');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const router = express.Router();
router.get('/', asyncHandler(async (req, res) => {
  const role = req.query.role === undefined ? 'student' : req.query.role;
  if (!['student', 'teacher'].includes(role)) throw new HttpError(400, 'role must be student or teacher.', 'VALIDATION_ERROR');
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.role, u.coins,
            COUNT(p.lesson_id) FILTER (WHERE p.completed_at IS NOT NULL)::int AS completed_lessons
       FROM users u LEFT JOIN progress p ON p.student_id = u.id
      WHERE u.role = $1
      GROUP BY u.id, u.full_name, u.role, u.coins
      ORDER BY u.coins DESC, completed_lessons DESC, u.full_name ASC, u.id ASC LIMIT 20`, [role]
  );
  res.json({ leaderboard: result.rows });
}));
module.exports = router;
