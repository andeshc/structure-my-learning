require('dotenv').config();

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL,
  databasePath: process.env.DATABASE_PATH || '',
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Single canonical frontend URL for OAuth redirects — first entry of CLIENT_URL
  appUrl: process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim(),
  aiProvider: process.env.AI_PROVIDER || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiGuideModel: process.env.OPENAI_GUIDE_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
  openaiContentModel: process.env.OPENAI_CONTENT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  anthropicGuideModel: process.env.ANTHROPIC_GUIDE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  anthropicContentModel: process.env.ANTHROPIC_CONTENT_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  novitaApiKey: process.env.NOVITA_API_KEY || '',
  novitaModel: process.env.NOVITA_MODEL || 'meta-llama/llama-3.1-8b-instruct',
  novitaGuideModel: process.env.NOVITA_GUIDE_MODEL || process.env.NOVITA_MODEL || 'meta-llama/llama-3.1-8b-instruct',
  novitaContentModel: process.env.NOVITA_CONTENT_MODEL || process.env.NOVITA_MODEL || 'meta-llama/llama-3.1-8b-instruct',
  novitaMaxTokens: parseInt(process.env.NOVITA_MAX_TOKENS || '4000', 10),
  togetherApiKey: process.env.TOGETHER_API_KEY || '',
  togetherModel: process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  togetherGuideModel: process.env.TOGETHER_GUIDE_MODEL || process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  togetherContentModel: process.env.TOGETHER_CONTENT_MODEL || process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  falKey: process.env.FAL_KEY || '',
  b2KeyId: process.env.B2_APPLICATION_KEY_ID || '',
  b2AppKey: process.env.B2_APPLICATION_KEY || '',
  b2BucketName: process.env.B2_BUCKET_NAME || '',
  b2BucketRegion: process.env.B2_BUCKET_REGION || 'us-west-004',
  cdnUrl: (process.env.CDN_URL || '').replace(/\/$/, ''),
  guideIllustrationModel: process.env.GUIDE_ILLUSTRATION_MODEL || 'xai/grok-imagine-image/quality/text-to-image',
  topicIllustrationModel: process.env.TOPIC_ILLUSTRATION_MODEL || 'fal-ai/nano-banana-2',
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
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    // Env vars encode newlines as \n — restore them for the PEM key
    privateKey: (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    callbackUrl: process.env.APPLE_CALLBACK_URL || 'https://localhost:3001/api/auth/apple/callback',
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3001/api/auth/facebook/callback',
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackUrl: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3001/api/auth/linkedin/callback',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    callbackUrl: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3001/api/auth/microsoft/callback',
  },
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  contactEmail: process.env.CONTACT_EMAIL || '',
  contactFromEmail: process.env.CONTACT_FROM_EMAIL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  aiRateLimitPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '200', 10),
  authRateLimitPer15Min: parseInt(process.env.AUTH_RATE_LIMIT_PER_15_MIN || '300', 10),
  ltdSeatLimit: parseInt(process.env.LTD_SEAT_LIMIT || '200', 10),
  freeGuideLimit: parseInt(process.env.FREE_GUIDE_LIMIT || '3', 10),
  dodo: {
    env: process.env.DODO_ENV || 'test_mode',
    brandId: process.env.DODO_BRAND_ID || '',
    apiKeyTest: process.env.DODO_API_KEY_TEST || '',
    apiKeyLive: process.env.DODO_API_KEY_LIVE || '',
    webhookKeyTest: process.env.DODO_WEBHOOK_KEY_TEST || '',
    webhookKeyLive: process.env.DODO_WEBHOOK_KEY_LIVE || '',
    products: {
      pro_monthly_in:  process.env.DODO_PROD_PRO_MONTHLY_IN || '',
      pro_annual_in:   process.env.DODO_PROD_PRO_ANNUAL_IN || '',
      pro_monthly_usd: process.env.DODO_PROD_PRO_MONTHLY_USD || '',
      pro_annual_usd:  process.env.DODO_PROD_PRO_ANNUAL_USD || '',
      ltd_in:          process.env.DODO_PROD_LTD_IN || '',
      ltd_usd:         process.env.DODO_PROD_LTD_USD || '',
    },
  },
};
