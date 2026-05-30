-- Migration: Backend Audit Critical Fixes (Comprehensive)
-- Date: 2026-05-17
-- Bugs Fixed: BUG-002, BUG-006, BUG-007, Payment Soft-Delete, Performance Indexes

-- ============================================================
-- BUG-002: Add missing columns to payments table
-- PaymentService.voidPayment() sets status, is_deleted, deleted_at
-- but these columns didn't exist, causing SQL errors.
-- ============================================================
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for soft-delete filtering on payments
CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON payments (is_deleted);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ============================================================
-- BUG-006: Fix product_stock_locations unique constraint
-- Old constraint was missing business_id, breaking multi-tenancy.
-- ============================================================
-- Constraint and/or UNIQUE INDEX may already exist under this name (partial applies, or index-only unique).
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

-- ============================================================
-- BUG-007: Fix invoice_approvals unique constraint
-- Allow multi-level approval chains.
-- ============================================================
DROP INDEX IF EXISTS invoice_approvals_invoice_id_key;
ALTER TABLE invoice_approvals
DROP CONSTRAINT IF EXISTS invoice_approvals_invoice_id_key;

-- Partial prior runs may have created the new unique under this name (42P07 if re-applied).
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

-- ============================================================
-- Performance indexes for payment_allocations
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payment_allocations_business_id
ON payment_allocations (business_id);

-- ============================================================
-- Performance indexes for inventory_reservations
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_status
ON inventory_reservations (product_id, status);

-- ============================================================
-- Performance indexes for purchase_items
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_product
ON purchase_items (purchase_id, product_id);

-- ============================================================
-- Performance indexes for credit_note_items
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_credit_note_items_creditnote_product
ON credit_note_items (credit_note_id, product_id);

-- ============================================================
-- Ensure is_active exists on all key tables
-- These should already exist per schema, but safety net.
-- ============================================================
ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
