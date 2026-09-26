import { generateRandomToken } from '../utils/crypto.js';
import { config } from '../config.js';

/**
 * Ensures CSRF token exists in session and exposes it in a readable cookie for frontend fetch requests
 */
export function setCsrfCookie(req, res, next) {
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = generateRandomToken(32);
  }

  // Double Submit Cookie pattern:
  // Client reads this cookie and passes it back in 'X-CSRF-Token' header
  res.cookie('XSRF-TOKEN', req.session.csrfToken, {
    httpOnly: false, // Must be readable by client JS
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });

  next();
}

/**
 * Validates CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 */
export function verifyCsrf(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt webhooks from CSRF because webhooks authenticate via HMAC-SHA256 signature
  if (req.originalUrl.startsWith('/api/webhooks')) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!clientToken || !sessionToken || clientToken !== sessionToken) {
    return res.status(403).json({ error: 'CSRF token mismatch or missing' });
  }

  next();
}
