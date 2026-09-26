import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';
import { generateRandomToken } from '../utils/crypto.js';
import { config } from '../config.js';
import { listUserRepos, createRepoWebhook, deleteRepoWebhook } from '../services/githubApi.js';

export const reposRouter = Router();

// All repo routes require session auth
reposRouter.use(requireAuth);

/**
 * List repos currently connected to the bot for this user
 */
reposRouter.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id, r.github_repo_id, r.full_name, r.is_active, r.created_at,
              COUNT(DISTINCT ru.id) as rules_count,
              COUNT(DISTINCT e.id) as events_count
       FROM repositories r
       LEFT JOIN rules ru ON r.id = ru.repo_id AND ru.is_active = true
       LEFT JOIN events e ON r.id = e.repo_id
       WHERE r.user_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json({ repositories: result.rows });
  } catch (err) {
    logger.error({ err, userId: req.user.id }, 'Failed to list connected repos');
    res.status(500).json({ error: 'Failed to retrieve connected repositories' });
  }
});

/**
 * Fetch list of user repos directly from GitHub API
 */
reposRouter.get('/available', async (req, res) => {
  try {
    const allRepos = await listUserRepos(req.user.access_token);
    
    // Get already connected repo IDs
    const connectedRes = await query(
      'SELECT github_repo_id FROM repositories WHERE user_id = $1',
      [req.user.id]
    );
    const connectedIds = new Set(connectedRes.rows.map(r => String(r.github_repo_id)));

    const available = allRepos.map(repo => ({
      ...repo,
      is_connected: connectedIds.has(String(repo.id)),
    }));

    res.json({ repositories: available });
  } catch (err) {
    logger.error({ err, userId: req.user.id }, 'Failed to fetch GitHub repos');
    res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
  }
});

/**
 * Connect a repository: Auto-creates webhook on GitHub and registers in database
 */
reposRouter.post('/connect', async (req, res) => {
  const { full_name, github_repo_id } = req.body;

  if (!full_name || !github_repo_id) {
    return res.status(400).json({ error: 'Missing full_name or github_repo_id' });
  }

  const [owner, repo] = full_name.split('/');
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Invalid repository name format' });
  }

  try {
    // Generate unique per-repo webhook secret
    const webhookSecret = generateRandomToken(32);
    const webhookUrl = config.github.webhookAppUrl;

    // 1. Create webhook on GitHub
    const hook = await createRepoWebhook(
      req.user.access_token,
      owner,
      repo,
      webhookUrl,
      webhookSecret
    );

    // 2. Insert into DB
    const dbRes = await query(
      `INSERT INTO repositories (user_id, github_repo_id, full_name, webhook_id, webhook_secret, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (user_id, github_repo_id)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         webhook_id = EXCLUDED.webhook_id,
         webhook_secret = EXCLUDED.webhook_secret,
         is_active = true
       RETURNING id, full_name, is_active, created_at`,
      [req.user.id, github_repo_id, full_name, hook.id, webhookSecret]
    );

    // 3. Seed default beginner automation rule for instant testability
    const connectedRepo = dbRes.rows[0];
    await query(
      `INSERT INTO rules (user_id, repo_id, name, event_type, conditions, actions, is_active)
       VALUES 
       ($1, $2, 'Auto-label Bug Issues', 'issues', 
        '{"match_all": [{"field": "action", "operator": "equals", "value": "opened"}, {"field": "title", "operator": "contains", "value": "bug"}]}',
        '[{"type": "add_label", "label": "bug", "color": "d73a4a"}, {"type": "post_comment", "body": "🤖 **GitHub Automation Bot**: This issue has been flagged as a bug and labeled accordingly."}, {"type": "slack_notify", "title": "🐛 New Bug Opened", "message": "Issue *#{{title}}* was opened by @{{author}}"}]',
        true),
       ($1, $2, 'AI PR Summarizer & Review Alert', 'pull_request',
        '{"match_all": [{"field": "action", "operator": "equals", "value": "opened"}]}',
        '[{"type": "ai_triage", "apply_suggested_labels": true, "post_ai_comment": true}, {"type": "slack_notify", "title": "🚀 New PR Opened", "message": "PR *{{title}}* opened by @{{author}} (<{{url}}|Review PR>)"}]',
        true)
       ON CONFLICT DO NOTHING`,
      [req.user.id, connectedRepo.id]
    );

    logger.info({ repo: full_name, webhookId: hook.id }, 'Repository connected and webhook registered');
    res.status(201).json({ success: true, repository: connectedRepo });
  } catch (err) {
    logger.error({ err, full_name }, 'Failed to connect repository');
    res.status(500).json({ error: `Failed to connect repository: ${err.message}` });
  }
});

/**
 * Disconnect a repository: Removes webhook from GitHub and marks inactive in DB
 */
reposRouter.post('/:id/disconnect', async (req, res) => {
  const { id } = req.params;

  try {
    const repoRes = await query(
      'SELECT * FROM repositories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (repoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const repo = repoRes.rows[0];
    const [owner, repoName] = repo.full_name.split('/');

    if (repo.webhook_id) {
      await deleteRepoWebhook(req.user.access_token, owner, repoName, repo.webhook_id);
    }

    await query('DELETE FROM repositories WHERE id = $1', [id]);

    logger.info({ repoId: id, full_name: repo.full_name }, 'Repository disconnected');
    res.json({ success: true, message: 'Repository disconnected successfully' });
  } catch (err) {
    logger.error({ err, repoId: id }, 'Failed to disconnect repository');
    res.status(500).json({ error: 'Failed to disconnect repository' });
  }
});
