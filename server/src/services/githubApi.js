import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger.js';

export function getOctokit(accessToken) {
  return new Octokit({ auth: accessToken });
}

/**
 * List repos the user has admin/push access to
 */
export async function listUserRepos(accessToken) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100,
    affiliation: 'owner,collaborator,organization_member',
  });
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: r.private,
    owner: r.owner.login,
    html_url: r.html_url,
    description: r.description,
    permissions: r.permissions,
  }));
}

/**
 * Creates a repository webhook on GitHub
 */
export async function createRepoWebhook(accessToken, owner, repo, webhookUrl, secret) {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.repos.createWebhook({
      owner,
      repo,
      name: 'web',
      active: true,
      events: ['issues', 'pull_request', 'push', 'issue_comment'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    });
    return data;
  } catch (err) {
    logger.error({ err, owner, repo }, 'Failed to create GitHub repo webhook');
    throw err;
  }
}

/**
 * Deletes a repository webhook from GitHub
 */
export async function deleteRepoWebhook(accessToken, owner, repo, hookId) {
  const octokit = getOctokit(accessToken);
  try {
    await octokit.repos.deleteWebhook({
      owner,
      repo,
      hook_id: hookId,
    });
  } catch (err) {
    logger.warn({ err, owner, repo, hookId }, 'Failed or webhook already deleted on GitHub');
  }
}

/**
 * Adds a label to an issue or PR (creates label if missing)
 */
export async function addLabelToIssue(accessToken, owner, repo, issueNumber, labelName, color = '0366d6') {
  const octokit = getOctokit(accessToken);
  try {
    // Try to ensure label exists
    try {
      await octokit.issues.createLabel({
        owner,
        repo,
        name: labelName,
        color,
        description: 'Auto-applied by GitHub Automation Bot',
      });
    } catch (createErr) {
      // 422 indicates label already exists, which is expected
      if (createErr.status !== 422) {
        logger.debug({ createErr }, 'Notice when checking label existence');
      }
    }

    const { data } = await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: [labelName],
    });
    return data;
  } catch (err) {
    logger.error({ err, owner, repo, issueNumber, labelName }, 'Failed to add label');
    throw err;
  }
}

/**
 * Posts a markdown comment on an issue or PR
 */
export async function postIssueComment(accessToken, owner, repo, issueNumber, body) {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    return data;
  } catch (err) {
    logger.error({ err, owner, repo, issueNumber }, 'Failed to post issue comment');
    throw err;
  }
}
