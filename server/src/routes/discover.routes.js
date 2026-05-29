const express = require('express');
const guidesDb = require('../db/guides');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 24, 48);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const guides = await guidesDb.listPublicGuides(req.user.id, limit, offset);
  res.json({ guides });
}));

module.exports = router;
