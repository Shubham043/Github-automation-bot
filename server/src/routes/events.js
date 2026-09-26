import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';

export const eventsRouter = Router();

// All event routes require session auth
eventsRouter.use(requireAuth);

/**
 * Get aggregated stats for the user's dashboard
 */
eventsRouter.get('/stats', async (req, res) => {
  try {
    const statsRes = await query(
      `SELECT 
         COUNT(*) as total_events,
         COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_events,
         COUNT(CASE WHEN e.status = 'failed' THEN 1 END) as failed_events,
         COUNT(CASE WHEN e.status = 'processing' THEN 1 END) as processing_events,
         COUNT(DISTINCT r.id) as connected_repos,
         COUNT(DISTINCT ru.id) as active_rules
       FROM repositories r
       LEFT JOIN events e ON r.id = e.repo_id
       LEFT JOIN rules ru ON r.id = ru.repo_id AND ru.is_active = true
       WHERE r.user_id = $1`,
      [req.user.id]
    );

    const stats = statsRes.rows[0];
    res.json({
      total_events: parseInt(stats.total_events, 10) || 0,
      completed_events: parseInt(stats.completed_events, 10) || 0,
      failed_events: parseInt(stats.failed_events, 10) || 0,
      processing_events: parseInt(stats.processing_events, 10) || 0,
      connected_repos: parseInt(stats.connected_repos, 10) || 0,
      active_rules: parseInt(stats.active_rules, 10) || 0,
    });
  } catch (err) {
    logger.error({ err, userId: req.user.id }, 'Failed to fetch event stats');
    res.status(500).json({ error: 'Failed to fetch event stats' });
  }
});

/**
 * List paginated events for a specific repo or all user repos
 */
eventsRouter.get('/', async (req, res) => {
  const { repo_id, status, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    const conditions = ['r.user_id = $1'];
    const params = [req.user.id];
    let paramIndex = 2;

    if (repo_id) {
      conditions.push(`e.repo_id = $${paramIndex}`);
      params.push(repo_id);
      paramIndex++;
    }

    if (status) {
      conditions.push(`e.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countRes = await query(
      `SELECT COUNT(e.id) as total
       FROM events e
       JOIN repositories r ON e.repo_id = r.id
       WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countRes.rows[0].total, 10) || 0;

    // Data query
    const dataParams = [...params, limitNum, offset];
    const eventsRes = await query(
      `SELECT e.id, e.repo_id, r.full_name as repo_name, e.github_event_id, 
              e.event_type, e.action, e.payload_summary, e.status, 
              e.actions_taken, e.error_message, e.created_at, e.processed_at
       FROM events e
       JOIN repositories r ON e.repo_id = r.id
       WHERE ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams
    );

    res.json({
      events: eventsRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    logger.error({ err, userId: req.user.id }, 'Failed to fetch events');
    res.status(500).json({ error: 'Failed to retrieve event log' });
  }
});

/**
 * Get details of a single event
 */
eventsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT e.*, r.full_name as repo_name
       FROM events e
       JOIN repositories r ON e.repo_id = r.id
       WHERE e.id = $1 AND r.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (err) {
    logger.error({ err, eventId: id }, 'Failed to fetch event detail');
    res.status(500).json({ error: 'Failed to retrieve event detail' });
  }
});
