const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const jwtSecret = process.env.JWT_SECRET || null;
const PROFILE_COLUMNS = 'id, full_name, email, role, grade_level, coins, streak, registered_by_teacher_id, created_at';
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new HttpError(401, 'A bearer token is required.', 'AUTH_REQUIRED');
  if (!jwtSecret) throw new HttpError(503, 'Authentication is not configured. Set JWT_SECRET and restart the API.', 'AUTH_NOT_CONFIGURED');
  let claims;
  try { claims = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'], issuer: 'temari-net-local-api', audience: 'temari-net-client' }); }
  catch (error) { throw new HttpError(401, 'The bearer token is invalid or expired.', 'INVALID_TOKEN'); }
  const result = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [claims.sub]);
  if (!result.rowCount) throw new HttpError(401, 'The account for this token no longer exists.', 'ACCOUNT_NOT_FOUND');
  req.user = result.rows[0];
  next();
});
function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) return next(new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Your account does not have permission for this action.', 'FORBIDDEN'));
    return next();
  };
}
function issueToken(user) {
  if (!jwtSecret) throw new HttpError(503, 'Authentication is not configured. Set JWT_SECRET and restart the API.', 'AUTH_NOT_CONFIGURED');
  return jwt.sign({ sub: String(user.id), role: user.role }, jwtSecret, {
    algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'temari-net-local-api', audience: 'temari-net-client'
  });
}
module.exports = { requireAuth, requireRole, issueToken, PROFILE_COLUMNS };
