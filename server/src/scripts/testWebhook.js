import crypto from 'crypto';
import { query } from '../db.js';

async function simulateWebhook() {
  const repoRes = await query('SELECT full_name, webhook_secret FROM repositories LIMIT 1');
  if (repoRes.rows.length === 0) {
    console.error('No repo connected in DB');
    process.exit(1);
  }

  const repo = repoRes.rows[0];
  console.log(`Simulating webhook for repository: ${repo.full_name}`);

  const payload = {
    action: 'opened',
    issue: {
      number: 1,
      title: 'Critical login bug in auth system',
      body: 'Users are unable to log in on mobile devices. Need urgent fix.',
      html_url: `https://github.com/${repo.full_name}/issues/1`,
      user: {
        login: 'Shubham043',
      },
    },
    repository: {
      full_name: repo.full_name,
    },
    sender: {
      login: 'Shubham043',
    },
  };

  const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = 'sha256=' + crypto
    .createHmac('sha256', repo.webhook_secret)
    .update(rawBody)
    .digest('hex');

  const deliveryId = 'test-delivery-' + Date.now();

  console.log('Sending webhook POST to http://localhost:3001/api/webhooks/github ...');
  const res = await fetch('http://localhost:3001/api/webhooks/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signature,
      'X-GitHub-Event': 'issues',
      'X-GitHub-Delivery': deliveryId,
    },
    body: rawBody,
  });

  const responseJson = await res.json();
  console.log('Webhook Response:', res.status, responseJson);
  process.exit(0);
}

simulateWebhook();
