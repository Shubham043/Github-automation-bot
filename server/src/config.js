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
  databaseUrl: (process.env.DATABASE_URL || '').trim(),
  sessionSecret: (process.env.SESSION_SECRET || 'dev_insecure_session_secret_replace_in_production_32chars').trim(),
  github: {
    clientId: (process.env.GITHUB_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GITHUB_CLIENT_SECRET || '').trim(),
    callbackUrl: (process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/callback')
      .trim()
      .replace(/([^:])\/\/+/g, '$1/'),
    webhookAppUrl: process.env.BACKEND_PUBLIC_URL 
      ? `${process.env.BACKEND_PUBLIC_URL.trim().replace(/\/+$/, '')}/api/webhooks/github`
      : 'http://localhost:3001/api/webhooks/github',
  },
  slack: {
    webhookUrl: (process.env.SLACK_WEBHOOK_URL || '').trim(),
  },
  gemini: {
    apiKey: (process.env.GEMINI_API_KEY || '').trim(),
  },
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .trim()
    .replace(/\/+$/, ''),
};
