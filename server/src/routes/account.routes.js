const express = require('express');
const users = require('../db/users');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
      providers: users.listProviders(req.user.id),
      createdAt: req.user.createdAt,
    },
  });
});

module.exports = router;
