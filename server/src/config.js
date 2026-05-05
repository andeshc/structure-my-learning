import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_PATH: z.string().default('./data/StructureMyLearning.db'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional()
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production') {
  const requiredInProduction = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL'
  ];
  const missing = requiredInProduction.filter((key) => !parsed[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const corsOrigins = parsed.CORS_ORIGINS
  ? parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [parsed.CLIENT_URL];

export const config = {
  ...parsed,
  corsOrigins,
  jwtSecret: parsed.JWT_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: parsed.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me'
};
