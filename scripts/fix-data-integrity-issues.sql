-- Fix Data Integrity Issues
-- Run this to clean up data quality issues found in audit

-- ============================================================================
-- FIX 1: Products with NULL names
-- ============================================================================

-- Check how many products have NULL names
SELECT COUNT(*) as null_name_count
FROM products
WHERE name IS NULL;

-- Show details of products with NULL names
SELECT id, business_id, sku, category, price, stock, created_at
FROM products
WHERE name IS NULL
ORDER BY created_at DESC;

-- Fix: Set name to SKU or generate a default name
UPDATE products
SET name = CASE
    WHEN sku IS NOT NULL AND sku != '' THEN sku
    WHEN category IS NOT NULL THEN category || ' Product'
    ELSE 'Product ' || id
END
WHERE name IS NULL;

-- Verify fix
SELECT COUNT(*) as remaining_null_names
FROM products
WHERE name IS NULL;

-- Add constraint to prevent future NULL names
ALTER TABLE products
ALTER COLUMN name SET NOT NULL;

-- ============================================================================
-- FIX 2: Check for orphaned records (should be none per audit)
-- ============================================================================

-- Verify no orphaned invoice items
SELECT COUNT(*) as orphaned_invoice_items
FROM invoice_items ii
WHERE NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = ii.invoice_id
);

-- Verify no orphaned POS transaction items
SELECT COUNT(*) as orphaned_pos_items
FROM pos_transaction_items pti
WHERE NOT EXISTS (
    SELECT 1 FROM pos_transactions pt WHERE pt.id = pti.transaction_id
);

-- Verify no orphaned storefront order items
SELECT COUNT(*) as orphaned_storefront_items
FROM storefront_order_items soi
WHERE NOT EXISTS (
    SELECT 1 FROM storefront_orders so WHERE so.id = soi.order_id
);

-- Verify no products without business
SELECT COUNT(*) as orphaned_products
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = p.business_id
);

-- ============================================================================
-- FIX 3: Ensure business_id is set on all required tables
-- ============================================================================

-- Check tables that should have business_id
SELECT 
    'invoices' as table_name,
    COUNT(*) as records_missing_business_id
FROM invoices
WHERE business_id IS NULL

UNION ALL

SELECT 
    'products',
    COUNT(*)
FROM products
WHERE business_id IS NULL

UNION ALL

SELECT 
    'customers',
    COUNT(*)
FROM customers
WHERE business_id IS NULL

UNION ALL

SELECT 
    'pos_transactions',
    COUNT(*)
FROM pos_transactions
WHERE business_id IS NULL

UNION ALL

SELECT 
    'storefront_orders',
    COUNT(*)
FROM storefront_orders
WHERE business_id IS NULL;

-- ============================================================================
-- FIX 4: Validate order numbers are unique per business
-- ============================================================================

-- Check for duplicate invoice numbers within same business
SELECT 
    business_id,
    invoice_number,
    COUNT(*) as duplicate_count
FROM invoices
WHERE invoice_number IS NOT NULL
  AND (is_deleted = false OR is_deleted IS NULL)
GROUP BY business_id, invoice_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Check for duplicate storefront order numbers within same business
SELECT 
    business_id,
    order_number,
    COUNT(*) as duplicate_count
FROM storefront_orders
WHERE order_number IS NOT NULL
GROUP BY business_id, order_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- FIX 5: Clean up any test/incomplete data
-- ============================================================================

-- Find businesses with no orders or products (potential test data)
SELECT 
    b.id,
    b.business_name,
    b.created_at,
    (SELECT COUNT(*) FROM products WHERE business_id = b.id) as product_count,
    (SELECT COUNT(*) FROM invoices WHERE business_id = b.id) as invoice_count,
    (SELECT COUNT(*) FROM pos_transactions WHERE business_id = b.id) as pos_count,
    (SELECT COUNT(*) FROM storefront_orders WHERE business_id = b.id) as storefront_count
FROM businesses b
WHERE (
    (SELECT COUNT(*) FROM products WHERE business_id = b.id) = 0
    AND (SELECT COUNT(*) FROM invoices WHERE business_id = b.id) = 0
    AND (SELECT COUNT(*) FROM pos_transactions WHERE business_id = b.id) = 0
    AND (SELECT COUNT(*) FROM storefront_orders WHERE business_id = b.id) = 0
)
AND b.created_at < CURRENT_DATE - INTERVAL '30 days'
ORDER BY b.created_at;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Run these after fixes to verify data integrity

-- 1. All products have names
SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE name IS NULL) = 0 
        THEN '✅ All products have names'
        ELSE '❌ ' || COUNT(*) FILTER (WHERE name IS NULL) || ' products missing names'
    END as validation_result
FROM products;

-- 2. All orders have valid business_id
SELECT 
    'invoices' as table_name,
    CASE 
        WHEN COUNT(*) FILTER (WHERE business_id IS NULL) = 0 
        THEN '✅ All records have business_id'
        ELSE '❌ ' || COUNT(*) FILTER (WHERE business_id IS NULL) || ' records missing business_id'
    END as validation_result
FROM invoices

UNION ALL

SELECT 
    'pos_transactions',
    CASE 
        WHEN COUNT(*) FILTER (WHERE business_id IS NULL) = 0 
        THEN '✅ All records have business_id'
        ELSE '❌ ' || COUNT(*) FILTER (WHERE business_id IS NULL) || ' records missing business_id'
    END
FROM pos_transactions

UNION ALL

SELECT 
    'storefront_orders',
    CASE 
        WHEN COUNT(*) FILTER (WHERE business_id IS NULL) = 0 
        THEN '✅ All records have business_id'
        ELSE '❌ ' || COUNT(*) FILTER (WHERE business_id IS NULL) || ' records missing business_id'
    END
FROM storefront_orders;

-- 3. No orphaned records
SELECT 
    'invoice_items' as table_name,
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ No orphaned records'
        ELSE '❌ ' || COUNT(*) || ' orphaned records'
    END as validation_result
FROM invoice_items ii
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = ii.invoice_id);

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT 
    'Data Integrity Check' as check_type,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE name IS NOT NULL) as valid_names,
    COUNT(*) FILTER (WHERE business_id IS NOT NULL) as valid_business_ids,
    COUNT(*) FILTER (WHERE name IS NOT NULL AND business_id IS NOT NULL) as fully_valid
FROM products;
