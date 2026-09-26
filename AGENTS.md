# Agent & Coding Assistant Instructions

This repository contains an event-driven GitHub Automation Bot built with Node.js/Express (backend) and React/Vite (frontend), connected to Supabase PostgreSQL.

## Architecture Guidelines for AI Agents

1. **Security & Cryptography**:
   - Never use loose string equality `===` for HMAC webhook verification. Always use `crypto.timingSafeEqual` with Buffers.
   - Always retain raw body buffers for `/api/webhooks/github` to prevent signature validation failures.
   - Never store OAuth access tokens in frontend `localStorage` or `sessionStorage`. All authentication state is handled via `HttpOnly`, `SameSite=Lax` cookies.

2. **Idempotency & Event Processing**:
   - All webhook deliveries must be checked against `events.idempotency_key` (derived from `X-GitHub-Delivery`).
   - If an event is already recorded, acknowledge with `200 OK` and skip re-executing GitHub API writes or Slack alerts.

3. **Error Resilience & Retries**:
   - When external calls fail (e.g. GitHub API rate limits, Slack timeout), insert the action payload into `dead_letter_queue` with an incrementing retry counter and exponential backoff.
   - Do not crash the Express server process on downstream API failures.

4. **Zero Fluff Code Standard**:
   - Use clean, modular ES Modules (`import`/`export`).
   - Use parameterized SQL queries (`$1`, `$2`) with `pg` pool to prevent SQL injection.
