import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { config } from './config.js';
import { initializeDatabase } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp() {
  initializeDatabase();

  const app = express();

  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
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

  app.use('/api', healthRouter);
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
