const express = require('express');
const payments = require('../db/payments');
const config = require('../config');

const router = express.Router();

router.get('/ltd-status', async (_req, res) => {
  try {
    const seats_sold = await payments.getSeatCount();
    const seats_remaining = Math.max(0, config.ltdSeatLimit - seats_sold);
    res.json({ seats_sold, seats_remaining, sold_out: seats_sold >= config.ltdSeatLimit });
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve LTD status.' });
  }
});

module.exports = router;
