-- Idempotent repair / reference SQL for migration `20260517_audit_fixes`
-- Same logic as prisma/migrations/20260517_audit_fixes/migration.sql
-- Use in Supabase SQL editor if you need to align the DB before `prisma migrate resolve`.
-- See scripts/migrations/README.md

-- BUG-002: payments soft-delete columns
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON payments (is_deleted);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- BUG-006: product_stock_locations unique (multi-tenant)
ALTER TABLE product_stock_locations
DROP CONSTRAINT IF EXISTS unique_product_warehouse_state;

DROP INDEX IF EXISTS unique_product_warehouse_state;

DO $$
BEGIN
  ALTER TABLE product_stock_locations
    ADD CONSTRAINT unique_product_warehouse_state
    UNIQUE (business_id, product_id, warehouse_id, state);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

-- BUG-007: invoice_approvals composite unique
DROP INDEX IF EXISTS invoice_approvals_invoice_id_key;
ALTER TABLE invoice_approvals
DROP CONSTRAINT IF EXISTS invoice_approvals_invoice_id_key;

ALTER TABLE invoice_approvals
DROP CONSTRAINT IF EXISTS invoice_approvals_invoice_id_approved_by_key;

DROP INDEX IF EXISTS invoice_approvals_invoice_id_approved_by_key;

DO $$
BEGIN
  ALTER TABLE invoice_approvals
    ADD CONSTRAINT invoice_approvals_invoice_id_approved_by_key
    UNIQUE (invoice_id, approved_by);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_allocations_business_id
ON payment_allocations (business_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_status
ON inventory_reservations (product_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_product
ON purchase_items (purchase_id, product_id);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_creditnote_product
ON credit_note_items (credit_note_id, product_id);

ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
