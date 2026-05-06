import { findUserById } from '../db/users.js';
import { verifyAccessToken } from '../services/token.service.js';

export function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    const error = new Error('Authentication required');
    error.status = 401;
    next(error);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = findUserById(payload.sub);

    if (!user) {
      const error = new Error('Authentication required');
      error.status = 401;
      next(error);
      return;
    }

    req.user = user;
    next();
  } catch {
    const error = new Error('Authentication required');
    error.status = 401;
    next(error);
  }
}
