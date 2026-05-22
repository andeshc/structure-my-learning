const crypto = require('crypto');
const { query, getOne } = require('./index');
const ids = require('../utils/ids');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createRefreshToken({ userId, token, expiresAt }) {
  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [ids.tokenId(), userId, hashToken(token), expiresAt]
  );
}

async function findActiveRefreshToken(token) {
  return getOne(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hashToken(token)]
  );
}

async function revokeRefreshToken(token) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)]
  );
}

module.exports = {
  createRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
};
