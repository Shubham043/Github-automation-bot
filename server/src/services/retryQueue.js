import { query } from '../db.js';
import { logger } from '../utils/logger.js';
import { addLabelToIssue, postIssueComment } from './githubApi.js';
import { sendSlackNotification } from './slackNotifier.js';

let intervalHandle = null;

/**
 * Executes a single failed action from the DLQ
 */
async function retryAction(item) {
  const payload = typeof item.action_payload === 'string' ? JSON.parse(item.action_payload) : item.action_payload;
  const { action, templateVars, issueOrPrNumber, repoId } = payload;

  const repoRes = await query(
    `SELECT r.full_name, u.access_token 
     FROM repositories r 
     JOIN users u ON r.user_id = u.id 
     WHERE r.id = $1`,
    [repoId]
  );

  if (repoRes.rows.length === 0) {
    throw new Error('Repository or user no longer exists');
  }

  const [owner, repoName] = repoRes.rows[0].full_name.split('/');
  const accessToken = repoRes.rows[0].access_token;

  if (item.action_type === 'add_label' && issueOrPrNumber) {
    await addLabelToIssue(accessToken, owner, repoName, issueOrPrNumber, action.label);
  } else if (item.action_type === 'post_comment' && issueOrPrNumber) {
    await postIssueComment(accessToken, owner, repoName, issueOrPrNumber, action.body);
  } else if (item.action_type === 'slack_notify') {
    await sendSlackNotification(action.webhook_url, {
      title: action.title || 'Notification (Retry)',
      text: action.message || action.message_template || 'Notification text',
    });
  }
}

/**
 * Periodically scans for DLQ items ready for retry
 */
export async function processDeadLetterQueue() {
  try {
    const res = await query(
      `SELECT * FROM dead_letter_queue
       WHERE retry_count < max_retries
         AND next_retry_at <= now()
       ORDER BY next_retry_at ASC
       LIMIT 10`
    );

    for (const item of res.rows) {
      logger.info({ dlqId: item.id, actionType: item.action_type, attempt: item.retry_count + 1 }, 'Retrying DLQ action');

      try {
        await retryAction(item);
        // If success, remove from DLQ
        await query('DELETE FROM dead_letter_queue WHERE id = $1', [item.id]);
        logger.info({ dlqId: item.id }, 'Successfully recovered DLQ action');
      } catch (retryErr) {
        const nextAttempt = item.retry_count + 1;
        // Exponential backoff: 1min -> 2min -> 4min
        const backoffMinutes = Math.pow(2, nextAttempt);

        logger.warn(
          { dlqId: item.id, error: retryErr.message, nextAttempt, backoffMinutes },
          'DLQ action retry failed again'
        );

        await query(
          `UPDATE dead_letter_queue
           SET retry_count = $1,
               next_retry_at = now() + ($2 || ' minutes')::interval,
               error_message = $3
           WHERE id = $4`,
          [nextAttempt, backoffMinutes, retryErr.message, item.id]
        );
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error checking dead letter queue');
  }
}

/**
 * Starts the in-process background worker
 */
export function startRetryWorker(intervalMs = 60000) {
  if (intervalHandle) return;
  logger.info({ intervalMs }, 'Starting Dead-Letter Queue retry worker');
  intervalHandle = setInterval(processDeadLetterQueue, intervalMs);
}

export function stopRetryWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
