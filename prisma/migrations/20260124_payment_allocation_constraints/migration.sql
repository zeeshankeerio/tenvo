-- Migration: Add Payment Allocation Integrity Constraints
-- Date: 2026-01-24
-- Purpose: Enforce business rules for payment allocations
-- Impact: Prevents invalid payment allocations (e.g., allocated to both invoice and purchase)

-- ============================================================================
-- PAYMENT ALLOCATION INTEGRITY CONSTRAINTS
-- ============================================================================

-- CONSTRAINT 1: Exactly one of invoice_id or purchase_id must be non-null
-- This prevents:
-- - Allocating a payment to both an invoice and a purchase
-- - Creating an allocation with neither invoice_id nor purchase_id
ALTER TABLE "payment_allocations" 
ADD CONSTRAINT "chk_payment_allocation_reference" 
CHECK (
  (invoice_id IS NOT NULL AND purchase_id IS NULL) OR 
  (invoice_id IS NULL AND purchase_id IS NOT NULL)
);

-- CONSTRAINT 2: Allocated amount must be positive
ALTER TABLE "payment_allocations" 
ADD CONSTRAINT "chk_payment_allocation_amount_positive" 
CHECK (amount > 0);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 
-- Run these queries to verify no existing data violates the constraints:
-- 
-- -- Check for allocations with both invoice_id and purchase_id
-- SELECT COUNT(*) as both_references
-- FROM payment_allocations 
-- WHERE invoice_id IS NOT NULL AND purchase_id IS NOT NULL;
--
-- -- Check for allocations with neither invoice_id nor purchase_id
-- SELECT COUNT(*) as no_references
-- FROM payment_allocations 
-- WHERE invoice_id IS NULL AND purchase_id IS NULL;
--
-- -- Check for allocations with non-positive amounts
-- SELECT COUNT(*) as invalid_amounts
-- FROM payment_allocations 
-- WHERE amount <= 0;
--
-- If any violations exist, fix them before applying this migration.
-- ============================================================================

-- ============================================================================
-- ADDITIONAL INDEXES FOR PAYMENT ALLOCATION QUERIES
-- ============================================================================

-- Index for finding all allocations for an invoice
CREATE INDEX IF NOT EXISTS "idx_payment_allocations_invoice" 
ON "payment_allocations" ("invoice_id") 
WHERE "invoice_id" IS NOT NULL;

-- Index for finding all allocations for a purchase
CREATE INDEX IF NOT EXISTS "idx_payment_allocations_purchase" 
ON "payment_allocations" ("purchase_id") 
WHERE "purchase_id" IS NOT NULL;

-- Index for finding all allocations for a payment
CREATE INDEX IF NOT EXISTS "idx_payment_allocations_payment" 
ON "payment_allocations" ("payment_id");

-- Composite index for payment reconciliation queries
CREATE INDEX IF NOT EXISTS "idx_payment_allocations_payment_amount" 
ON "payment_allocations" ("payment_id", "amount");
