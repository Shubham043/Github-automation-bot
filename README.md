# ⚡ GitPulse — Event-Driven GitHub Automation Bot

A production-grade, event-driven web application and bot that reacts to GitHub repository activity in real time. It verifies cryptographic HMAC-SHA256 webhook signatures, guarantees idempotent delivery processing, executes user-defined automation rules, triages issues/PRs using Google Gemini AI, writes back labels and comments via the GitHub API, and broadcasts rich BlockKit notifications to Slack.

Built strictly under **100% free-tier constraints** (no credit card required).

---

## 🌐 Live Production URLs

- **Live Web Application**: [https://gitpulse-alpha.vercel.app](https://gitpulse-alpha.vercel.app)
- **Backend API & Webhook Service**: [https://github-automation-bot-s84d.onrender.com](https://github-automation-bot-s84d.onrender.com)
- **Health Endpoint**: [https://github-automation-bot-s84d.onrender.com/api/health](https://github-automation-bot-s84d.onrender.com/api/health)
- **GitHub Code Repository**: [https://github.com/Shubham043/Github-automation-bot](https://github.com/Shubham043/Github-automation-bot)

---

## 🚀 Key Features

- **GitHub OAuth 2.0**: Secure authentication with repository read/write and webhook management scopes.
- **HMAC-SHA256 Signature Verification**: Cryptographically validates every incoming webhook using constant-time `crypto.timingSafeEqual` against per-repository secrets.
- **Idempotent Delivery Pipeline**: Atomic deduplication using GitHub's `X-GitHub-Delivery` ID with database-level `UNIQUE` constraints — no duplicated comments or labels on replayed webhooks.
- **Visual Automation Rules Builder**: Define custom triggers on `issues`, `pull_request`, and `push` events with condition filtering on `title`, `body`, `author`, or `action`.
- **Gemini AI Smart Triage (Stretch Goal)**: Automated issue/PR summarization, sentiment analysis, priority tagging, and contextual comment generation powered by Google Gemini (free tier).
- **Slack BlockKit Alerts**: Instant team notifications with interactive links to issues and PRs.
- **Dead-Letter Queue (DLQ) & Resilience**: In-process background worker with exponential backoff retries (1m → 2m → 4m) for transient network or GitHub API errors.
- **Zero Client-Side Secrets**: Backend-for-Frontend (BFF) architecture with `HttpOnly`, `SameSite=Lax` session cookies and double-submit CSRF protection.

---

## 🛠 Tech Stack

| Layer | Technology | Hosting Tier (Free, No Card) |
|---|---|---|
| **Frontend** | React 18, Vite, React Router 6, Lucide Icons | **Vercel** (Edge CDN + Proxy Rewrites) |
| **Backend** | Node.js, Express, Octokit REST API, Helmet, Pino | **Render** (Web Service) |
| **Database** | PostgreSQL, `connect-pg-simple` session store | **Supabase** (Free Postgres) |
| **AI Triage** | Google Gemini 1.5 Flash (`@google/generative-ai`) | **Google AI Studio** (Free API Key) |
| **Notifications** | Slack Incoming Webhooks (BlockKit) | **Slack API** (Free Workspace) |

---

## 📦 Project Structure

```
github-automation-bot/
├── client/                          # React + Vite Frontend
│   ├── src/
│   │   ├── components/              # Layout, Modal, StatusBadge, ProtectedRoute
│   │   ├── hooks/                   # useAuth, useEvents
│   │   ├── pages/                   # LoginPage, DashboardPage, ReposPage, RulesPage, EventDetailPage
│   │   ├── lib/api.js               # CSRF-aware fetch client
│   │   ├── App.jsx
│   │   └── index.css                # Dark modern glassmorphic design system
│   ├── vercel.json                  # Vercel proxy rewrite rules
│   └── vite.config.js
│
├── server/                          # Node.js + Express Backend
│   ├── src/
│   │   ├── routes/                  # auth, repos, rules, events, webhooks, health
│   │   ├── middleware/              # securityHeaders, rateLimiter, auth, csrf, webhookSignature
│   │   ├── services/                # githubApi, slackNotifier, aiTriage, eventProcessor, retryQueue
│   │   ├── utils/                   # crypto, logger
│   │   ├── config.js                # Fail-fast environment loader
│   │   ├── db.js                    # PostgreSQL pool
│   │   └── index.js                 # Express server bootstrap
│   ├── schema.sql                   # Database table definitions & indexes
│   └── .env.example
│
├── README.md
├── AI_NOTES.md
├── AGENTS.md
└── .env.example
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ and npm
- A free Supabase PostgreSQL database (or local PostgreSQL)
- A GitHub account for creating an OAuth App

### 2. Clone and Setup Environment Variables

```bash
# Clone the repository
git clone https://github.com/your-username/github-automation-bot.git
cd github-automation-bot

# Setup Backend Environment
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SESSION_SECRET=create_a_random_32_char_string
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/callback
BACKEND_PUBLIC_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Initialize the Database Schema

Run the SQL migration script:
```bash
cd server
npm install
npm run init-db
```
*(Alternatively, copy and run `server/schema.sql` inside the Supabase SQL Editor.)*

### 4. Start the Application

Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
# Backend starts on http://localhost:3001
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

Visit `http://localhost:5173` to test the full flow locally.

---

## 🌐 Production Deployment Guide

### A. Deploy Database (Supabase)
1. Go to [Supabase](https://supabase.com) and create a free project (no credit card needed).
2. Go to **SQL Editor** -> Paste and execute `server/schema.sql`.
3. Go to **Project Settings** -> **Database** -> Copy the connection URI (use port 6543 connection pooler).

### B. Deploy Backend (Render)
1. Create a free account on [Render](https://render.com).
2. Click **New +** -> **Web Service** -> Connect your GitHub repo.
3. Configure settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Instance Type**: Free
4. Add the Environment Variables from `server/.env.example`.
5. Set `BACKEND_PUBLIC_URL` to your Render URL (e.g., `https://my-bot-backend.onrender.com`).
6. Set `FRONTEND_URL` to your Vercel URL (e.g., `https://my-bot-frontend.vercel.app`).

### C. Deploy Frontend (Vercel)
1. Create a free account on [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** -> Import your GitHub repo.
3. Configure settings:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
4. Update `client/vercel.json` with your actual Render backend URL:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://my-bot-backend.onrender.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
5. Click **Deploy**.

### D. Configure GitHub OAuth App
1. Go to **GitHub Settings** -> **Developer Settings** -> **OAuth Apps** -> **New OAuth App**.
2. **Application Name**: `GitPulse Automation Bot`
3. **Homepage URL**: `https://my-bot-frontend.vercel.app`
4. **Authorization callback URL**: `https://my-bot-backend.onrender.com/api/auth/callback`
5. Generate a Client Secret and copy Client ID & Secret to your Render environment variables.

---

## 🧪 Testing Instructions for Evaluators

1. Open the deployed application URL.
2. Click **Sign in with GitHub** to authenticate.
3. Navigate to **Connected Repos** and click **Connect Bot** next to any repository you own (or create a throwaway test repo like `test-bot-repo`). The bot automatically creates a webhook on GitHub with an HMAC secret.
4. Navigate to **Automation Rules** — Notice the pre-configured rules:
   - *Auto-label Bug Issues*: Triggers when an issue title contains `bug` -> Adds `bug` label + posts comment + sends Slack alert.
   - *AI PR Summarizer*: Triggers on opened PRs -> Runs Gemini AI triage + applies suggested labels + leaves AI review notes.
5. In your test GitHub repo:
   - **Test 1 (Issue):** Open a new issue titled `"Crash on startup: memory bug"`.
   - **Test 2 (Pull Request):** Open a simple pull request.
6. Check your GitHub repo — the bot will have applied labels and posted comments within 1-2 seconds.
7. Return to the dashboard — the **Live Event Feed** will show both webhook deliveries, verified HMAC status, and detailed execution logs.

---

## 🔒 Security Architecture Highlights

- **HMAC-SHA256 Signature Verification**: Eliminates forged webhook deliveries.
- **Idempotency Guard**: Prevents replayed requests from executing duplicate side-effects.
- **CSRF Token Validation**: Double-submit cookie pattern on all mutations (`POST`, `PUT`, `DELETE`).
- **Strict Content Security Policy (CSP)**: Managed via Helmet to prevent XSS.
- **HttpOnly Cookies**: Session tokens cannot be accessed by client-side JavaScript.
- **Rate Limiting**: Protected against brute-force and DDoS bursts.
