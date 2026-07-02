const bcrypt = require('bcrypt');
const express = require('express');
const { z } = require('zod');
const passport = require('../passport');
const refreshTokens = require('../db/refreshTokens');
const users = require('../db/users');
const emailVerification = require('../db/emailVerification');
const emailService = require('../services/email.service');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const tokenService = require('../services/token.service');

const router = express.Router();

const REFERRAL_SOURCES = ['google','bing','twitter_x','linkedin','reddit','instagram','facebook','tiktok','youtube','blog','newsletter','podcast','friend','employer','school','product_hunt','other'];

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(160),
  referralSource: z.enum(REFERRAL_SOURCES),
  referralSourceOther: z.string().trim().max(300).optional(),
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
    emailVerified: user.emailVerified,
    signupProvider: user.signupProvider,
    referralSource: user.referralSource,
    plan: user.plan,
    createdAt: user.createdAt,
  };
}

function oauthUnavailable(_req, res) {
  res.status(503).json({ error: 'OAuth provider is not configured.' });
}

// Only allow relative in-app paths through the OAuth round trip — never an
// absolute/protocol-relative URL, which would turn this into an open redirect.
function safeNextPath(value) {
  if (typeof value !== 'string' || !value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

// Threads `?next=` through the OAuth provider round trip via the standard
// `state` param, since passport.authenticate's options are otherwise fixed
// at route-registration time and can't see the per-request query string.
function oauthStart(provider, options) {
  return (req, res, next) => {
    const state = safeNextPath(req.query.next) || undefined;
    passport.authenticate(provider, { ...options, session: false, state })(req, res, next);
  };
}

function oauthCallback(provider) {
  return (req, res, next) => {
    passport.authenticate(provider, { failureRedirect: `${config.appUrl}/login`, session: false })(req, res, next);
  };
}

function redirectAfterOAuth(req, res) {
  // Apple posts the callback as form-encoded (state lands in the body); every
  // other provider redirects with a GET and puts it in the query string.
  const nextPath = safeNextPath(req.query.state || req.body?.state);
  const suffix = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
  res.redirect(`${config.appUrl}/auth/callback?status=success${suffix}`);
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
    referralSource: input.referralSource,
    referralSourceOther: input.referralSource === 'other' ? input.referralSourceOther : undefined,
  });

  const token = await emailVerification.createVerificationToken(user.id);
  await emailService.sendVerificationEmail(user.email, user.name, token);

  res.status(201).json({ pendingVerification: true });
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

  if (!user.emailVerified) {
    res.status(403).json({ error: 'Please verify your email address before logging in.', code: 'EMAIL_NOT_VERIFIED' });
    return;
  }

  const accessToken = await tokenService.issueAuth(res, user);
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
  const accessToken = await tokenService.issueAuth(res, user);
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

router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = z.object({ token: z.string().min(1) }).parse(req.body);

  const record = await emailVerification.findVerificationToken(token);
  if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
    res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    return;
  }

  await emailVerification.consumeVerificationToken(token);
  await users.markUserVerified(record.user_id);

  const user = await users.findUserById(record.user_id);
  const accessToken = await tokenService.issueAuth(res, user);
  res.json({ user: publicUser(user), accessToken });
}));

router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);

  const user = await users.findUserByEmail(email);
  if (user && !user.emailVerified) {
    const token = await emailVerification.createVerificationToken(user.id);
    await emailService.sendVerificationEmail(user.email, user.name, token);
  }
  // Always return ok to avoid email enumeration
  res.json({ ok: true });
}));

router.get('/google',
  config.google.clientId && config.google.clientSecret
    ? oauthStart('google', { scope: ['profile', 'email'] })
    : oauthUnavailable
);

router.get('/google/callback',
  config.google.clientId && config.google.clientSecret
    ? oauthCallback('google')
    : oauthUnavailable,
  async (req, res) => {
    await tokenService.issueAuth(res, req.user);
    redirectAfterOAuth(req, res);
  }
);

router.get('/github',
  config.github.clientId && config.github.clientSecret
    ? oauthStart('github', { scope: ['user:email'] })
    : oauthUnavailable
);

router.get('/github/callback',
  config.github.clientId && config.github.clientSecret
    ? oauthCallback('github')
    : oauthUnavailable,
  async (req, res) => {
    await tokenService.issueAuth(res, req.user);
    redirectAfterOAuth(req, res);
  }
);

router.get('/apple',
  config.apple.clientId
    ? oauthStart('apple', {})
    : oauthUnavailable
);

// Apple sends the callback as a POST with form-encoded body
router.post('/apple/callback',
  config.apple.clientId
    ? oauthCallback('apple')
    : oauthUnavailable,
  async (req, res) => {
    await tokenService.issueAuth(res, req.user);
    redirectAfterOAuth(req, res);
  }
);

router.get('/facebook',
  config.facebook.clientId && config.facebook.clientSecret
    ? oauthStart('facebook', { scope: ['email'] })
    : oauthUnavailable
);

router.get('/facebook/callback',
  config.facebook.clientId && config.facebook.clientSecret
    ? oauthCallback('facebook')
    : oauthUnavailable,
  async (req, res) => {
    await tokenService.issueAuth(res, req.user);
    redirectAfterOAuth(req, res);
  }
);

router.get('/linkedin',
  config.linkedin.clientId && config.linkedin.clientSecret
    ? oauthStart('linkedin', {})
    : oauthUnavailable
);

router.get('/linkedin/callback',
  config.linkedin.clientId && config.linkedin.clientSecret
    ? oauthCallback('linkedin')
    : oauthUnavailable,
  async (req, res) => {
    await tokenService.issueAuth(res, req.user);
    redirectAfterOAuth(req, res);
  }
);

router.get('/microsoft',
  config.microsoft.clientId && config.microsoft.clientSecret
    ? oauthStart('microsoft', {})
    : oauthUnavailable
);

router.get('/microsoft/callback',
  config.microsoft.clientId && config.microsoft.clientSecret
    ? oauthCallback('microsoft')
    : oauthUnavailable,
  async (req, res) => {
    await tokenService.issueAuth(res, req.user);
    redirectAfterOAuth(req, res);
  }
);

module.exports = router;
