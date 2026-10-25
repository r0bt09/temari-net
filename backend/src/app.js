const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { healthCheck } = require('./config/db');
const { errorHandler, HttpError } = require('./utils/http');
const authRoutes = require('./routes/auth');
const lessonsRoutes = require('./routes/lessons');
const leaderboardRoutes = require('./routes/leaderboard');
const aiRoutes = require('./routes/ai');
const chapaRoutes = require('./routes/chapa');
const adminRoutes = require('./routes/admin');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'Origin is not allowed by CORS.', 'CORS_ORIGIN_BLOCKED'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Chapa-Signature', 'Chapa-Signature'],
  maxAge: 600
}));

app.use(express.json({
  limit: '64kb',
  strict: true,
  verify(req, res, buffer) { req.rawBody = Buffer.from(buffer); }
}));
app.get('/health', async (req, res, next) => {
  try {
    const database = await healthCheck();
    res.json({ ok: true, service: 'temari-net-local-api', database });
  } catch (error) {
    next(new HttpError(503, 'The database health check failed.', 'DATABASE_UNAVAILABLE'));
  }
});
app.get('/api/health', async (req, res, next) => {
  try {
    const database = await healthCheck();
    res.json({ ok: true, service: 'temari-net-local-api', database });
  } catch (error) {
    next(new HttpError(503, 'The database health check failed.', 'DATABASE_UNAVAILABLE'));
  }
});
app.use('/api/chapa', chapaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use((req, res, next) => next(new HttpError(404, 'API route not found.', 'NOT_FOUND')));
app.use(errorHandler);

module.exports = app;
