import { query } from '../db.js';

/**
 * Middleware ensuring user is authenticated via session
 */
export async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await query(
      'SELECT id, github_id, github_login, avatar_url, access_token FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found or session invalid' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal auth validation error' });
  }
}
