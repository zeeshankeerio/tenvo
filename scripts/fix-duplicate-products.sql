-- Fix duplicate products before applying unique constraints
-- This script safely resolves duplicate SKUs, barcodes, and names

-- Step 1: Check for duplicates (read-only, safe to run)
-- =====================================================

-- Duplicate SKUs
SELECT 
  'Duplicate SKUs' as issue_type,
  business_id, 
  sku, 
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND sku IS NOT NULL
  AND TRIM(sku) != ''
GROUP BY business_id, sku
HAVING COUNT(*) > 1;

-- Duplicate Barcodes
SELECT 
  'Duplicate Barcodes' as issue_type,
  business_id, 
  barcode, 
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND barcode IS NOT NULL
  AND TRIM(barcode) != ''
GROUP BY business_id, barcode
HAVING COUNT(*) > 1;

-- Duplicate Names
SELECT 
  'Duplicate Names' as issue_type,
  business_id, 
  name, 
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND name IS NOT NULL
  AND TRIM(name) != ''
GROUP BY business_id, name
HAVING COUNT(*) > 1;

-- Step 2: Fix duplicates (ONLY RUN IF DUPLICATES FOUND ABOVE)
-- =============================================================
-- UNCOMMENT THESE LINES AFTER REVIEWING DUPLICATES:

-- Fix duplicate SKUs - append sequential number to duplicates (keep oldest)
/*
WITH ranked_skus AS (
  SELECT 
    id,
    sku,
    business_id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, sku 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND sku IS NOT NULL
    AND TRIM(sku) != ''
)
UPDATE products p
SET 
  sku = CONCAT(r.sku, '-', r.rn),
  updated_at = NOW()
FROM ranked_skus r
WHERE p.id = r.id
  AND r.rn > 1;

-- Fix duplicate barcodes - append sequential number
WITH ranked_barcodes AS (
  SELECT 
    id,
    barcode,
    business_id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, barcode 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND barcode IS NOT NULL
    AND TRIM(barcode) != ''
)
UPDATE products p
SET 
  barcode = CONCAT(r.barcode, '-', r.rn),
  updated_at = NOW()
FROM ranked_barcodes r
WHERE p.id = r.id
  AND r.rn > 1;

-- Fix duplicate names - append " (Copy N)" to duplicates
WITH ranked_names AS (
  SELECT 
    id,
    name,
    business_id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, name 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND name IS NOT NULL
    AND TRIM(name) != ''
)
UPDATE products p
SET 
  name = CONCAT(r.name, ' (Copy ', r.rn, ')'),
  updated_at = NOW()
FROM ranked_names r
WHERE p.id = r.id
  AND r.rn > 1;
*/

-- Step 3: Verify fixes (run after uncommenting and executing step 2)
-- ===================================================================
-- Should return 0 rows:

SELECT 'Remaining duplicate SKUs' as check_type, COUNT(*) as issues
FROM (
  SELECT business_id, sku
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND sku IS NOT NULL
    AND TRIM(sku) != ''
  GROUP BY business_id, sku
  HAVING COUNT(*) > 1
) sub;
