const express = require('express');

const router = express.Router();

// Geo detection is handled client-side (ipapi.co) to avoid Railway internal IP issues.
// Kept as a stub so existing references don't 404.
router.get('/geo', (_req, res) => {
  res.json({ country: null });
});

module.exports = router;
