import { db } from './index.js';

export function createRefreshToken({ id, userId, tokenHash, expiresAt }) {
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (@id, @userId, @tokenHash, @expiresAt)`
  ).run({ id, userId, tokenHash, expiresAt });
}

export function findActiveRefreshToken(tokenHash) {
  return db.prepare(
    `SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt, revoked_at AS revokedAt
     FROM refresh_tokens
     WHERE token_hash = ? AND revoked_at IS NULL AND datetime(expires_at) > datetime('now')`
  ).get(tokenHash);
}

export function revokeRefreshToken(id) {
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked_at = datetime('now')
     WHERE id = ?`
  ).run(id);
}

export function revokeAllRefreshTokensForUser(userId) {
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked_at = datetime('now')
     WHERE user_id = ? AND revoked_at IS NULL`
  ).run(userId);
}
