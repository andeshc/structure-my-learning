const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'structure-my-learning' });
});

module.exports = router;
