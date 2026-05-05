import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import morgan from 'morgan';
import { config } from './config.js';
import { initializeDatabase } from './db/index.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { passport } from './passport.js';
import { accountRouter } from './routes/account.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp() {
  initializeDatabase();

  const app = express();

  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    })
  );
  app.use(passport.initialize());

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/account', requireAuth, accountRouter);
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
