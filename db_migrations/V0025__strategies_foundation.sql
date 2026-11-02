CREATE TABLE strategy_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    icon VARCHAR(40) NOT NULL DEFAULT 'Shapes',
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ NULL
);

INSERT INTO strategy_categories (slug, name, icon, sort) VALUES
('crypto', 'Крипторынок', 'Bitcoin', 10),
('stocks', 'Фондовый рынок', 'CandlestickChart', 20),
('realty', 'Недвижимость', 'Building2', 30),
('business', 'Частный бизнес', 'Briefcase', 40),
('loans', 'Инвестиционные займы', 'HandCoins', 50),
('other', 'Другие направления', 'Shapes', 60);

CREATE TABLE strategies (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    short VARCHAR(400) NOT NULL DEFAULT '',
    category_id INTEGER NULL REFERENCES strategy_categories(id),
    kind VARCHAR(20) NOT NULL DEFAULT 'generic',
    cover_url VARCHAR(500) NOT NULL DEFAULT '',
    risk_level SMALLINT NOT NULL DEFAULT 3,
    risk_style VARCHAR(10) NOT NULL DEFAULT 'stars',
    yield_mode VARCHAR(10) NOT NULL DEFAULT 'none',
    yield_basis VARCHAR(10) NOT NULL DEFAULT 'forecast',
    yield_from NUMERIC(10,2) NULL,
    yield_to NUMERIC(10,2) NULL,
    yield_period VARCHAR(40) NOT NULL DEFAULT 'в год',
    price_label VARCHAR(120) NOT NULL DEFAULT '',
    exchanges TEXT NOT NULL DEFAULT '',
    card_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    card_options JSONB NOT NULL DEFAULT '{}'::jsonb,
    access_note TEXT NOT NULL DEFAULT '',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(12) NOT NULL DEFAULT 'draft',
    sort INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NULL REFERENCES users(id),
    updated_by INTEGER NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_published_at TIMESTAMPTZ NULL,
    removed_at TIMESTAMPTZ NULL,
    CONSTRAINT strategies_status_check CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    CONSTRAINT strategies_kind_check CHECK (kind IN ('generic', 'copytrading')),
    CONSTRAINT strategies_risk_check CHECK (risk_level BETWEEN 1 AND 5),
    CONSTRAINT strategies_risk_style_check CHECK (risk_style IN ('stars', 'bars')),
    CONSTRAINT strategies_yield_mode_check CHECK (yield_mode IN ('none', 'fixed', 'range')),
    CONSTRAINT strategies_yield_basis_check CHECK (yield_basis IN ('forecast', 'actual'))
);
CREATE INDEX strategies_status_idx ON strategies(status);
CREATE INDEX strategies_category_idx ON strategies(category_id);

CREATE TABLE strategy_content_blocks (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    stage VARCHAR(10) NOT NULL DEFAULT 'draft',
    position INTEGER NOT NULL DEFAULT 0,
    type VARCHAR(20) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT strategy_blocks_stage_check CHECK (stage IN ('draft', 'published'))
);
CREATE INDEX strategy_blocks_strategy_idx ON strategy_content_blocks(strategy_id, stage, position);

CREATE TABLE strategy_labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    color VARCHAR(12) NOT NULL DEFAULT 'blue',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ NULL
);

CREATE TABLE strategy_label_links (
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    label_id INTEGER NOT NULL REFERENCES strategy_labels(id),
    PRIMARY KEY (strategy_id, label_id)
);

CREATE TABLE staff_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    permission VARCHAR(40) NOT NULL,
    strategy_id INTEGER NULL REFERENCES strategies(id),
    granted_by INTEGER NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    revoked_by INTEGER NULL REFERENCES users(id)
);
CREATE UNIQUE INDEX staff_permissions_active_uq ON staff_permissions(user_id, permission, COALESCE(strategy_id, 0)) WHERE revoked_at IS NULL;
CREATE INDEX staff_permissions_user_idx ON staff_permissions(user_id) WHERE revoked_at IS NULL;

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id INTEGER NULL REFERENCES users(id),
    action VARCHAR(60) NOT NULL,
    entity VARCHAR(40) NOT NULL,
    entity_id INTEGER NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity, entity_id, created_at);
CREATE INDEX audit_log_actor_idx ON audit_log(actor_id, created_at);

INSERT INTO staff_permissions (user_id, permission)
SELECT u.id, p.perm FROM users u
CROSS JOIN (VALUES ('strategies.create'), ('strategies.edit'), ('strategies.publish')) AS p(perm)
WHERE u.role = 'admin' AND u.archived_at IS NULL AND (',' || u.permissions || ',') LIKE '%,strategies,%';