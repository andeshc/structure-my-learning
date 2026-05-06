const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (config.nodeEnv === 'development') {
    console.error(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.expose || status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
