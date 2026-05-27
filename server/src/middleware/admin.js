const ADMIN_EMAIL = 'support@structuremylearning.com';

function requireAdmin(req, res, next) {
  if (req.user.email !== ADMIN_EMAIL) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }
  next();
}

module.exports = { requireAdmin };
