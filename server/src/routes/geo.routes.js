const express = require('express');

const router = express.Router();

router.get('/geo', async (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  // Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

  // Loopback / private IPs (local dev) — skip external lookup
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return res.json({ country: null });
  }

  try {
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await response.json();
    res.json({ country: data.countryCode ?? null });
  } catch {
    res.json({ country: null });
  }
});

module.exports = router;
