import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';

export const rulesRouter = Router();

// All rule routes require session auth
rulesRouter.use(requireAuth);

/**
 * List rules for a specific repo or all user repos
 */
rulesRouter.get('/', async (req, res) => {
  const { repo_id } = req.query;

  try {
    let result;
    if (repo_id) {
      result = await query(
        `SELECT r.*, rep.full_name as repo_name 
         FROM rules r
         JOIN repositories rep ON r.repo_id = rep.id
         WHERE r.user_id = $1 AND r.repo_id = $2
         ORDER BY r.created_at DESC`,
        [req.user.id, repo_id]
      );
    } else {
      result = await query(
        `SELECT r.*, rep.full_name as repo_name 
         FROM rules r
         JOIN repositories rep ON r.repo_id = rep.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC`,
        [req.user.id]
      );
    }

    res.json({ rules: result.rows });
  } catch (err) {
    logger.error({ err, userId: req.user.id }, 'Failed to list rules');
    res.status(500).json({ error: 'Failed to retrieve rules' });
  }
});

/**
 * Create a new rule
 */
rulesRouter.post('/', async (req, res) => {
  const { repo_id, name, event_type, conditions, actions, is_active } = req.body;

  if (!repo_id || !name || !event_type) {
    return res.status(400).json({ error: 'Missing required fields (repo_id, name, event_type)' });
  }

  // Validate repo ownership
  const repoCheck = await query(
    'SELECT id FROM repositories WHERE id = $1 AND user_id = $2',
    [repo_id, req.user.id]
  );
  if (repoCheck.rows.length === 0) {
    return res.status(403).json({ error: 'You do not own this repository' });
  }

  try {
    const result = await query(
      `INSERT INTO rules (user_id, repo_id, name, event_type, conditions, actions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        repo_id,
        name,
        event_type,
        JSON.stringify(conditions || { match_all: [] }),
        JSON.stringify(actions || []),
        is_active !== undefined ? is_active : true,
      ]
    );

    logger.info({ ruleId: result.rows[0].id, name }, 'Rule created');
    res.status(201).json({ success: true, rule: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to create rule');
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * Update an existing rule
 */
rulesRouter.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, event_type, conditions, actions, is_active } = req.body;

  try {
    const result = await query(
      `UPDATE rules
       SET name = COALESCE($1, name),
           event_type = COALESCE($2, event_type),
           conditions = COALESCE($3, conditions),
           actions = COALESCE($4, actions),
           is_active = COALESCE($5, is_active),
           updated_at = now()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        name,
        event_type,
        conditions ? JSON.stringify(conditions) : null,
        actions ? JSON.stringify(actions) : null,
        is_active,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found or unauthorized' });
    }

    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    logger.error({ err, ruleId: id }, 'Failed to update rule');
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * Delete a rule
 */
rulesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM rules WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found or unauthorized' });
    }

    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    logger.error({ err, ruleId: id }, 'Failed to delete rule');
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});
