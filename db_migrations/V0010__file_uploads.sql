CREATE TABLE file_uploads (
    id VARCHAR(48) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    kind VARCHAR(12) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    total_size BIGINT NOT NULL,
    chunk_size INTEGER NOT NULL,
    final_url VARCHAR(1000) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL,
    cleaned_at TIMESTAMPTZ NULL,
    CONSTRAINT file_uploads_kind_check CHECK (kind IN ('video', 'material'))
);
CREATE INDEX file_uploads_user_idx ON file_uploads(user_id);