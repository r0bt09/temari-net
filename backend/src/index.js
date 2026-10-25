require('dotenv').config();
const crypto = require('node:crypto');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET is unset; using a process-local random secret. Existing tokens will expire when this API restarts. Set JWT_SECRET for stable sessions.');
}

const app = require('./app');
const { pool } = require('./config/db');
const port = Number.parseInt(process.env.PORT || '5000', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Temari Net local API listening on port ${port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; closing API server.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
