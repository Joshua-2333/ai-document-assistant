-- server/src/db/schema.sql

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