require('dotenv').config();

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_PATH'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  databasePath: process.env.DATABASE_PATH,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
  falKey: process.env.FAL_KEY || '',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/github/callback',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  aiRateLimitPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '200', 10),
  authRateLimitPer15Min: parseInt(process.env.AUTH_RATE_LIMIT_PER_15_MIN || '300', 10),
};
