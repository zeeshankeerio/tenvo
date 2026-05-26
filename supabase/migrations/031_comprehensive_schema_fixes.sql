-- ============================================================
-- Migration 031: Comprehensive Schema Fixes
-- Fixes all missing columns causing 42703/42P01 errors
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ─── payments table ──────────────────────────────────────────
-- status, is_deleted, deleted_at, domain_data used by:
--   ExpenseService, storefront/orders.js, storefront/payments.js, dashboard.js

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status       VARCHAR(20)  DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_deleted   BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS domain_data  JSONB        DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON payments (is_deleted);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments (status);

-- ─── journal_entries table ────────────────────────────────────
-- status used by /api/migrate route and finance actions

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'posted';

-- ─── businesses table ─────────────────────────────────────────
-- settings JSONB used throughout

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- ─── purchase_items table ─────────────────────────────────────
-- business_id used by purchase queries

ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_purchase_items_business_id ON purchase_items (business_id);

-- ─── products table ───────────────────────────────────────────
-- Storefront extra columns (safe no-ops if already applied)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS compare_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS is_featured   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_status  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS images        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_variants  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating        DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS review_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enable_reviews BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_slug        ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_active   ON products (is_active);

-- ─── product_specifications table ────────────────────────────
-- Referenced by getProductBySlug (now wrapped in try/catch, but create anyway)

CREATE TABLE IF NOT EXISTS product_specifications (
  id           SERIAL PRIMARY KEY,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_name  VARCHAR(255) NOT NULL,
  attribute_value TEXT,
  display_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id
  ON product_specifications (product_id);

-- ─── product_variants table ───────────────────────────────────
-- Referenced by getProductBySlug (now wrapped in try/catch, but create anyway)

CREATE TABLE IF NOT EXISTS product_variants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku           VARCHAR(255),
  price         DECIMAL(12,2),
  mrp           DECIMAL(12,2),
  stock         INTEGER DEFAULT 0,
  stock_status  VARCHAR(50),
  attribute_1_name  VARCHAR(100),
  attribute_1_value VARCHAR(255),
  attribute_2_name  VARCHAR(100),
  attribute_2_value VARCHAR(255),
  attribute_3_name  VARCHAR(100),
  attribute_3_value VARCHAR(255),
  image_url     TEXT,
  is_default    BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id   ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_business_id  ON product_variants (business_id);

-- ─── storefront_analytics table ──────────────────────────────
-- Used by storefront/orders.js (already wrapped in try/catch)

CREATE TABLE IF NOT EXISTS storefront_analytics (
  id           SERIAL PRIMARY KEY,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  orders_count INTEGER DEFAULT 0,
  revenue      DECIMAL(14,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, date)
);

CREATE INDEX IF NOT EXISTS idx_storefront_analytics_business_date
  ON storefront_analytics (business_id, date);

-- ─── Core table safety net ────────────────────────────────────

ALTER TABLE gl_accounts    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE vendors        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE product_batches     ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ─── product_stock_locations constraint fix ───────────────────
-- Ensure multi-tenancy constraint is correct

ALTER TABLE product_stock_locations
  DROP CONSTRAINT IF EXISTS unique_product_warehouse_state;

ALTER TABLE product_stock_locations
  ADD CONSTRAINT unique_product_warehouse_state
  UNIQUE (business_id, product_id, warehouse_id, state);

-- ─── invoice_approvals constraint fix ────────────────────────

DROP INDEX IF EXISTS invoice_approvals_invoice_id_key;
ALTER TABLE invoice_approvals
  DROP CONSTRAINT IF EXISTS invoice_approvals_invoice_id_key;

ALTER TABLE invoice_approvals
  ADD CONSTRAINT invoice_approvals_invoice_id_approved_by_key
  UNIQUE (invoice_id, approved_by);

-- ─── Performance indexes ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payment_allocations_business_id
  ON payment_allocations (business_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_status
  ON inventory_reservations (product_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_product
  ON purchase_items (purchase_id, product_id);

-- ============================================================
-- End of migration 031
-- ============================================================
