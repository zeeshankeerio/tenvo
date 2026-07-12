-- Check for duplicate products that would violate the new unique constraints

-- Check for duplicate SKUs (active products only)
SELECT 'Duplicate SKUs' as issue_type, business_id, sku, COUNT(*) as count, array_agg(id) as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND sku IS NOT NULL
  AND TRIM(sku) != ''
GROUP BY business_id, sku
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Check for duplicate barcodes (active products only)
SELECT 'Duplicate Barcodes' as issue_type, business_id, barcode, COUNT(*) as count, array_agg(id) as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND barcode IS NOT NULL
  AND TRIM(barcode) != ''
GROUP BY business_id, barcode
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Check for duplicate names (active products only)
SELECT 'Duplicate Names' as issue_type, business_id, name, COUNT(*) as count, array_agg(id) as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND name IS NOT NULL
  AND TRIM(name) != ''
GROUP BY business_id, name
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Summary of issues
SELECT 
  'Duplicate SKUs' as issue,
  COUNT(DISTINCT sku) as affected_skus,
  SUM(cnt) as total_duplicates
FROM (
  SELECT sku, COUNT(*) as cnt
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND sku IS NOT NULL
    AND TRIM(sku) != ''
  GROUP BY business_id, sku
  HAVING COUNT(*) > 1
) t
UNION ALL
SELECT 
  'Duplicate Barcodes' as issue,
  COUNT(DISTINCT barcode) as affected_items,
  SUM(cnt) as total_duplicates
FROM (
  SELECT barcode, COUNT(*) as cnt
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND barcode IS NOT NULL
    AND TRIM(barcode) != ''
  GROUP BY business_id, barcode
  HAVING COUNT(*) > 1
) t
UNION ALL
SELECT 
  'Duplicate Names' as issue,
  COUNT(DISTINCT name) as affected_items,
  SUM(cnt) as total_duplicates
FROM (
  SELECT name, COUNT(*) as cnt
  FROM products
  WHERE COALESCE(is_deleted, false) = false
    AND name IS NOT NULL
    AND TRIM(name) != ''
  GROUP BY business_id, name
  HAVING COUNT(*) > 1
) t;
