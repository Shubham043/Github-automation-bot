-- GitHub Automation Bot Database Schema
-- Compatible with Supabase Postgres

-- 1. Users table (OAuth Identity & Access)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id       BIGINT UNIQUE NOT NULL,
    github_login    TEXT NOT NULL,
    avatar_url      TEXT,
    access_token    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- 2. Connected Repositories
CREATE TABLE IF NOT EXISTS repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_repo_id  BIGINT NOT NULL,
    full_name       TEXT NOT NULL,
    webhook_id      BIGINT,
    webhook_secret  TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, github_repo_id)
);
CREATE INDEX IF NOT EXISTS idx_repos_user ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repositories(full_name);

-- 3. Automation Rules Engine
CREATE TABLE IF NOT EXISTS rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_id         UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    event_type      TEXT NOT NULL,          -- 'issues', 'pull_request', 'push'
    conditions      JSONB NOT NULL DEFAULT '{"match_all":[]}', 
    actions         JSONB NOT NULL DEFAULT '[]',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rules_repo ON rules(repo_id);
CREATE INDEX IF NOT EXISTS idx_rules_event_type ON rules(event_type);

-- 4. Idempotent Event Log
CREATE TABLE IF NOT EXISTS events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id             UUID REFERENCES repositories(id) ON DELETE CASCADE,
    github_event_id     TEXT NOT NULL,       -- X-GitHub-Delivery
    event_type          TEXT NOT NULL,       -- issues, pull_request, push
    action              TEXT,                -- opened, closed, synchronize, etc.
    payload_summary     JSONB NOT NULL,      -- sanitized metadata (title, author, url)
    status              TEXT NOT NULL DEFAULT 'received',  -- received, processing, completed, failed
    error_message       TEXT,
    actions_taken       JSONB DEFAULT '[]',
    idempotency_key     TEXT UNIQUE NOT NULL,
    retry_count         INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT now(),
    processed_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_events_repo ON events(repo_id);
CREATE INDEX IF NOT EXISTS idx_events_idempotency ON events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- 5. Dead-Letter Queue (DLQ for async action retries with exponential backoff)
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    action_type     TEXT NOT NULL,
    action_payload  JSONB NOT NULL,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 3,
    next_retry_at   TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dlq_retry ON dead_letter_queue(next_retry_at) WHERE retry_count < max_retries;

-- 6. Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
