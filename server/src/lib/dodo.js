const config = require('../config');

const live = config.dodo.env === 'live_mode';
const apiKey = live ? config.dodo.apiKeyLive : config.dodo.apiKeyTest;
const webhookKey = live ? config.dodo.webhookKeyLive : config.dodo.webhookKeyTest;

// Handle both CJS and ESM-default exports
const _pkg = require('dodopayments');
const DodoPayments = _pkg.default || _pkg;

const dodo = new DodoPayments({
  bearerToken: apiKey,
  webhookKey,
  environment: config.dodo.env,
});

module.exports = { dodo };
