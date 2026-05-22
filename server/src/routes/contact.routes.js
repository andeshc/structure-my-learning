const express = require('express');
const { z } = require('zod');
const { Resend } = require('resend');
const { query } = require('../db/index');
const ids = require('../utils/ids');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(180),
  message: z.string().trim().min(10).max(2000),
});

router.post('/', asyncHandler(async (req, res) => {
  const input = contactSchema.parse(req.body);

  await query(
    `INSERT INTO contact_submissions (id, name, email, message) VALUES ($1, $2, $3, $4)`,
    [ids.contactId(), input.name, input.email, input.message]
  );

  if (config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      await resend.emails.send({
        from: config.contactFromEmail,
        to: config.contactEmail,
        subject: `Contact form: ${input.name}`,
        text: `Name: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
      });
    } catch (err) {
      console.error('Resend error:', err.message);
    }
  }

  res.json({ ok: true });
}));

module.exports = router;
