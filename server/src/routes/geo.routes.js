const express = require('express');

const router = express.Router();

router.get('/geo', async (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  // Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

  console.log('[geo] forwarded-for:', forwarded, '| resolved ip:', ip);

  // Loopback (local dev) — skip external lookup
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return res.json({ country: null });
  }

  try {
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=countryCode,status`);
    const data = await response.json();
    console.log('[geo] ip-api response:', data);
    res.json({ country: data.status === 'success' ? data.countryCode : null });
  } catch (err) {
    console.error('[geo] lookup failed:', err.message);
    res.json({ country: null });
  }
});

module.exports = router;
