-- Migration: Add unique constraints for products table to support ON CONFLICT upserts
-- Date: 2026-07-13
-- Purpose: Fix "there is no unique or exclusion constraint matching the ON CONFLICT specification" errors
-- Impact: Enables proper upsert operations for inventory management

-- ============================================================================
-- PRODUCTS UNIQUE CONSTRAINTS
-- ============================================================================

-- Drop existing regular indexes before creating unique indexes
DROP INDEX IF EXISTS idx_products_business_id_sku;

-- Create soft-delete-aware partial unique index on (business_id, sku)
-- This prevents duplicate SKUs within the same business for active products
-- Allows SKU reuse after soft delete
CREATE UNIQUE INDEX IF NOT EXISTS "products_business_sku_active_key"
  ON "products"("business_id", "sku")
  WHERE COALESCE("is_deleted", false) = false
    AND "sku" IS NOT NULL
    AND TRIM("sku") != '';

-- Create soft-delete-aware partial unique index on (business_id, barcode)
-- This prevents duplicate barcodes within the same business for active products
CREATE UNIQUE INDEX IF NOT EXISTS "products_business_barcode_active_key"
  ON "products"("business_id", "barcode")
  WHERE COALESCE("is_deleted", false) = false
    AND "barcode" IS NOT NULL
    AND TRIM("barcode") != '';

-- Create soft-delete-aware partial unique index on (business_id, name)
-- This prevents duplicate product names within the same business for active products
-- Some businesses may want identical names with different SKUs, so this might be optional
-- For now, keeping it strict to prevent confusion
CREATE UNIQUE INDEX IF NOT EXISTS "products_business_name_active_key"
  ON "products"("business_id", "name")
  WHERE COALESCE("is_deleted", false) = false
    AND "name" IS NOT NULL
    AND TRIM("name") != '';

-- Recreate regular index for query performance (non-unique lookups)
CREATE INDEX IF NOT EXISTS "idx_products_business_id_sku"
  ON "products"("business_id", "sku");

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 
-- Run these queries to check for existing duplicate data that would violate the constraints:
-- 
-- Check for duplicate SKUs (active products only):
-- SELECT business_id, sku, COUNT(*) as count
-- FROM products
-- WHERE COALESCE(is_deleted, false) = false
--   AND sku IS NOT NULL
--   AND TRIM(sku) != ''
-- GROUP BY business_id, sku
-- HAVING COUNT(*) > 1;
--
-- Check for duplicate barcodes (active products only):
-- SELECT business_id, barcode, COUNT(*) as count
-- FROM products
-- WHERE COALESCE(is_deleted, false) = false
--   AND barcode IS NOT NULL
--   AND TRIM(barcode) != ''
-- GROUP BY business_id, barcode
-- HAVING COUNT(*) > 1;
--
-- Check for duplicate names (active products only):
-- SELECT business_id, name, COUNT(*) as count
-- FROM products
-- WHERE COALESCE(is_deleted, false) = false
--   AND name IS NOT NULL
--   AND TRIM(name) != ''
-- GROUP BY business_id, name
-- HAVING COUNT(*) > 1;
--
-- If duplicates exist, you'll need to resolve them before running this migration.
-- Options:
-- 1. Soft-delete duplicates: UPDATE products SET is_deleted = true, deleted_at = NOW() WHERE id IN (...);
-- 2. Modify SKUs/names: UPDATE products SET sku = sku || '-2' WHERE id IN (...);
-- 3. Merge duplicates (complex, requires data migration)
-- ============================================================================

-- ============================================================================
-- NOTES
-- ============================================================================
-- These are PARTIAL UNIQUE indexes (WHERE clause) which means:
-- 1. Only active products (is_deleted = false) are enforced for uniqueness
-- 2. Soft-deleted products can have duplicate SKUs/barcodes/names
-- 3. NULL or empty string SKUs/barcodes/names are not enforced (multiple products can have NULL sku)
-- 4. This allows SKU reuse: Delete product A with SKU "ABC" → Create new product B with SKU "ABC"
--
-- For ON CONFLICT clauses to work, you must reference these exact constraints:
-- - INSERT INTO products (...) VALUES (...) 
--   ON CONFLICT (business_id, sku) WHERE COALESCE(is_deleted, false) = false DO UPDATE ...
--
-- Or use a simpler approach with explicit conflict handling in application code.
-- ============================================================================
