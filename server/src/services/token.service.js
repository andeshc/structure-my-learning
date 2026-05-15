const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const refreshTokens = require('../db/refreshTokens');

function createAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
}

function createRefreshToken(user) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  refreshTokens.createRefreshToken({ userId: user.id, token, expiresAt });
  return token;
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/' });
}

function issueAuth(res, user) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  return accessToken;
}

module.exports = {
  clearRefreshCookie,
  createAccessToken,
  issueAuth,
  setRefreshCookie,
  verifyAccessToken,
};
