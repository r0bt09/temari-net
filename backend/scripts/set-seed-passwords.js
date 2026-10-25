require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const seedAccounts = [
  ['admin@temarinet.et', 'SEED_ADMIN_PASSWORD'],
  ['teacher@temarinet.et', 'SEED_TEACHER_PASSWORD'],
  ['abebe@temarinet.et', 'SEED_ABEBE_PASSWORD'],
  ['hanna@temarinet.et', 'SEED_HANNA_PASSWORD'],
  ['dawit@temarinet.et', 'SEED_DAWIT_PASSWORD']
];

async function main() {
  const configured = seedAccounts.filter(([, variable]) => process.env[variable]);
  if (!configured.length) throw new Error('Set at least one SEED_*_PASSWORD variable before running this script.');
  for (const [email, variable] of configured) {
    const password = process.env[variable];
    if (password.length < 10 || password.length > 128 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
      throw new Error(`${variable} must be 10–128 characters and include a letter and a number.`);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email', [passwordHash, email]);
    if (!result.rowCount) throw new Error(`Seed account ${email} is missing. Apply database/init.sql first.`);
    console.log(`Password configured for ${email}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
