# Dodo Payments Integration Plan

Stack: Express + SQLite + React/Vite

---

## 1. Dashboard Setup

**Test mode**
1. Sign in at dodopayments.com → toggle **Test Mode** (top-right)
2. **Settings → API Keys** → copy test `Bearer` key → save as `DODO_API_KEY_TEST`
3. **Settings → Webhooks** → Add endpoint: `https://<your-tunnel>/api/webhooks/dodo` (use ngrok locally) → copy webhook secret → save as `DODO_WEBHOOK_KEY_TEST`

**Live mode**
- Same steps after toggling to **Live Mode** → `DODO_API_KEY_LIVE` / `DODO_WEBHOOK_KEY_LIVE`

**`.env`:**
```
DODO_ENV=test_mode          # flip to live_mode at launch
DODO_API_KEY_TEST=sk_test_...
DODO_WEBHOOK_KEY_TEST=whsec_...
DODO_API_KEY_LIVE=sk_live_...
DODO_WEBHOOK_KEY_LIVE=whsec_...
```

**`server/lib/dodo.js` — single place to swap modes:**
```js
import DodoPayments from 'dodopayments';

const env = process.env.DODO_ENV || 'test_mode';
const apiKey = env === 'live_mode'
  ? process.env.DODO_API_KEY_LIVE
  : process.env.DODO_API_KEY_TEST;
const webhookKey = env === 'live_mode'
  ? process.env.DODO_WEBHOOK_KEY_LIVE
  : process.env.DODO_WEBHOOK_KEY_TEST;

export const dodo = new DodoPayments({ bearerToken: apiKey, environment: env });
export { webhookKey };
```

---

## 2. Products to Create in Dashboard

Create in **both test and live modes**. Note the product IDs.

| Product | Type | Price |
|---|---|---|
| Pro Monthly India | Subscription | ₹399/mo |
| Pro Annual India | Subscription | ₹299/mo (billed ₹3,588/yr) |
| Pro Monthly Intl | Subscription | $12/mo |
| Pro Annual Intl | Subscription | $9/mo (billed $108/yr) |
| Lifetime India | One-time | ₹5,999 |
| Lifetime Intl | One-time | $149 |

Save all IDs in `.env`:
```
DODO_PROD_PRO_MONTHLY_IN=prod_...
DODO_PROD_PRO_ANNUAL_IN=prod_...
DODO_PROD_PRO_MONTHLY_USD=prod_...
DODO_PROD_PRO_ANNUAL_USD=prod_...
DODO_PROD_LTD_IN=prod_...
DODO_PROD_LTD_USD=prod_...
```

---

## 3. Database Schema

```sql
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
-- 'free' | 'pro' | 'ltd'

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,              -- dodo subscription_id
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,             -- active | cancelled | expired
  product_id TEXT NOT NULL,
  current_period_end INTEGER,       -- unix timestamp
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE ltd_purchases (
  id TEXT PRIMARY KEY,              -- dodo payment_id
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE ltd_seat_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
  seats_sold INTEGER NOT NULL DEFAULT 0
);

INSERT INTO ltd_seat_counter (id, seats_sold) VALUES (1, 0);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,              -- webhook-id header (idempotency)
  event_type TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);
```

---

## 4. Checkout Endpoint

**`server/routes/checkout.js`**

```js
import { Router } from 'express';
import { dodo } from '../lib/dodo.js';
import db from '../lib/db.js';

const router = Router();
const LTD_SEAT_LIMIT = 200;

function resolveProductId(plan, region) {
  const map = {
    pro_monthly_in:  process.env.DODO_PROD_PRO_MONTHLY_IN,
    pro_annual_in:   process.env.DODO_PROD_PRO_ANNUAL_IN,
    pro_monthly_usd: process.env.DODO_PROD_PRO_MONTHLY_USD,
    pro_annual_usd:  process.env.DODO_PROD_PRO_ANNUAL_USD,
    ltd_in:          process.env.DODO_PROD_LTD_IN,
    ltd_usd:         process.env.DODO_PROD_LTD_USD,
  };
  return map[`${plan}_${region}`];
}

// POST /api/checkout  { plan: 'pro_monthly'|'pro_annual'|'ltd', region: 'in'|'usd' }
router.post('/', requireAuth, async (req, res) => {
  const { plan, region } = req.body;

  if (plan === 'ltd') {
    const { seats_sold } = db.prepare('SELECT seats_sold FROM ltd_seat_counter WHERE id = 1').get();
    if (seats_sold >= LTD_SEAT_LIMIT) {
      return res.status(409).json({ error: 'LTD seats sold out' });
    }
  }

  const productId = resolveProductId(plan, region);
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: req.user.email, name: req.user.name },
    return_url: `${process.env.APP_URL}/checkout/success`,
    metadata: { user_id: String(req.user.id), plan },
  });

  res.json({ checkout_url: session.checkout_url });
});

export default router;
```

**Frontend redirect:**
```js
const { checkout_url } = await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({ plan: 'ltd', region: 'usd' }),
  headers: { 'Content-Type': 'application/json' },
}).then(r => r.json());

window.location.href = checkout_url;
```

---

## 5. Webhook Handler

**`server/routes/webhooks.js`**

> Register this router BEFORE `express.json()` in `server/index.js` so the raw body is preserved for signature verification.

```js
import { Router } from 'express';
import express from 'express';
import { dodo, webhookKey } from '../lib/dodo.js';
import db from '../lib/db.js';

const router = Router();

router.post('/dodo', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = dodo.webhooks.unwrap(req.body, {
      'webhook-id':        req.headers['webhook-id'] ?? '',
      'webhook-signature': req.headers['webhook-signature'] ?? '',
      'webhook-timestamp': req.headers['webhook-timestamp'] ?? '',
    }, webhookKey);
  } catch {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const webhookId = req.headers['webhook-id'];

  // Idempotency guard
  const already = db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(webhookId);
  if (already) return res.json({ ok: true });
  db.prepare('INSERT INTO webhook_events (id, event_type) VALUES (?, ?)').run(webhookId, event.type);

  handleEvent(event);
  res.json({ ok: true });
});

function handleEvent(event) {
  const { type, data } = event;

  switch (type) {
    case 'payment.succeeded': {
      if (data.metadata?.plan === 'ltd') {
        const userId = parseInt(data.metadata.user_id);
        db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('ltd', userId);
        db.prepare('INSERT OR IGNORE INTO ltd_purchases (id, user_id) VALUES (?, ?)').run(data.payment_id, userId);
        db.prepare('UPDATE ltd_seat_counter SET seats_sold = seats_sold + 1 WHERE id = 1').run();
      }
      break;
    }
    case 'subscription.active': {
      const userId = parseInt(data.metadata.user_id);
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('pro', userId);
      db.prepare(`
        INSERT INTO subscriptions (id, user_id, status, product_id, current_period_end)
        VALUES (?, ?, 'active', ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = 'active', current_period_end = excluded.current_period_end
      `).run(data.subscription_id, userId, data.product_id, data.current_period_end);
      break;
    }
    case 'subscription.renewed': {
      db.prepare(`
        UPDATE subscriptions SET status = 'active', current_period_end = ? WHERE id = ?
      `).run(data.current_period_end, data.subscription_id);
      break;
    }
    case 'subscription.cancelled':
    case 'subscription.expired': {
      db.prepare('UPDATE subscriptions SET status = ? WHERE id = ?').run(
        type === 'subscription.cancelled' ? 'cancelled' : 'expired',
        data.subscription_id
      );
      const sub = db.prepare('SELECT user_id FROM subscriptions WHERE id = ?').get(data.subscription_id);
      if (sub) {
        const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(sub.user_id);
        if (user?.plan === 'pro') {
          db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('free', sub.user_id);
        }
      }
      break;
    }
  }
}

export default router;
```

---

## 6. LTD Seat Availability Endpoint

```js
// GET /api/ltd-status
router.get('/ltd-status', (req, res) => {
  const { seats_sold } = db.prepare('SELECT seats_sold FROM ltd_seat_counter WHERE id = 1').get();
  res.json({
    seats_sold,
    seats_remaining: Math.max(0, 200 - seats_sold),
    sold_out: seats_sold >= 200,
  });
});
```

Poll once on page load in the pricing page; disable/hide the LTD card when `sold_out: true`.

---

## 7. Plan Enforcement Middleware

```js
function requirePlan(...plans) {
  return (req, res, next) => {
    if (plans.includes(req.user.plan)) return next();
    res.status(403).json({ error: 'Upgrade required' });
  };
}

// Free-tier guide cap (3 guides lifetime)
router.post('/guides', requireAuth, async (req, res) => {
  if (req.user.plan === 'free') {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM guides WHERE user_id = ?').get(req.user.id);
    if (count >= 3) return res.status(403).json({ error: 'Free tier limit reached', code: 'UPGRADE_REQUIRED' });
  }
  // ... create guide
});
```

---

## 8. Test → Live Checklist

- [ ] Re-create all 6 products in live mode dashboard, update `.env` product IDs
- [ ] Register live webhook endpoint URL (deployed domain, not ngrok)
- [ ] Set live API key and webhook secret in production environment variables
- [ ] Do a real ₹1 / $1 test purchase in live mode to confirm webhook fires end-to-end
- [ ] Verify `ltd_seat_counter` starts at 0 in production DB
- [ ] Confirm `APP_URL` env var points to production domain for `return_url`

---

## Webhook Event Reference

| Event | Action |
|---|---|
| `payment.succeeded` + plan=ltd | Upgrade user → `ltd`, increment seat counter |
| `subscription.active` | Upgrade user → `pro`, upsert subscription row |
| `subscription.renewed` | Update `current_period_end`, keep `pro` |
| `subscription.cancelled` | Mark cancelled, downgrade to `free` |
| `subscription.expired` | Mark expired, downgrade to `free` |

**LTD safety:** the `plan` column stays `ltd` forever. Cancellation events only downgrade if `plan === 'pro'`, so LTD holders are never accidentally downgraded.
