const bcrypt = require('bcrypt');
const express = require('express');
const { z } = require('zod');
const passport = require('../passport');
const refreshTokens = require('../db/refreshTokens');
const users = require('../db/users');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const tokenService = require('../services/token.service');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(160),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(160),
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

function oauthUnavailable(_req, res) {
  res.status(503).json({ error: 'OAuth provider is not configured.' });
}

router.post('/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const existing = await users.findUserByEmail(input.email);

  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await users.createPasswordUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });
  const accessToken = tokenService.issueAuth(res, user);

  res.status(201).json({ user: publicUser(user), accessToken });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await users.findUserByEmail(input.email);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);

  if (!matches) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const accessToken = tokenService.issueAuth(res, user);
  res.json({ user: publicUser(user), accessToken });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    res.status(401).json({ error: 'Refresh token required.' });
    return;
  }

  const stored = await refreshTokens.findActiveRefreshToken(token);

  if (!stored) {
    res.status(401).json({ error: 'Invalid refresh token.' });
    return;
  }

  const user = await users.findUserById(stored.user_id);

  if (!user) {
    res.status(401).json({ error: 'Invalid refresh token.' });
    return;
  }

  await refreshTokens.revokeRefreshToken(token);
  const accessToken = tokenService.issueAuth(res, user);
  res.json({ accessToken, user: publicUser(user) });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  if (req.cookies.refreshToken) {
    await refreshTokens.revokeRefreshToken(req.cookies.refreshToken);
  }
  tokenService.clearRefreshCookie(res);
  res.json({ ok: true });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get('/google',
  config.google.clientId && config.google.clientSecret
    ? passport.authenticate('google', { scope: ['profile', 'email'], session: false })
    : oauthUnavailable
);

router.get('/google/callback',
  config.google.clientId && config.google.clientSecret
    ? passport.authenticate('google', { failureRedirect: `${config.appUrl}/login`, session: false })
    : oauthUnavailable,
  (req, res) => {
    tokenService.issueAuth(res, req.user);
    res.redirect(`${config.appUrl}/auth/callback?status=success`);
  }
);

router.get('/github',
  config.github.clientId && config.github.clientSecret
    ? passport.authenticate('github', { scope: ['user:email'], session: false })
    : oauthUnavailable
);

router.get('/github/callback',
  config.github.clientId && config.github.clientSecret
    ? passport.authenticate('github', { failureRedirect: `${config.appUrl}/login`, session: false })
    : oauthUnavailable,
  (req, res) => {
    tokenService.issueAuth(res, req.user);
    res.redirect(`${config.appUrl}/auth/callback?status=success`);
  }
);

module.exports = router;
