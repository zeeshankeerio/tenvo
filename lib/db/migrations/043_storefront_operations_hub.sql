-- Idempotent companion to prisma/migrations/20260618_storefront_operations_hub
-- Manual / hosted runs — see docs/DATABASE_MIGRATIONS.md

-- Storefront operations hub: contact message queue + daily analytics (visitors / conversion).
-- Safe on DBs that already have legacy storefront_analytics or contact tables.

-- ─── storefront_analytics (Prisma-aligned) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS storefront_analytics (
    id           UUID NOT NULL DEFAULT uuid_generate_v4(),
    business_id  UUID NOT NULL,
    date         DATE NOT NULL,
    orders_count INTEGER NOT NULL DEFAULT 0,
    revenue      DECIMAL(12, 2) NOT NULL DEFAULT 0,
    visitors     INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at   TIMESTAMPTZ(6) DEFAULT NOW(),
    CONSTRAINT storefront_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT storefront_analytics_business_id_fkey
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS orders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS revenue DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS visitors INTEGER DEFAULT 0;
ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ(6) DEFAULT NOW();
ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ(6) DEFAULT NOW();

UPDATE storefront_analytics SET id = uuid_generate_v4() WHERE id IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'storefront_analytics' AND column_name = 'id'
    ) THEN
        ALTER TABLE storefront_analytics ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        BEGIN
            ALTER TABLE storefront_analytics ALTER COLUMN id SET NOT NULL;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;
END $$;

-- Legacy composite PK (business_id, date) → uuid PK + unique (business_id, date)
DO $$
DECLARE
    pk_cols text;
BEGIN
    SELECT string_agg(a.attname, ',' ORDER BY a.attnum)
    INTO pk_cols
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'storefront_analytics'::regclass AND i.indisprimary;

    IF pk_cols = 'business_id,date' THEN
        ALTER TABLE storefront_analytics DROP CONSTRAINT IF EXISTS storefront_analytics_pkey;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'storefront_analytics_pkey' AND contype = 'p'
        ) THEN
            ALTER TABLE storefront_analytics ADD PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS storefront_analytics_business_id_date_key
    ON storefront_analytics (business_id, date);

CREATE INDEX IF NOT EXISTS idx_storefront_analytics_business_date
    ON storefront_analytics (business_id, date);

-- ─── storefront_contact_messages (hub request queue) ─────────────────────────

CREATE TABLE IF NOT EXISTS storefront_contact_messages (
    id             SERIAL PRIMARY KEY,
    business_id    UUID NOT NULL,
    customer_name  TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    subject        TEXT NOT NULL DEFAULT 'general',
    message        TEXT NOT NULL,
    order_number   TEXT,
    status         TEXT NOT NULL DEFAULT 'new',
    handled_at     TIMESTAMPTZ(6),
    handled_by     TEXT,
    metadata       JSONB DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

ALTER TABLE storefront_contact_messages ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ(6);
ALTER TABLE storefront_contact_messages ADD COLUMN IF NOT EXISTS handled_by TEXT;
ALTER TABLE storefront_contact_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE storefront_contact_messages ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE storefront_contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'storefront_contact_messages_business_id_fkey'
    ) THEN
        ALTER TABLE storefront_contact_messages
            ADD CONSTRAINT storefront_contact_messages_business_id_fkey
            FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_storefront_contact_messages_business_status
    ON storefront_contact_messages (business_id, status);

CREATE INDEX IF NOT EXISTS idx_storefront_contact_messages_business_created
    ON storefront_contact_messages (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storefront_contact_messages_business_subject
    ON storefront_contact_messages (business_id, subject);
