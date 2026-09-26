import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';
import { generateRandomToken } from '../utils/crypto.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

import crypto from 'crypto';

function createSignedState() {
  const random = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${random}:${timestamp}`;
  const sig = crypto.createHmac('sha256', config.sessionSecret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySignedState(stateString) {
  if (!stateString || typeof stateString !== 'string') return false;
  const parts = stateString.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const subparts = payload.split(':');
  if (subparts.length !== 2) return false;
  const [, timestamp] = subparts;
  
  // Check expiration (15 minutes)
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age < 0 || age > 15 * 60 * 1000) {
    return false;
  }
  
  const expectedSig = crypto.createHmac('sha256', config.sessionSecret).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Initiates GitHub OAuth flow
 */
authRouter.get('/github', authLimiter, (req, res) => {
  const state = createSignedState();
  req.session.oauthState = state;

  const scopes = ['read:user', 'user:email', 'repo', 'admin:repo_hook'].join(' ');
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.callbackUrl,
    scope: scopes,
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  req.session.save(() => {
    res.redirect(authUrl);
  });
});

/**
 * GitHub OAuth Callback endpoint
 */
authRouter.get('/callback', authLimiter, async (req, res) => {
  const { code, state } = req.query;

  // Validate state via HMAC signature and session match
  const isValidState = verifySignedState(state) || (state && state === req.session?.oauthState);
  if (!isValidState) {
    logger.warn({ state }, 'OAuth state verification failed');
    return res.status(400).send('OAuth state verification failed. Please try again.');
  }

  if (req.session) {
    delete req.session.oauthState;
  }

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      logger.error({ tokenData }, 'Failed to obtain access token from GitHub');
      return res.status(400).send(`GitHub OAuth error: ${tokenData.error_description || 'Unable to authenticate'}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Automation-Bot',
      },
    });

    if (!userRes.ok) {
      throw new Error(`GitHub user profile fetch failed: ${userRes.status}`);
    }

    const ghUser = await userRes.json();

    // 3. Upsert user in database
    const upsertRes = await query(
      `INSERT INTO users (github_id, github_login, avatar_url, access_token, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (github_id) 
       DO UPDATE SET 
         github_login = EXCLUDED.github_login,
         avatar_url = EXCLUDED.avatar_url,
         access_token = EXCLUDED.access_token,
         updated_at = now()
       RETURNING id, github_login, avatar_url`,
      [ghUser.id, ghUser.login, ghUser.avatar_url, accessToken]
    );

    const user = upsertRes.rows[0];

    // 4. Save user ID in session
    req.session.userId = user.id;

    logger.info({ githubLogin: user.github_login, userId: user.id }, 'User successfully authenticated');

    // Ensure session is saved to Supabase before browser redirects
    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error({ saveErr }, 'Failed to save session');
      }
      res.redirect(`${config.frontendUrl}/dashboard`);
    });
  } catch (err) {
    logger.error({ err }, 'Error handling GitHub OAuth callback');
    res.status(500).send('Authentication failed due to an internal error.');
  }
});

/**
 * Returns current authenticated user profile
 */
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    github_id: req.user.github_id,
    github_login: req.user.github_login,
    avatar_url: req.user.avatar_url,
  });
});

/**
 * Logs out user and destroys session
 */
authRouter.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Error destroying session during logout');
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('gitpulse_sid');
    res.clearCookie('__Host-sid');
    res.clearCookie('XSRF-TOKEN');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});
