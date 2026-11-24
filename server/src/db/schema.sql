-- server/src/db/schema.sql

-- AI usage and spending tracking
CREATE TABLE IF NOT EXISTS ai_usage (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    visitor_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,

    input_tokens INTEGER NOT NULL DEFAULT 0
        CHECK (input_tokens >= 0),

    output_tokens INTEGER NOT NULL DEFAULT 0
        CHECK (output_tokens >= 0),

    reserved_cost_usd NUMERIC(14, 10) NOT NULL
        CHECK (reserved_cost_usd >= 0),

    actual_cost_usd NUMERIC(14, 10)
        CHECK (actual_cost_usd >= 0),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'completed',
            'failed',
            'uncertain'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for global daily limits and monthly spending
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at
    ON ai_usage (created_at);

-- Index for per-visitor daily limits
CREATE INDEX IF NOT EXISTS idx_ai_usage_visitor_created_at
    ON ai_usage (visitor_id, created_at);


-- Document ownership and storage tracking
CREATE TABLE IF NOT EXISTS documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    filename TEXT NOT NULL UNIQUE,

    original_name TEXT NOT NULL,

    session_id TEXT NOT NULL
        CHECK (session_id ~ '^[a-f0-9]{64}$'),

    size_bytes BIGINT NOT NULL
        CHECK (
            size_bytes > 0
            AND size_bytes <= 10485760
        ),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'active',
            'deleting'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (NOW() + INTERVAL '24 hours'),

    CHECK (expires_at > created_at)
);

-- Index for document ownership lookups
CREATE INDEX IF NOT EXISTS idx_documents_session_id
    ON documents (session_id);

-- Index for expired document cleanup
CREATE INDEX IF NOT EXISTS idx_documents_expires_at
    ON documents (expires_at);