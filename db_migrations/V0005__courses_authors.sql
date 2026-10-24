CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    role VARCHAR(160) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    short VARCHAR(400) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(80) NOT NULL,
    level VARCHAR(40) NOT NULL DEFAULT 'Начальный',
    access VARCHAR(10) NOT NULL DEFAULT 'free',
    price INTEGER NOT NULL DEFAULT 0,
    author_id INTEGER NULL REFERENCES authors(id),
    cover_url VARCHAR(500) NOT NULL DEFAULT '',
    modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT courses_price_check CHECK (price >= 0),
    CONSTRAINT courses_access_check CHECK (access IN ('free', 'paid'))
);
CREATE INDEX courses_author_idx ON courses(author_id);

INSERT INTO authors (slug, name, role) VALUES ('invest', 'Эксперт по инвестициям', 'Основы и личные финансы');
INSERT INTO authors (slug, name, role) VALUES ('portfolio', 'Портфельный аналитик', 'Финансовые инструменты');
INSERT INTO authors (slug, name, role) VALUES ('data', 'Аналитик данных', 'Аналитика и технологии');
INSERT INTO authors (slug, name, role) VALUES ('risk', 'Риск-менеджер', 'Управление рисками');

INSERT INTO courses (slug, title, short, category, level, access, author_id, modules) VALUES ('osnovy-investiciy', 'Основы инвестиций', 'Базовые понятия, классы активов и принципы формирования портфеля.', 'Основы', 'Начальный', 'free', (SELECT id FROM authors WHERE slug = 'invest'), '[{"title":"Введение","lessons":[{"title":"Как устроен финансовый рынок","duration":"12 мин","hasFiles":true},{"title":"Классы активов","duration":"17 мин","hasFiles":false},{"title":"Риск и доходность","duration":"22 мин","hasFiles":false}]},{"title":"Портфель","lessons":[{"title":"Диверсификация","duration":"17 мин","hasFiles":true},{"title":"Горизонт инвестирования","duration":"22 мин","hasFiles":false}]}]'::jsonb);
INSERT INTO courses (slug, title, short, category, level, access, author_id, modules) VALUES ('finansovye-instrumenty', 'Финансовые инструменты', 'Акции, облигации, фонды и производные инструменты на практике.', 'Инструменты', 'Средний', 'paid', (SELECT id FROM authors WHERE slug = 'portfolio'), '[{"title":"Долевые инструменты","lessons":[{"title":"Акции","duration":"12 мин","hasFiles":true},{"title":"Фонды","duration":"17 мин","hasFiles":false}]},{"title":"Долговые инструменты","lessons":[{"title":"Облигации","duration":"17 мин","hasFiles":true},{"title":"Кривая доходности","duration":"22 мин","hasFiles":false}]},{"title":"Производные","lessons":[{"title":"Фьючерсы и опционы","duration":"22 мин","hasFiles":true}]}]'::jsonb);
INSERT INTO courses (slug, title, short, category, level, access, author_id, modules) VALUES ('analitika-rynka', 'Аналитика рынка', 'Фундаментальный и количественный анализ для принятия решений.', 'Аналитика', 'Средний', 'paid', (SELECT id FROM authors WHERE slug = 'data'), '[{"title":"Фундаментальный анализ","lessons":[{"title":"Отчётность компаний","duration":"12 мин","hasFiles":true},{"title":"Мультипликаторы","duration":"17 мин","hasFiles":false}]},{"title":"Количественный подход","lessons":[{"title":"Работа с данными","duration":"17 мин","hasFiles":true},{"title":"Модели и проверка гипотез","duration":"22 мин","hasFiles":false}]}]'::jsonb);
INSERT INTO courses (slug, title, short, category, level, access, author_id, modules) VALUES ('upravlenie-riskami', 'Управление рисками', 'Как оценивать, ограничивать и контролировать риски портфеля.', 'Управление рисками', 'Продвинутый', 'paid', (SELECT id FROM authors WHERE slug = 'risk'), '[{"title":"Оценка риска","lessons":[{"title":"Виды рисков","duration":"12 мин","hasFiles":true},{"title":"Метрики риска","duration":"17 мин","hasFiles":false}]},{"title":"Контроль","lessons":[{"title":"Лимиты и правила","duration":"17 мин","hasFiles":true},{"title":"Хеджирование","duration":"22 мин","hasFiles":false}]}]'::jsonb);
INSERT INTO courses (slug, title, short, category, level, access, author_id, modules) VALUES ('tehnologii-v-investiciyah', 'Технологии в инвестициях', 'Алгоритмы, автоматизация и данные в управлении капиталом.', 'Аналитика', 'Средний', 'free', (SELECT id FROM authors WHERE slug = 'data'), '[{"title":"Обзор","lessons":[{"title":"Автоматизация решений","duration":"12 мин","hasFiles":true},{"title":"Данные и инфраструктура","duration":"17 мин","hasFiles":false}]}]'::jsonb);
INSERT INTO courses (slug, title, short, category, level, access, author_id, modules) VALUES ('lichnyy-finansovyy-plan', 'Личный финансовый план', 'Цели, бюджет и структура капитала для долгосрочного плана.', 'Основы', 'Начальный', 'free', (SELECT id FROM authors WHERE slug = 'invest'), '[{"title":"План","lessons":[{"title":"Постановка целей","duration":"12 мин","hasFiles":true},{"title":"Резерв и структура","duration":"17 мин","hasFiles":false}]}]'::jsonb);