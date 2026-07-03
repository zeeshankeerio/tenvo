-- Tenant customer membership management — idempotent SQL mirror.
-- Canonical: prisma/migrations/20260629_membership_management/migration.sql

CREATE TABLE IF NOT EXISTS membership_plans (
    id               UUID NOT NULL DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL,
    product_id       UUID,
    vertical_key     VARCHAR(64) NOT NULL,
    name             TEXT NOT NULL,
    slug             TEXT,
    billing_interval VARCHAR(32) NOT NULL DEFAULT 'monthly',
    duration_days    INT,
    price            DECIMAL(12, 2) NOT NULL DEFAULT 0,
    compare_price    DECIMAL(12, 2),
    currency         VARCHAR(10) NOT NULL DEFAULT 'PKR',
    domain_rules     JSONB DEFAULT '{}'::jsonb,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    metadata         JSONB DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT membership_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS customer_memberships (
    id                          UUID NOT NULL DEFAULT gen_random_uuid(),
    business_id                 UUID NOT NULL,
    customer_id                 UUID NOT NULL,
    plan_id                     UUID NOT NULL,
    product_id                  UUID,
    status                      VARCHAR(32) NOT NULL DEFAULT 'pending',
    started_at                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    ends_at                     TIMESTAMPTZ(6),
    next_billing_at             TIMESTAMPTZ(6),
    auto_renew                  BOOLEAN NOT NULL DEFAULT true,
    source                      VARCHAR(32) NOT NULL DEFAULT 'hub',
    initial_storefront_order_id INTEGER,
    initial_pos_transaction_id  UUID,
    initial_invoice_id          UUID,
    recurring_invoice_id        UUID,
    amount_paid                 DECIMAL(12, 2) DEFAULT 0,
    domain_data                 JSONB DEFAULT '{}'::jsonb,
    cancelled_at                TIMESTAMPTZ(6),
    paused_at                   TIMESTAMPTZ(6),
    created_at                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_memberships_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS membership_events (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    business_id   UUID NOT NULL,
    membership_id UUID NOT NULL,
    event_type    VARCHAR(64) NOT NULL,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT membership_events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS membership_benefits (
    id           UUID NOT NULL DEFAULT gen_random_uuid(),
    business_id  UUID NOT NULL,
    plan_id      UUID NOT NULL,
    benefit_type VARCHAR(64) NOT NULL,
    value        JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT membership_benefits_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_plans_business_id_fkey') THEN
        ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_plans_product_id_fkey') THEN
        ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_product_id_fkey
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_memberships_business_id_fkey') THEN
        ALTER TABLE customer_memberships ADD CONSTRAINT customer_memberships_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_memberships_customer_id_fkey') THEN
        ALTER TABLE customer_memberships ADD CONSTRAINT customer_memberships_customer_id_fkey
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_memberships_plan_id_fkey') THEN
        ALTER TABLE customer_memberships ADD CONSTRAINT customer_memberships_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_memberships_initial_invoice_id_fkey') THEN
        ALTER TABLE customer_memberships ADD CONSTRAINT customer_memberships_initial_invoice_id_fkey
            FOREIGN KEY (initial_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_memberships_recurring_invoice_id_fkey') THEN
        ALTER TABLE customer_memberships ADD CONSTRAINT customer_memberships_recurring_invoice_id_fkey
            FOREIGN KEY (recurring_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_events_business_id_fkey') THEN
        ALTER TABLE membership_events ADD CONSTRAINT membership_events_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_events_membership_id_fkey') THEN
        ALTER TABLE membership_events ADD CONSTRAINT membership_events_membership_id_fkey
            FOREIGN KEY (membership_id) REFERENCES customer_memberships(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_benefits_business_id_fkey') THEN
        ALTER TABLE membership_benefits ADD CONSTRAINT membership_benefits_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_benefits_plan_id_fkey') THEN
        ALTER TABLE membership_benefits ADD CONSTRAINT membership_benefits_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS membership_plans_business_product_key
    ON membership_plans (business_id, product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_plans_business_vertical ON membership_plans (business_id, vertical_key, is_active);
CREATE INDEX IF NOT EXISTS idx_membership_plans_business_slug ON membership_plans (business_id, slug);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_business_customer_status ON customer_memberships (business_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_business_ends ON customer_memberships (business_id, ends_at);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_business_next_billing ON customer_memberships (business_id, next_billing_at);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_business_plan ON customer_memberships (business_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_membership_events_membership_created ON membership_events (membership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_events_business_type ON membership_events (business_id, event_type);
CREATE INDEX IF NOT EXISTS idx_membership_benefits_business_plan ON membership_benefits (business_id, plan_id);
