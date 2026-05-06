const crypto = require('crypto');
const db = require('./index');
const ids = require('../utils/ids');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createRefreshToken({ userId, token, expiresAt }) {
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(ids.tokenId(), userId, hashToken(token), expiresAt);
}

function findActiveRefreshToken(token) {
  return db.prepare(`
    SELECT * FROM refresh_tokens
    WHERE token_hash = ?
      AND revoked_at IS NULL
      AND datetime(expires_at) > datetime('now')
  `).get(hashToken(token));
}

function revokeRefreshToken(token) {
  db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = datetime('now')
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(hashToken(token));
}

module.exports = {
  createRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
};
