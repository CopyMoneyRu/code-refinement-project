CREATE TABLE lesson_videos (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    title VARCHAR(200) NOT NULL DEFAULT '',
    kind VARCHAR(10) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT lesson_videos_kind_check CHECK (kind IN ('link', 'file'))
);
CREATE INDEX lesson_videos_lesson_idx ON lesson_videos(lesson_id, position);

INSERT INTO lesson_videos (lesson_id, kind, url, position)
SELECT id, video_type, video_url, 1 FROM lessons WHERE video_type IN ('link', 'file') AND video_url <> '';