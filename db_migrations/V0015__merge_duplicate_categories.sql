UPDATE course_categories SET category_id = 6
WHERE category_id = 5 AND NOT EXISTS (SELECT 1 FROM course_categories x WHERE x.course_id = course_categories.course_id AND x.category_id = 6);
UPDATE courses SET category = 'Фондовый рынок' WHERE category = 'Фондовый Рынок';
