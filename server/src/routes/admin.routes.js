const express = require('express');
const { getAll } = require('../db');

const router = express.Router();

router.get('/report', async (req, res, next) => {
  try {
    const users = await getAll(
      `SELECT
         u.id, u.name, u.email, u.email_verified, u.created_at,
         COUNT(g.id)::int AS guide_count
       FROM users u
       LEFT JOIN guides g ON g.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    const guides = await getAll(
      `SELECT id, user_id, title, learning_level, coverage, status, created_at
       FROM guides
       ORDER BY created_at DESC`
    );

    res.json({ users, guides });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
