const { Pool, types } = require('pg');
const config = require('../config');

types.setTypeParser(types.builtins.TIMESTAMPTZ, (v) => v);
types.setTypeParser(types.builtins.TIMESTAMP, (v) => v);

const pool = new Pool({ connectionString: config.databaseUrl });

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function getOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] ?? null;
}

async function getAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Hard guard for destructive test helpers (resetDatabase, etc.). Throws unless we
// are unambiguously running against the dedicated test database, so a misconfigured
// environment can never wipe real data.
function assertTestDatabase() {
  if (config.nodeEnv !== 'test') {
    throw new Error('Refusing destructive DB reset: NODE_ENV is not "test".');
  }
  if (!config.testDatabaseUrl || config.databaseUrl !== config.testDatabaseUrl) {
    throw new Error('Refusing destructive DB reset: not connected to TEST_DATABASE_URL.');
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, getOne, getAll, withTransaction, assertTestDatabase };
