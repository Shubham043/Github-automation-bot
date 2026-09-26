import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { config } from './config.js';
import { pool } from './db.js';
import { logger } from './utils/logger.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { setCsrfCookie, verifyCsrf } from './middleware/csrf.js';

import { authRouter } from './routes/auth.js';
import { reposRouter } from './routes/repos.js';
import { rulesRouter } from './routes/rules.js';
import { eventsRouter } from './routes/events.js';
import { webhooksRouter } from './routes/webhooks.js';
import { healthRouter } from './routes/health.js';

import { startRetryWorker, stopRetryWorker } from './services/retryQueue.js';

const app = express();
const PgSessionStore = connectPgSimple(session);

// Trust proxy for Render/Vercel reverse proxies
app.set('trust proxy', 1);

// 1. Security Headers
app.use(securityHeaders);

// 2. CORS configuration (allowing frontend domain with credentials)
app.use(
  cors({
    origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-XSRF-TOKEN', 'Authorization'],
  })
);

app.use(cookieParser());

// 3. Webhook raw body parser MUST be mounted BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

// 4. Standard body parsers for regular REST API
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Session store (connect-pg-simple with Supabase Postgres)
app.use(
  session({
    store: new PgSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    name: 'gitpulse_sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction, // HTTPS in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    },
  })
);

// 6. CSRF cookie generation and verification
app.use(setCsrfCookie);
app.use('/api', verifyCsrf);

// 7. General API rate limiter
app.use('/api', apiLimiter);

// 8. Mount REST API Routes
app.use('/api/auth', authRouter);
app.use('/api/repos', reposRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/health', healthRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error({ err, url: req.originalUrl }, 'Unhandled Express error');
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start HTTP Server
const server = app.listen(config.port, () => {
  logger.info(`🚀 GitHub Automation Bot Backend listening on http://localhost:${config.port}`);
  // Start background DLQ retry worker
  startRetryWorker(60000);
});

// Graceful Shutdown
function handleShutdown(signal) {
  logger.info({ signal }, 'Gracefully shutting down server...');
  stopRetryWorker();
  server.close(async () => {
    logger.info('HTTP server closed, closing database pool...');
    await pool.end();
    logger.info('Database pool closed, process exiting.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
