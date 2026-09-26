import { query } from '../db.js';
import { logger } from '../utils/logger.js';
import { addLabelToIssue, postIssueComment } from './githubApi.js';
import { sendSlackNotification } from './slackNotifier.js';
import { triageContent } from './aiTriage.js';

/**
 * Extracts nested fields from event payload
 */
function getFieldValue(payload, fieldPath) {
  if (!fieldPath) return undefined;
  
  // Standard mapped fields
  if (fieldPath === 'title') {
    return payload.issue?.title || payload.pull_request?.title || payload.head_commit?.message;
  }
  if (fieldPath === 'body') {
    return payload.issue?.body || payload.pull_request?.body || payload.head_commit?.message;
  }
  if (fieldPath === 'author') {
    return payload.sender?.login || payload.issue?.user?.login || payload.pull_request?.user?.login;
  }
  if (fieldPath === 'action') {
    return payload.action;
  }
  if (fieldPath === 'branch') {
    return payload.ref?.replace('refs/heads/', '') || payload.pull_request?.base?.ref;
  }

  // Fallback to dot-notation lookup
  return fieldPath.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), payload);
}

/**
 * Evaluates rule conditions safely against webhook payload
 */
export function evaluateConditions(conditions, payload) {
  if (!conditions) return true;
  const matchAll = Array.isArray(conditions.match_all) ? conditions.match_all : [];
  const matchAny = Array.isArray(conditions.match_any) ? conditions.match_any : [];

  if (matchAll.length === 0 && matchAny.length === 0) {
    return true; // Match all events if no conditions specified
  }

  const checkCondition = (cond) => {
    const val = getFieldValue(payload, cond.field);
    const target = cond.value;

    if (val === undefined || val === null) {
      return cond.operator === 'not_equals' || cond.operator === 'not_contains';
    }

    const strVal = String(val).toLowerCase();
    const strTarget = String(target).toLowerCase();

    switch (cond.operator) {
      case 'equals':
        return strVal === strTarget;
      case 'not_equals':
        return strVal !== strTarget;
      case 'contains':
        return strVal.includes(strTarget);
      case 'not_contains':
        return !strVal.includes(strTarget);
      case 'starts_with':
        return strVal.startsWith(strTarget);
      case 'ends_with':
        return strVal.endsWith(strTarget);
      case 'matches_regex':
        try {
          // Safeguard against catastrophic backtracking by keeping pattern short
          if (cond.value.length > 100) return false;
          const reg = new RegExp(cond.value, 'i');
          return reg.test(String(val));
        } catch {
          return false;
        }
      default:
        return false;
    }
  };

  const allPassed = matchAll.length === 0 || matchAll.every(checkCondition);
  const anyPassed = matchAny.length === 0 || matchAny.some(checkCondition);

  return allPassed && anyPassed;
}

/**
 * Interpolates string templates with payload values (e.g. {{title}}, {{author}})
 */
function interpolateTemplate(template, vars) {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

/**
 * Processes an incoming webhook event asynchronously
 */
export async function processWebhookEvent(eventId, repoId, eventType, payload) {
  logger.info({ eventId, repoId, eventType }, 'Processing webhook event');

  try {
    // 1. Mark event as processing
    await query("UPDATE events SET status = 'processing' WHERE id = $1", [eventId]);

    // 2. Fetch repository info and owner's access token
    const repoRes = await query(
      `SELECT r.*, u.access_token 
       FROM repositories r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.id = $1`,
      [repoId]
    );

    if (repoRes.rows.length === 0) {
      throw new Error(`Repository ${repoId} not found`);
    }

    const repo = repoRes.rows[0];
    const [owner, repoName] = repo.full_name.split('/');
    const accessToken = repo.access_token;

    // 3. Fetch active rules configured for this repo and event_type
    const rulesRes = await query(
      `SELECT * FROM rules 
       WHERE repo_id = $1 AND event_type = $2 AND is_active = true 
       ORDER BY created_at ASC`,
      [repoId, eventType]
    );

    const rules = rulesRes.rows;
    const actionsTaken = [];
    const issueOrPrNumber = payload.issue?.number || payload.pull_request?.number;

    const templateVars = {
      repo: repo.full_name,
      owner,
      repo_name: repoName,
      event_type: eventType,
      action: payload.action || 'triggered',
      title: getFieldValue(payload, 'title') || 'N/A',
      author: getFieldValue(payload, 'author') || 'Unknown',
      url: payload.issue?.html_url || payload.pull_request?.html_url || payload.compare || '',
    };

    // 4. Iterate over rules and check conditions
    for (const rule of rules) {
      const isMatch = evaluateConditions(rule.conditions, payload);
      if (!isMatch) {
        logger.debug({ ruleName: rule.name, eventId }, 'Rule conditions did not match');
        continue;
      }

      logger.info({ ruleName: rule.name, eventId }, 'Rule matched! Executing actions');
      const ruleActions = Array.isArray(rule.actions) ? rule.actions : [];

      for (const action of ruleActions) {
        const actionRecord = {
          rule_id: rule.id,
          rule_name: rule.name,
          type: action.type,
          status: 'pending',
          details: {},
          executed_at: new Date().toISOString(),
        };

        try {
          // Action: ADD LABEL
          if (action.type === 'add_label' && issueOrPrNumber) {
            const labelName = action.label || 'automated';
            await addLabelToIssue(accessToken, owner, repoName, issueOrPrNumber, labelName, action.color);
            actionRecord.status = 'success';
            actionRecord.details = { label: labelName, issueNumber: issueOrPrNumber };
          }

          // Action: POST COMMENT
          else if (action.type === 'post_comment' && issueOrPrNumber) {
            const commentBody = interpolateTemplate(action.body || '🤖 Automation action executed.', templateVars);
            await postIssueComment(accessToken, owner, repoName, issueOrPrNumber, commentBody);
            actionRecord.status = 'success';
            actionRecord.details = { commentBody, issueNumber: issueOrPrNumber };
          }

          // Action: SLACK NOTIFICATION
          else if (action.type === 'slack_notify') {
            const title = interpolateTemplate(
              action.title || `[${repo.full_name}] ${eventType.toUpperCase()} Alert`,
              templateVars
            );
            const text = interpolateTemplate(
              action.message || action.message_template || `*Event:* ${eventType} (${payload.action || 'action'})\n*Title:* ${templateVars.title}\n*Author:* ${templateVars.author}\n*Link:* <${templateVars.url}|View on GitHub>`,
              templateVars
            );

            await sendSlackNotification(action.webhook_url, {
              title,
              text,
              fields: [
                { title: 'Repository', value: repo.full_name },
                { title: 'Rule Triggered', value: rule.name },
              ],
            });
            actionRecord.status = 'success';
            actionRecord.details = { title };
          }

          // Action: AI TRIAGE (Stretch Goal)
          else if (action.type === 'ai_triage' && issueOrPrNumber) {
            const triageResult = await triageContent({
              title: templateVars.title,
              body: getFieldValue(payload, 'body'),
              type: eventType === 'pull_request' ? 'pull request' : 'issue',
            });

            // If triage suggested labels and action permits auto-applying
            if (action.apply_suggested_labels && triageResult.suggested_labels?.length > 0) {
              for (const l of triageResult.suggested_labels.slice(0, 2)) {
                await addLabelToIssue(accessToken, owner, repoName, issueOrPrNumber, l);
              }
            }

            // Post summary comment if configured
            if (action.post_ai_comment) {
              const aiComment = `### 🤖 AI Triage Summary\n\n**Summary:** ${triageResult.summary}\n**Suggested Priority:** \`${triageResult.priority}\`\n**Sentiment:** \`${triageResult.sentiment || 'neutral'}\`\n\n> ${triageResult.suggested_comment || 'Our team will review this shortly.'}`;
              await postIssueComment(accessToken, owner, repoName, issueOrPrNumber, aiComment);
            }

            actionRecord.status = 'success';
            actionRecord.details = { triageResult };
          }

          actionsTaken.push(actionRecord);
        } catch (actionErr) {
          logger.error({ actionErr, actionType: action.type, eventId }, 'Action execution failed, enqueuing to DLQ');
          actionRecord.status = 'failed';
          actionRecord.error = actionErr.message;
          actionsTaken.push(actionRecord);

          // Push into dead-letter queue for exponential backoff retry
          await query(
            `INSERT INTO dead_letter_queue (event_id, action_type, action_payload, error_message, next_retry_at)
             VALUES ($1, $2, $3, $4, now() + interval '1 minute')`,
            [eventId, action.type, JSON.stringify({ action, templateVars, issueOrPrNumber, repoId }), actionErr.message]
          );
        }
      }
    }

    // 5. Finalize event status
    const hasFailures = actionsTaken.some((a) => a.status === 'failed');
    const finalStatus = hasFailures ? 'failed' : 'completed';

    await query(
      `UPDATE events 
       SET status = $1, actions_taken = $2, processed_at = now() 
       WHERE id = $3`,
      [finalStatus, JSON.stringify(actionsTaken), eventId]
    );

    logger.info({ eventId, finalStatus, actionCount: actionsTaken.length }, 'Finished processing event');
  } catch (err) {
    logger.error({ err, eventId }, 'Fatal error during event processing pipeline');
    await query(
      `UPDATE events 
       SET status = 'failed', error_message = $1, processed_at = now() 
       WHERE id = $2`,
      [err.message, eventId]
    );
  }
}
