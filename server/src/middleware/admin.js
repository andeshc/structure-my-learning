const ADMIN_EMAILS = new Set([
  'support@structuremylearning.com',
  'andeshc@gmail.com',
  'andeshc@outlook.com',
]);

function isAdmin(email) {
  return ADMIN_EMAILS.has(email);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user.email)) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }
  next();
}

module.exports = { requireAdmin, isAdmin, ADMIN_EMAILS };
