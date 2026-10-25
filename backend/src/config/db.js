const { Pool } = require('pg');

const sslMode = (process.env.PGSSLMODE || 'disable').toLowerCase();
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number.parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'temari_net_db',
  user: process.env.PGUSER || process.env.USER || 'postgres',
  password: process.env.PGPASSWORD || undefined,
  max: Number.parseInt(process.env.PGPOOL_MAX || '10', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(sslMode === 'require' ? { ssl: { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } } : {})
});

pool.on('error', (error) => {
  console.error('Unexpected idle PostgreSQL client error:', error.message);
});

async function healthCheck() {
  const result = await pool.query('SELECT current_database() AS database, NOW() AS checked_at');
  return { ok: true, database: result.rows[0].database, checkedAt: result.rows[0].checked_at };
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Database rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, healthCheck, withTransaction };
