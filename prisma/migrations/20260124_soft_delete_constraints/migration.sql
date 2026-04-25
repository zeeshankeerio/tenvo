-- Migration: Add Soft-Delete Consistency CHECK Constraints
-- Date: 2026-01-24
-- Purpose: Enforce data integrity for soft-delete pattern across all tables
-- Impact: Prevents inconsistent state where is_deleted and deleted_at are out of sync

-- ============================================================================
-- SOFT-DELETE CONSISTENCY CONSTRAINTS
-- ============================================================================
-- 
-- Enforces the rule: 
-- - If is_deleted = false, then deleted_at MUST be NULL
-- - If is_deleted = true, then deleted_at MUST NOT be NULL
--
-- This prevents data corruption scenarios like:
-- - Record marked as deleted but no deletion timestamp
-- - Record marked as active but has a deletion timestamp
-- ============================================================================

-- CUSTOMERS TABLE
ALTER TABLE "customers" 
ADD CONSTRAINT "chk_customers_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- VENDORS TABLE
ALTER TABLE "vendors" 
ADD CONSTRAINT "chk_vendors_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- PRODUCTS TABLE
ALTER TABLE "products" 
ADD CONSTRAINT "chk_products_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- INVOICES TABLE
ALTER TABLE "invoices" 
ADD CONSTRAINT "chk_invoices_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- PURCHASES TABLE
ALTER TABLE "purchases" 
ADD CONSTRAINT "chk_purchases_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- PRODUCT_SERIALS TABLE
ALTER TABLE "product_serials" 
ADD CONSTRAINT "chk_product_serials_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- PRODUCT_VARIANTS TABLE
ALTER TABLE "product_variants" 
ADD CONSTRAINT "chk_product_variants_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- PRODUCT_BATCHES TABLE
ALTER TABLE "product_batches" 
ADD CONSTRAINT "chk_product_batches_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- EXPENSES TABLE
ALTER TABLE "expenses" 
ADD CONSTRAINT "chk_expenses_soft_delete_consistency" 
CHECK (
  (is_deleted = false AND deleted_at IS NULL) OR 
  (is_deleted = true AND deleted_at IS NOT NULL)
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 
-- Run these queries to verify no existing data violates the constraints:
-- 
-- SELECT 'customers' as table_name, COUNT(*) as violations
-- FROM customers 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'vendors', COUNT(*) FROM vendors 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'products', COUNT(*) FROM products 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'invoices', COUNT(*) FROM invoices 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'purchases', COUNT(*) FROM purchases 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'product_serials', COUNT(*) FROM product_serials 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'product_variants', COUNT(*) FROM product_variants 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'product_batches', COUNT(*) FROM product_batches 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL))
-- UNION ALL
-- SELECT 'expenses', COUNT(*) FROM expenses 
-- WHERE NOT ((is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL));
--
-- If any violations exist, fix them before applying this migration:
-- UPDATE table_name SET deleted_at = NULL WHERE is_deleted = false AND deleted_at IS NOT NULL;
-- UPDATE table_name SET deleted_at = NOW() WHERE is_deleted = true AND deleted_at IS NULL;
-- ============================================================================
