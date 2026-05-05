import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { createRefreshToken, revokeRefreshToken } from '../db/refreshTokens.js';
import { createId } from '../utils/ids.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.accessTokenTtl
  });
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000).toISOString();

  createRefreshToken({
    id: createId('rft'),
    userId,
    tokenHash: hashToken(token),
    expiresAt
  });

  return token;
}

export function rotateRefreshToken(existingTokenId, userId) {
  revokeRefreshToken(existingTokenId);
  return issueRefreshToken(userId);
}

export function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
    path: '/api/auth'
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/api/auth'
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
