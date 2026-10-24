CREATE TABLE course_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    unlock_mode VARCHAR(12) NOT NULL DEFAULT 'all',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_modules_unlock_check CHECK (unlock_mode IN ('all', 'sequential'))
);
CREATE INDEX course_modules_course_idx ON course_modules(course_id, position);

CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES course_modules(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration VARCHAR(30) NOT NULL DEFAULT '',
    video_type VARCHAR(10) NOT NULL DEFAULT 'none',
    video_url VARCHAR(1000) NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lessons_video_type_check CHECK (video_type IN ('none', 'link', 'file'))
);
CREATE INDEX lessons_module_idx ON lessons(module_id, position);

CREATE TABLE lesson_materials (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    title VARCHAR(200) NOT NULL,
    kind VARCHAR(10) NOT NULL DEFAULT 'file',
    url VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT lesson_materials_kind_check CHECK (kind IN ('file', 'link'))
);
CREATE INDEX lesson_materials_lesson_idx ON lesson_materials(lesson_id, position);

CREATE TABLE course_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    granted_by INTEGER NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_access_user_course UNIQUE (user_id, course_id)
);
CREATE INDEX course_access_course_idx ON course_access(course_id);

CREATE TABLE lesson_progress (
    user_id INTEGER NOT NULL REFERENCES users(id),
    lesson_id INTEGER NOT NULL REFERENCES lessons(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);

INSERT INTO course_modules (course_id, title, position)
SELECT c.id, m.value->>'title', m.ord
FROM courses c CROSS JOIN LATERAL jsonb_array_elements(c.modules) WITH ORDINALITY AS m(value, ord);

INSERT INTO lessons (module_id, title, duration, position)
SELECT cm.id, l.value->>'title', COALESCE(l.value->>'duration', ''), l.ord
FROM courses c
CROSS JOIN LATERAL jsonb_array_elements(c.modules) WITH ORDINALITY AS m(value, ord)
JOIN course_modules cm ON cm.course_id = c.id AND cm.position = m.ord
CROSS JOIN LATERAL jsonb_array_elements(m.value->'lessons') WITH ORDINALITY AS l(value, ord);