ALTER TABLE users ADD COLUMN archived_at TIMESTAMPTZ NULL;
ALTER TABLE courses ADD COLUMN archived_at TIMESTAMPTZ NULL;
ALTER TABLE authors ADD COLUMN archived_at TIMESTAMPTZ NULL;
ALTER TABLE categories ADD COLUMN archived_at TIMESTAMPTZ NULL;

CREATE TABLE lesson_notifications (
    user_id INTEGER NOT NULL REFERENCES users(id),
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);
