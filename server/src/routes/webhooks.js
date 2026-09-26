import { Router } from 'express';
import { query } from '../db.js';
import { logger } from '../utils/logger.js';
import { verifyGitHubSignature } from '../utils/crypto.js';
import { processWebhookEvent } from '../services/eventProcessor.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';

export const webhooksRouter = Router();

/**
 * GitHub Webhook receiver endpoint
 * Note: express.raw({ type: 'application/json' }) middleware handles req.body for this route
 */
webhooksRouter.post('/github', webhookLimiter, async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const eventType = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];

  if (!deliveryId || !eventType) {
    logger.warn('Webhook request missing X-GitHub-Delivery or X-GitHub-Event headers');
    return res.status(400).json({ error: 'Missing required GitHub webhook headers' });
  }

  // Ping event handling (GitHub sends ping upon webhook creation)
  if (eventType === 'ping') {
    logger.info({ deliveryId }, 'Received GitHub ping event');
    return res.status(200).json({ message: 'Pong! Webhook successfully verified by server.' });
  }

  // Parse raw body buffer
  let rawBody;
  let payload;
  try {
    rawBody = req.body;
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (parseErr) {
    logger.error({ parseErr }, 'Failed to parse webhook JSON body');
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    logger.warn('Webhook payload missing repository.full_name');
    return res.status(400).json({ error: 'Repository information missing from payload' });
  }

  try {
    // 1. Fetch webhook secret for this specific repository
    const repoRes = await query(
      'SELECT id, webhook_secret, is_active FROM repositories WHERE full_name = $1',
      [repoFullName]
    );

    if (repoRes.rows.length === 0) {
      logger.warn({ repoFullName }, 'Webhook received for unregistered repository');
      return res.status(404).json({ error: 'Repository not registered in bot' });
    }

    const repo = repoRes.rows[0];
    if (!repo.is_active) {
      logger.info({ repoFullName }, 'Webhook received for inactive repository, skipping');
      return res.status(200).json({ message: 'Repository inactive, ignored.' });
    }

    // 2. Validate HMAC-SHA256 signature
    const isValidSignature = verifyGitHubSignature(rawBody, signature, repo.webhook_secret);
    if (!isValidSignature) {
      logger.warn({ repoFullName, deliveryId }, 'Invalid webhook HMAC signature! Possible forged request.');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    // 3. Extract lightweight summary for quick viewing in UI (no full megabyte bodies)
    const summary = {
      title: payload.issue?.title || payload.pull_request?.title || payload.head_commit?.message || 'N/A',
      author: payload.sender?.login || payload.issue?.user?.login || payload.pull_request?.user?.login || 'Unknown',
      action: payload.action || 'triggered',
      url: payload.issue?.html_url || payload.pull_request?.html_url || payload.compare || '',
      ref: payload.ref || null,
      number: payload.issue?.number || payload.pull_request?.number || null,
    };

    // 4. ATOMIC IDEMPOTENT INSERT
    // Uses deliveryId as unique idempotency key
    const insertRes = await query(
      `INSERT INTO events (repo_id, github_event_id, event_type, action, payload_summary, status, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, 'received', $6)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [repo.id, deliveryId, eventType, payload.action || null, JSON.stringify(summary), deliveryId]
    );

    if (insertRes.rows.length === 0) {
      logger.info({ deliveryId, repoFullName }, 'Idempotent duplicate event detected — skipped processing');
      return res.status(200).json({ message: 'Duplicate event already received and processed.' });
    }

    const eventId = insertRes.rows[0].id;
    logger.info({ eventId, deliveryId, eventType, repoFullName }, 'Webhook recorded, launching async worker');

    // 5. Fire asynchronous processor without blocking GitHub response (returns 200 within ms)
    setImmediate(() => {
      processWebhookEvent(eventId, repo.id, eventType, payload).catch((err) => {
        logger.error({ err, eventId }, 'Unhandled exception in background event processor');
      });
    });

    return res.status(200).json({ success: true, eventId, status: 'enqueued' });
  } catch (err) {
    logger.error({ err, repoFullName, deliveryId }, 'Unexpected error processing webhook');
    return res.status(500).json({ error: 'Internal server error while processing webhook' });
  }
});
