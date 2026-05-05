import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { findActiveRefreshToken, revokeAllRefreshTokensForUser, revokeRefreshToken } from '../db/refreshTokens.js';
import { createUser, findUserByEmail, findUserById } from '../db/users.js';
import { requireAuth } from '../middleware/auth.js';
import { passport } from '../passport.js';
import {
  clearRefreshCookie,
  hashToken,
  issueRefreshToken,
  rotateRefreshToken,
  setRefreshCookie,
  signAccessToken
} from '../services/token.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createId } from '../utils/ids.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128)
});

function sendAuthResponse(res, user, status = 200) {
  const refreshToken = issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  res.status(status).json({
    user,
    accessToken: signAccessToken(user)
  });
}

authRouter.post('/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const existingUser = findUserByEmail(input.email);

  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = createUser({
    id: createId('usr'),
    name: input.name,
    email: input.email,
    passwordHash
  });

  sendAuthResponse(res, user, 201);
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = findUserByEmail(input.email);
  const validPassword = user?.passwordHash
    ? await bcrypt.compare(input.password, user.passwordHash)
    : false;

  if (!user || !validPassword) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  sendAuthResponse(res, publicUser);
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    const error = new Error('Refresh token required.');
    error.status = 401;
    throw error;
  }

  const storedToken = findActiveRefreshToken(hashToken(token));
  const user = storedToken ? findUserById(storedToken.userId) : null;

  if (!storedToken || !user) {
    clearRefreshCookie(res);
    const error = new Error('Refresh token is invalid.');
    error.status = 401;
    throw error;
  }

  const newRefreshToken = rotateRefreshToken(storedToken.id, user.id);
  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken: signAccessToken(user) });
}));

authRouter.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const storedToken = findActiveRefreshToken(hashToken(token));
    if (storedToken) {
      revokeRefreshToken(storedToken.id);
    }
  }

  clearRefreshCookie(res);
  res.json({ ok: true });
}));

authRouter.post('/logout-all', requireAuth, asyncHandler(async (req, res) => {
  revokeAllRefreshTokensForUser(req.user.id);
  clearRefreshCookie(res);
  res.json({ ok: true });
}));

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.get('/google', (req, res, next) => {
  if (!config.GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: 'Google OAuth is not configured.' });
    return;
  }

  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.CLIENT_URL}/login?oauth=failed` }),
  (req, res) => {
    const refreshToken = issueRefreshToken(req.user.id);
    setRefreshCookie(res, refreshToken);
    res.redirect(`${config.CLIENT_URL}/auth/callback?status=success`);
  }
);

authRouter.get('/github', (req, res, next) => {
  if (!config.GITHUB_CLIENT_ID) {
    res.status(503).json({ error: 'GitHub OAuth is not configured.' });
    return;
  }

  passport.authenticate('github', { session: false })(req, res, next);
});

authRouter.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${config.CLIENT_URL}/login?oauth=failed` }),
  (req, res) => {
    const refreshToken = issueRefreshToken(req.user.id);
    setRefreshCookie(res, refreshToken);
    res.redirect(`${config.CLIENT_URL}/auth/callback?status=success`);
  }
);
