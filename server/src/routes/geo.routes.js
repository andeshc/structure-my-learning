const express = require('express');

const router = express.Router();

router.get('/geo', async (req, res) => {
  // Cloudflare sets CF-Connecting-IP to the real visitor IP.
  // Fall back to the last entry in X-Forwarded-For (rightmost = most recently
  // added by a trusted proxy, i.e. the real client before it hit Cloudflare).
  const cfIp = req.headers['cf-connecting-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedLast = forwarded ? forwarded.split(',').at(-1).trim() : null;
  const raw = cfIp || forwardedLast || req.ip;
  const ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

  console.log('[geo] cf-connecting-ip:', cfIp, '| forwarded-for:', forwarded, '| using ip:', ip);

  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return res.json({ country: null });
  }

  try {
    // ipinfo.io supports HTTPS on the free tier (50k req/month)
    const response = await fetch(`https://ipinfo.io/${ip}/country`);
    const text = (await response.text()).trim();
    console.log('[geo] ipinfo response:', text);
    res.json({ country: text.length === 2 ? text : null });
  } catch (err) {
    console.error('[geo] lookup failed:', err.message);
    res.json({ country: null });
  }
});

module.exports = router;
