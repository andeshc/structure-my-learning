const config = require('../config');
const { ZodError } = require('zod');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (config.nodeEnv !== 'production') {
    console.error(err);
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request data.' });
    return;
  }

  const status = err.status || err.statusCode || 500;
  const message = err.expose || status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ error: message, ...(err.code && { code: err.code }) });
}

module.exports = errorHandler;
