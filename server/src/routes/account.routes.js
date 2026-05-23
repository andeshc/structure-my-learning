const bcrypt = require('bcrypt');
const express = require('express');
const { z } = require('zod');
const users = require('../db/users');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const REFERRAL_SOURCES = ['google','bing','twitter_x','linkedin','reddit','instagram','facebook','tiktok','youtube','blog','newsletter','podcast','friend','employer','school','product_hunt','other','existing'];

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    signupProvider: user.signupProvider,
    referralSource: user.referralSource,
    createdAt: user.createdAt,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    user: {
      ...publicUser(req.user),
      providers: await users.listProviders(req.user.id),
    },
  });
}));

const setupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  referralSource: z.enum(REFERRAL_SOURCES),
  referralSourceOther: z.string().trim().max(300).optional(),
  password: z.string().min(8).max(160).optional(),
});

router.patch('/setup', asyncHandler(async (req, res) => {
  const input = setupSchema.parse(req.body);
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;
  const updated = await users.updateUserSetup(req.user.id, {
    name: input.name,
    referralSource: input.referralSource,
    referralSourceOther: input.referralSource === 'other' ? input.referralSourceOther : null,
    passwordHash,
  });
  res.json({ user: publicUser(updated) });
}));

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(160).optional(),
});

router.patch('/', asyncHandler(async (req, res) => {
  const input = profileSchema.parse(req.body);

  let passwordHash = null;
  if (input.newPassword) {
    if (!input.currentPassword && req.user.passwordHash) {
      res.status(400).json({ error: 'Current password is required.' });
      return;
    }
    if (input.currentPassword) {
      const matches = await bcrypt.compare(input.currentPassword, req.user.passwordHash || '');
      if (!matches) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
    }
    passwordHash = await bcrypt.hash(input.newPassword, 12);
  }

  const updated = await users.updateUserProfile(req.user.id, {
    name: input.name,
    passwordHash,
  });
  res.json({ user: publicUser(updated) });
}));

module.exports = router;
