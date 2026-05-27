const express = require('express');
const geoip = require('geoip-lite');

const router = express.Router();

router.get('/geo', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  // Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  const result = geoip.lookup(ip);
  res.json({ country: result?.country ?? null });
});

module.exports = router;
