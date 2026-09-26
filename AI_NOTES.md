# 🧠 AI Notes & Collaboration Retrospective

## 1. AI Tools & Work Split

### Tools & Models Used
- **Antigravity AI Agent** powered by **Gemini 3.7 Flash** & **Claude 3.7 Sonnet** for architecture planning, schema modeling, security auditing, and scaffolding.
- **Google Gemini 1.5 Flash API** directly within the backend application runtime for the AI smart triage stretch goal.

### Division of Work
- **Human / Architect Role**: System topology definition, selecting free-tier constraints (Render + Vercel + Supabase), designing the atomic database idempotency mechanism, designing the constant-time HMAC security checks, and defining the security boundaries (CSRF, CSP, session management).
- **AI Agent Role**: Scaffolding the React components, writing Octokit integration wrappers, writing the SQL migrations, structuring Pino logging, generating the CSS design system, and crafting comprehensive documentation.

---

## 2. Key Decisions Made Myself

### Decision 1: In-Process Queue with DB-Backed Dead-Letter Queue (instead of Redis / BullMQ)
- **Why**: Traditional event-driven bots use Redis (BullMQ/Sidekiq). However, on a strict zero-dollar free tier without credit cards, reliable managed Redis services either have prohibitive timeouts or require payment methods.
- **Solution**: Handled webhooks with an immediate 200 HTTP acknowledgment to prevent GitHub timeouts, kicked off background async processing via Node.js microtasks, and persisted failed actions to a PostgreSQL `dead_letter_queue` table with an exponential backoff poller (`power(2, retry_count)`).

### Decision 2: Per-Repository Webhook Secrets vs. Global Secret
- **Why**: Many simple tutorials recommend setting a single global `GITHUB_WEBHOOK_SECRET` across all users and repositories.
- **Solution**: Stored a randomly generated 32-byte secret per repository in the `repositories` table. If one repository's secret is compromised, other repositories connected to the bot remain secure. The webhook endpoint looks up the secret dynamically based on `payload.repository.full_name`.

### Decision 3: Atomic Deduplication via DB Constraint (instead of in-memory caching)
- **Why**: Server restarts (common on Render free tier) flush in-memory sets (e.g. `Set<DeliveryId>`), causing duplicate processing when GitHub automatically retries 5xx responses.
- **Solution**: Enforced `UNIQUE(idempotency_key)` on the `events` table and used `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`. If no row is returned, the delivery is recognized as a duplicate and immediately skipped.

---

## 3. Hardest Bug / Wrong Turn Encountered & Fixed

### The Problem: Express `express.json()` Mutating Webhook Raw Payloads Breaking HMAC Verification
- **What Happened**: When first scaffolding Express, the AI initially configured `app.use(express.json())` globally at the top of the middleware stack. When GitHub sends a webhook, the signature in `X-Hub-Signature-256` is an HMAC of the *exact raw byte buffer* sent over the wire.
- **How It Failed**: `express.json()` parsed the body into an object and re-serializing it with `JSON.stringify(req.body)` resulted in subtle differences (whitespace, key ordering, UTF-8 character encoding differences), causing `crypto.timingSafeEqual` to reject 100% of legitimate GitHub webhook requests with a 401 Unauthorized.
- **How I Caught & Fixed It**: 
  1. I isolated the `/api/webhooks` router and applied `express.raw({ type: 'application/json' })` specifically for that route *before* the global `express.json()` parser.
  2. Verified signatures against the unparsed raw `Buffer`.
  3. Parsed the JSON manually after signature verification succeeded.

```javascript
// The fix in src/index.js:
// Mount raw parser for webhooks BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
app.use(express.json({ limit: '2mb' }));
```

---

## 4. What I'd Improve with More Time

1. **GitHub App Authentication over OAuth App**: Transition from user-scoped OAuth tokens to GitHub App installations with RS256 JWT tokens. This allows per-organization fine-grained permission grants.
2. **Server-Sent Events (SSE) or WebSockets**: Replace the 6-second polling in the React dashboard with SSE for instant zero-latency UI updates as GitHub events arrive.
3. **Multi-Condition Rule Grouping**: Add a visual tree builder supporting nested `AND`/`OR` Boolean rule logic and custom regex dry-run testing directly within the UI.
4. **Interactive Action Simulator**: A sandbox page that lets users paste a mock GitHub webhook JSON and see in real time which rules match without needing to trigger real commits or issues on GitHub.

---

## 5. Illuminating Prompt Excerpt

**Prompt**:
> "How do we ensure GitHub webhooks that are replayed by an attacker or resent by GitHub's automatic retry policy don't trigger multiple Slack notifications or duplicate comments on the issue?"

**AI's Key Insight & Architecture Formulation**:
> "We must use GitHub's `X-GitHub-Delivery` header as an atomic idempotency key. By inserting the event into the database with `ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`, the database transaction acts as an atomic lock. If zero rows are returned from the insert, the process exits immediately with a 200 OK, preventing redundant downstream API calls to GitHub and Slack."
