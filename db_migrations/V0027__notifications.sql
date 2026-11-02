CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    level VARCHAR(10) NOT NULL DEFAULT 'info',
    kind VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link VARCHAR(300) NOT NULL DEFAULT '',
    dedupe_key VARCHAR(120) NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_level_check CHECK (level IN ('info', 'success', 'warning', 'critical'))
);
CREATE INDEX notifications_user_idx ON notifications(user_id, created_at);
CREATE UNIQUE INDEX notifications_dedupe_uq ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;