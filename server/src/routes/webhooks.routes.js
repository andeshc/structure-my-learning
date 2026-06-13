const express = require('express');
const { Webhook } = require('svix');
const payments = require('../db/payments');
const config = require('../config');

const router = express.Router();

router.post('/', (req, res) => {
  const live = config.dodo.env === 'live_mode';
  const webhookKey = live ? config.dodo.webhookKeyLive : config.dodo.webhookKeyTest;
  let event;
  try {
    const wh = new Webhook(webhookKey);
    event = wh.verify(req.body, {
      'webhook-id':        req.headers['webhook-id'] || '',
      'webhook-signature': req.headers['webhook-signature'] || '',
      'webhook-timestamp': req.headers['webhook-timestamp'] || '',
    });
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  if (config.dodo.brandId && event.data?.brand_id !== config.dodo.brandId) {
    return res.json({ ok: true });
  }

  const webhookId = req.headers['webhook-id'];
  handleEvent(webhookId, event).catch((err) => {
    console.error('Webhook handler error:', err);
  });

  res.json({ ok: true });
});

async function handleEvent(webhookId, event) {
  const { type, data } = event;

  switch (type) {
    case 'payment.succeeded': {
      if (data.metadata?.plan !== 'ltd') break;
      const userId = data.metadata.user_id;
      await payments.webhookHandled(webhookId, type, async (client) => {
        await payments.fulfillLtd(data.payment_id, userId, client);
      });
      break;
    }

    case 'subscription.active':
    case 'subscription.renewed': {
      const userId = data.metadata?.user_id;
      if (!userId) break;
      await payments.webhookHandled(webhookId, type, async (client) => {
        await payments.setUserPlan(userId, 'pro', client);
        await payments.upsertSubscription({
          id: data.subscription_id,
          userId,
          status: 'active',
          productId: data.product_id,
          currentPeriodEnd: data.next_billing_date,
          customerId: data.customer?.customer_id,
        }, client);
      });
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.expired': {
      const status = type === 'subscription.cancelled' ? 'cancelled' : 'expired';
      await payments.webhookHandled(webhookId, type, async (client) => {
        await client.query(
          'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2',
          [status, data.subscription_id]
        );
        // End-of-period cancellations keep the user on pro until subscription.expired fires.
        // Only downgrade immediately for hard cancellations or when the period has expired.
        if (type === 'subscription.expired' || !data.cancel_at_next_billing_date) {
          const subResult = await client.query(
            'SELECT user_id FROM subscriptions WHERE id = $1',
            [data.subscription_id]
          );
          const userId = subResult.rows[0]?.user_id;
          if (userId) {
            const userResult = await client.query('SELECT plan FROM users WHERE id = $1', [userId]);
            if (userResult.rows[0]?.plan === 'pro') {
              await payments.setUserPlan(userId, 'free', client);
            }
          }
        }
      });
      break;
    }

    default:
      break;
  }
}

module.exports = router;
