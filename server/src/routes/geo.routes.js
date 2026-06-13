const express = require('express');

const router = express.Router();

router.get('/geo', async (req, res) => {
  // Cloudflare sets CF-Connecting-IP to the real visitor IP — prefer it over
  // X-Forwarded-For which starts with the Cloudflare edge IP on Railway.
  const cfIp = req.headers['cf-connecting-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  const raw = cfIp || (forwarded ? forwarded.split(',')[0].trim() : req.ip);
  const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return res.json({ country: null });
  }

  try {
    const response = await fetch(`https://ip-api.com/json/${ip}?fields=countryCode,status`);
    const data = await response.json();
    res.json({ country: data.status === 'success' ? data.countryCode : null });
  } catch (err) {
    console.error('[geo] lookup failed:', err.message);
    res.json({ country: null });
  }
});

module.exports = router;
