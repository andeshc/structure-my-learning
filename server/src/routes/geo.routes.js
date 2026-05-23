const express = require('express');
const geoip = require('geoip-lite');

const router = express.Router();

router.get('/geo', (req, res) => {
  const result = geoip.lookup(req.ip);
  res.json({ country: result?.country ?? null });
});

module.exports = router;
