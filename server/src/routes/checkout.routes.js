const express = require('express');
const { z } = require('zod');
const { dodo } = require('../lib/dodo');
const payments = require('../db/payments');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');

const router = express.Router();

const checkoutSchema = z.object({
  plan: z.enum(['pro_monthly', 'pro_annual', 'ltd']),
  region: z.enum(['in', 'usd']),
});

router.post('/', asyncHandler(async (req, res) => {
  const { plan, region } = checkoutSchema.parse(req.body);

  if (plan === 'ltd') {
    const seats = await payments.getSeatCount();
    if (seats >= config.ltdSeatLimit) {
      return res.status(409).json({ error: 'Lifetime deal is sold out.', code: 'LTD_SOLD_OUT' });
    }
  }

  const productKey = `${plan}_${region}`;
  const productId = config.dodo.products[productKey];
  if (!productId) {
    return res.status(400).json({ error: `Product not configured: ${productKey}` });
  }

  const isInr = region === 'in';
const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: req.user.email, name: req.user.name },
    return_url: `${config.appUrl}/upgrade/return`,
    metadata: { user_id: req.user.id, plan: plan === 'ltd' ? 'ltd' : 'pro' },
    billing_currency: isInr ? 'INR' : 'USD',
    ...(isInr && { billing_address: { country: 'IN' } }),
    feature_flags: { allow_currency_selection: false },
  });

  res.json({ checkoutUrl: session.checkout_url });
}));

module.exports = router;
