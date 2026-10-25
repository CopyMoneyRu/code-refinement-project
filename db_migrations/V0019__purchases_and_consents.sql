CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL REFERENCES users(id),
    course_id INTEGER NULL REFERENCES courses(id),
    amount INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider VARCHAR(30) NOT NULL DEFAULT 'robokassa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ NULL,
    CONSTRAINT purchases_status_check CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))
);
CREATE INDEX purchases_created_idx ON purchases(created_at);

CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL REFERENCES users(id),
    email VARCHAR(255) NOT NULL DEFAULT '',
    document VARCHAR(40) NOT NULL,
    version VARCHAR(20) NOT NULL,
    accepted BOOLEAN NOT NULL DEFAULT TRUE,
    ip VARCHAR(64) NULL,
    user_agent VARCHAR(300) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX user_consents_user_idx ON user_consents(user_id);

ALTER TABLE users ADD COLUMN marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX lesson_progress_completed_idx ON lesson_progress(completed_at);
