import dotenv from 'dotenv';
dotenv.config();

const requiredEnvs = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
];

if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvs) {
    if (!process.env[envVar]) {
      console.error(`FATAL: Missing required environment variable ${envVar}`);
      process.exit(1);
    }
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/github_bot',
  sessionSecret: process.env.SESSION_SECRET || 'dev_insecure_session_secret_replace_in_production_32chars',
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/callback',
    webhookAppUrl: process.env.BACKEND_PUBLIC_URL 
      ? `${process.env.BACKEND_PUBLIC_URL}/api/webhooks/github`
      : 'http://localhost:3001/api/webhooks/github',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
