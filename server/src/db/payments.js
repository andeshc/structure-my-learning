const { query, getOne, withTransaction } = require('./index'); // withTransaction used by webhookHandled

async function setUserPlan(userId, plan, client) {
  const q = client ? client.query.bind(client) : query;
  await q('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', [plan, userId]);
}

async function upsertSubscription({ id, userId, status, productId, currentPeriodEnd, customerId }, client) {
  const q = client ? client.query.bind(client) : query;
  await q(
    `INSERT INTO subscriptions (id, user_id, status, product_id, current_period_end, customer_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       customer_id = COALESCE(EXCLUDED.customer_id, subscriptions.customer_id),
       updated_at = NOW()`,
    [id, userId, status, productId, currentPeriodEnd || null, customerId || null]
  );
}

async function findSubscriptionByUserId(userId) {
  return getOne(
    `SELECT * FROM subscriptions WHERE user_id = $1
     ORDER BY (status = 'active') DESC, updated_at DESC LIMIT 1`,
    [userId]
  );
}

async function setSubscriptionStatus(id, status) {
  await query('UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
}

async function findSubscriptionById(id) {
  return getOne('SELECT * FROM subscriptions WHERE id = $1', [id]);
}

async function getSeatCount() {
  const row = await getOne('SELECT seats_sold FROM ltd_seat_counter WHERE id = 1');
  return row ? row.seats_sold : 0;
}

async function fulfillLtd(paymentId, userId, client) {
  const result = await client.query(
    'INSERT INTO ltd_purchases (id, user_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id',
    [paymentId, userId]
  );
  if (result.rows.length === 0) return { fresh: false };
  await setUserPlan(userId, 'ltd', client);
  await client.query('UPDATE ltd_seat_counter SET seats_sold = seats_sold + 1 WHERE id = 1');
  return { fresh: true };
}

async function webhookHandled(webhookId, eventType, fn) {
  return withTransaction(async (client) => {
    const insert = await client.query(
      'INSERT INTO webhook_events (id, event_type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id',
      [webhookId, eventType]
    );
    if (insert.rows.length === 0) return;
    await fn(client);
  });
}

module.exports = {
  setUserPlan,
  upsertSubscription,
  setSubscriptionStatus,
  findSubscriptionById,
  findSubscriptionByUserId,
  getSeatCount,
  fulfillLtd,
  webhookHandled,
};
