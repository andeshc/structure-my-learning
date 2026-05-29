const ADMIN_EMAILS = new Set([
  'support@structuremylearning.com',
  'andeshc@gmail.com',
  'andeshc@outlook.com',
]);

function requireAdmin(req, res, next) {
  if (!ADMIN_EMAILS.has(req.user.email)) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }
  next();
}

module.exports = { requireAdmin };
