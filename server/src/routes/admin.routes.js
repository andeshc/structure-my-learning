const express = require('express');
const { getAll, query } = require('../db');
const { ADMIN_EMAILS } = require('../middleware/admin');

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
      `SELECT g.id, g.user_id, g.title, g.learning_level, g.coverage, g.status, g.created_at,
              g.tokens_in, g.tokens_out, g.cost_usd,
              (SELECT COUNT(*)::int
                 FROM subtopics s
                 JOIN topics t ON t.id = s.topic_id
                 WHERE t.guide_id = g.id) AS subtopic_count,
              (SELECT COUNT(*)::int
                 FROM subtopics s
                 JOIN topics t ON t.id = s.topic_id
                 JOIN subtopic_progress sp ON sp.subtopic_id = s.id
                 WHERE t.guide_id = g.id
                   AND sp.user_id = g.user_id
                   AND sp.is_completed = true) AS completed_subtopic_count
       FROM guides g
       ORDER BY g.created_at DESC`
    );

    res.json({ users, guides });
  } catch (err) {
    next(err);
  }
});

// Permanently delete a user and all of their data (guides, progress, etc. cascade).
// Admin accounts cannot be deleted.
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const rows = await getAll('SELECT id, email FROM users WHERE id = $1', [req.params.userId]);
    const target = rows[0];
    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (ADMIN_EMAILS.has(target.email)) {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted.' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.params.userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
