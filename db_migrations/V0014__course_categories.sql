CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX categories_name_uq ON categories (LOWER(name));

CREATE TABLE course_categories (
    course_id INTEGER NOT NULL REFERENCES courses(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (course_id, category_id)
);
CREATE INDEX course_categories_cat_idx ON course_categories(category_id);

INSERT INTO categories (name)
SELECT DISTINCT ON (LOWER(TRIM(category))) TRIM(category) FROM courses
WHERE TRIM(category) <> '' ORDER BY LOWER(TRIM(category)), id;

INSERT INTO course_categories (course_id, category_id)
SELECT c.id, cat.id FROM courses c JOIN categories cat ON LOWER(cat.name) = LOWER(TRIM(c.category));

ALTER TABLE courses ALTER COLUMN category SET DEFAULT '';
