-- Test script to verify products unique constraints are working
-- Run this AFTER applying the migration

\echo '=========================================='
\echo 'Testing Products Unique Constraints'
\echo '=========================================='
\echo ''

-- Test 1: Check if constraints exist
\echo 'Test 1: Checking if unique indexes exist...'
SELECT 
    i.relname AS index_name,
    'EXISTS' as status
FROM pg_index idx
INNER JOIN pg_class i ON i.oid = idx.indexrelid
INNER JOIN pg_class t ON t.oid = idx.indrelid
WHERE t.relname = 'products'
  AND i.relname IN (
    'products_business_sku_active_key',
    'products_business_barcode_active_key',
    'products_business_name_active_key'
  )
ORDER BY i.relname;

\echo ''

-- Test 2: Try to create a duplicate SKU (should fail if constraints work)
\echo 'Test 2: Testing SKU uniqueness (this should fail if working)...'
\echo 'Creating test product with SKU "TEST-001"...'

-- Create first product
INSERT INTO products (
    id, business_id, name, sku, price, stock, is_deleted, created_at
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM businesses WHERE is_active = true LIMIT 1),
    'Test Product 1',
    'TEST-CONSTRAINT-001',
    100,
    10,
    false,
    NOW()
) ON CONFLICT DO NOTHING;

\echo 'Attempting to create duplicate SKU (should fail)...'

-- Try to create duplicate (should fail with unique constraint violation)
DO $$
DECLARE
    test_business_id UUID;
    duplicate_error BOOLEAN := false;
BEGIN
    SELECT id INTO test_business_id FROM businesses WHERE is_active = true LIMIT 1;
    
    BEGIN
        INSERT INTO products (
            id, business_id, name, sku, price, stock, is_deleted, created_at
        ) VALUES (
            uuid_generate_v4(),
            test_business_id,
            'Test Product 2 (Duplicate SKU)',
            'TEST-CONSTRAINT-001',
            150,
            5,
            false,
            NOW()
        );
        
        RAISE NOTICE '❌ FAIL: Duplicate SKU was allowed! Constraint not working.';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE '✅ PASS: Duplicate SKU correctly rejected (constraint: %)!', SQLERRM;
            duplicate_error := true;
    END;
    
    IF NOT duplicate_error THEN
        RAISE NOTICE '⚠ WARNING: Unique constraint may not be working correctly';
    END IF;
END $$;

\echo ''

-- Test 3: Verify soft-delete allows SKU reuse
\echo 'Test 3: Testing SKU reuse after soft delete...'

DO $$
DECLARE
    test_business_id UUID;
    test_product_id UUID;
BEGIN
    SELECT id INTO test_business_id FROM businesses WHERE is_active = true LIMIT 1;
    
    -- Soft delete the first test product
    UPDATE products 
    SET is_deleted = true, deleted_at = NOW()
    WHERE sku = 'TEST-CONSTRAINT-001' 
      AND business_id = test_business_id
      AND is_deleted = false
    RETURNING id INTO test_product_id;
    
    IF test_product_id IS NOT NULL THEN
        RAISE NOTICE 'Soft-deleted product ID: %', test_product_id;
        
        -- Now try to create a new product with the same SKU (should work)
        BEGIN
            INSERT INTO products (
                id, business_id, name, sku, price, stock, is_deleted, created_at
            ) VALUES (
                uuid_generate_v4(),
                test_business_id,
                'Test Product 3 (Reused SKU)',
                'TEST-CONSTRAINT-001',
                200,
                15,
                false,
                NOW()
            );
            
            RAISE NOTICE '✅ PASS: SKU reuse after soft delete works correctly!';
        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE '❌ FAIL: SKU reuse blocked even after soft delete!';
        END;
    END IF;
END $$;

\echo ''

-- Cleanup test data
\echo 'Cleaning up test data...'
DELETE FROM products WHERE sku = 'TEST-CONSTRAINT-001';
\echo 'Test products removed.'

\echo ''
\echo '=========================================='
\echo 'Test Summary'
\echo '=========================================='
\echo 'If all tests passed:'
\echo '  ✅ Unique indexes exist'
\echo '  ✅ Duplicate SKUs are prevented'
\echo '  ✅ SKU reuse works after soft delete'
\echo ''
\echo 'The products constraint fix is working correctly!'
\echo '=========================================='
