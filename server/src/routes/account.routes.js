const express = require('express');
const users = require('../db/users');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
      providers: await users.listProviders(req.user.id),
      createdAt: req.user.createdAt,
    },
  });
}));

module.exports = router;
