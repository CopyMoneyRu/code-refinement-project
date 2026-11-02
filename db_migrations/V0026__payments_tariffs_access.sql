CREATE TABLE platform_settings (
    key VARCHAR(60) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by INTEGER NULL REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO platform_settings (key, value) VALUES
('payments', '{"mode": "test", "robokassa": {"login": "", "hashAlg": "md5", "fiscal": false, "sno": "usn_income", "tax": "none", "recurring": false}}'::jsonb);

CREATE TABLE strategy_tariffs (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    kind VARCHAR(16) NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    period_value INTEGER NOT NULL,
    period_unit VARCHAR(8) NOT NULL DEFAULT 'month',
    trial_days INTEGER NOT NULL DEFAULT 0,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ NULL,
    CONSTRAINT strategy_tariffs_kind_check CHECK (kind IN ('free', 'one_time', 'subscription')),
    CONSTRAINT strategy_tariffs_price_check CHECK (price >= 0),
    CONSTRAINT strategy_tariffs_period_check CHECK (period_value > 0),
    CONSTRAINT strategy_tariffs_unit_check CHECK (period_unit IN ('day', 'month')),
    CONSTRAINT strategy_tariffs_trial_check CHECK (trial_days BETWEEN 0 AND 90)
);
CREATE INDEX strategy_tariffs_strategy_idx ON strategy_tariffs(strategy_id, position);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_type VARCHAR(12) NOT NULL,
    strategy_id INTEGER NULL REFERENCES strategies(id),
    tariff_id INTEGER NULL REFERENCES strategy_tariffs(id),
    course_id INTEGER NULL REFERENCES courses(id),
    purpose VARCHAR(12) NOT NULL DEFAULT 'new',
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    credit NUMERIC(12,2) NOT NULL DEFAULT 0,
    refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider VARCHAR(20) NOT NULL,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    parent_order_id INTEGER NULL REFERENCES orders(id),
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    failure_reason VARCHAR(300) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL,
    CONSTRAINT orders_product_check CHECK (product_type IN ('strategy', 'course')),
    CONSTRAINT orders_purpose_check CHECK (purpose IN ('new', 'renewal', 'upgrade', 'free', 'auto_renewal')),
    CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded')),
    CONSTRAINT orders_provider_check CHECK (provider IN ('test', 'robokassa', 'free', 'internal')),
    CONSTRAINT orders_amount_check CHECK (amount >= 0 AND credit >= 0 AND refunded_amount >= 0 AND refunded_amount <= amount)
);
CREATE INDEX orders_user_idx ON orders(user_id, created_at);
CREATE INDEX orders_status_idx ON orders(status, created_at);
CREATE INDEX orders_strategy_idx ON orders(strategy_id);
CREATE INDEX orders_paid_idx ON orders(paid_at);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    provider VARCHAR(20) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(12) NOT NULL,
    is_test BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    note VARCHAR(300) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_status_check CHECK (status IN ('succeeded', 'failed', 'rejected'))
);
CREATE UNIQUE INDEX payments_external_uq ON payments(provider, external_id);
CREATE UNIQUE INDEX payments_one_success_uq ON payments(order_id) WHERE status = 'succeeded';

CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    payment_id INTEGER NULL REFERENCES payments(id),
    amount NUMERIC(12,2) NOT NULL,
    reason VARCHAR(500) NOT NULL DEFAULT '',
    access_action VARCHAR(8) NOT NULL DEFAULT 'keep',
    created_by INTEGER NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT refunds_amount_check CHECK (amount > 0),
    CONSTRAINT refunds_action_check CHECK (access_action IN ('keep', 'revoke'))
);
CREATE INDEX refunds_order_idx ON refunds(order_id);

CREATE TABLE strategy_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    tariff_id INTEGER NULL REFERENCES strategy_tariffs(id),
    order_id INTEGER NULL REFERENCES orders(id),
    source VARCHAR(10) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    granted_by INTEGER NULL REFERENCES users(id),
    note VARCHAR(300) NOT NULL DEFAULT '',
    revoked_at TIMESTAMPTZ NULL,
    revoked_by INTEGER NULL REFERENCES users(id),
    revoke_reason VARCHAR(300) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT strategy_access_source_check CHECK (source IN ('payment', 'trial', 'free', 'grant', 'upgrade')),
    CONSTRAINT strategy_access_period_check CHECK (ends_at > starts_at)
);
CREATE UNIQUE INDEX strategy_access_order_uq ON strategy_access(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX strategy_access_trial_uq ON strategy_access(user_id, strategy_id) WHERE source = 'trial';
CREATE INDEX strategy_access_user_idx ON strategy_access(user_id, strategy_id, ends_at);
CREATE INDEX strategy_access_strategy_idx ON strategy_access(strategy_id, ends_at);

CREATE TABLE strategy_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    tariff_id INTEGER NULL REFERENCES strategy_tariffs(id),
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_order_id INTEGER NULL REFERENCES orders(id),
    renew_failures INTEGER NOT NULL DEFAULT 0,
    last_renew_attempt_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT strategy_subscriptions_uq UNIQUE (user_id, strategy_id)
);