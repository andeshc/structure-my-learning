import { ZodError } from 'zod';

export function notFoundHandler(_req, _res, next) {
  const error = new Error('Route not found');
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request data.' });
    return;
  }

  const status = error.status || 500;
  const message = status === 500 ? 'Something went wrong.' : error.message;

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(status).json({ error: message });
}
