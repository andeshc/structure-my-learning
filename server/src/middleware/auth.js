const users = require('../db/users');
const tokenService = require('../services/token.service');

function getBearerToken(req) {
  const header = req.get('authorization') || '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length);
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    const user = users.findUserById(payload.sub);

    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required.' });
  }
}

module.exports = { requireAuth };
