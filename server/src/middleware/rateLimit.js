const rateLimit = require('express-rate-limit');
const config = require('../config');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimitPer15Min,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again shortly.' },
});

const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.aiRateLimitPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation requests. Please try again later.' },
});

module.exports = {
  aiRateLimit,
  authRateLimit,
};
