import { logger } from '../utils/logger.js';
import { config } from '../config.js';

/**
 * Sends a rich block kit message to Slack
 */
export async function sendSlackNotification(customWebhookUrl, { title, text, fields = [], color = '#0284c7' }) {
  const webhookUrl = customWebhookUrl || config.slack.webhookUrl;

  if (!webhookUrl) {
    logger.warn('Slack notification skipped: No Slack webhook URL configured');
    return { skipped: true, reason: 'No webhook URL' };
  }

  const payload = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: title.slice(0, 150),
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: text.slice(0, 3000),
            },
          },
        ],
      },
    ],
  };

  if (fields.length > 0) {
    payload.attachments[0].blocks.push({
      type: 'section',
      fields: fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.title}*\n${f.value}`,
      })),
    });
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, errorBody }, 'Slack webhook dispatch failed');
    throw new Error(`Slack webhook error: ${response.status} - ${errorBody}`);
  }

  logger.info({ title }, 'Slack notification sent successfully');
  return { success: true };
}
