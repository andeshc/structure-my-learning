const { randomBytes } = require('crypto');
const { query, getOne } = require('./index');

const EXPIRY_HOURS = 24 * 7;

async function createVerificationToken(userId) {
  await query(
    `DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
  await query(
    `INSERT INTO email_verification_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  return token;
}

async function findVerificationToken(token) {
  return getOne(
    `SELECT * FROM email_verification_tokens WHERE token = $1`,
    [token]
  );
}

async function consumeVerificationToken(token) {
  await query(
    `UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
}

module.exports = { createVerificationToken, findVerificationToken, consumeVerificationToken };
