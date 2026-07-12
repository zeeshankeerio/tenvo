-- Fix duplicate products before applying unique constraints
-- This script handles duplicates by appending a suffix to make them unique

-- ============================================================================
-- Fix Duplicate SKUs
-- ============================================================================
DO $$
DECLARE
    dup RECORD;
    product RECORD;
    counter INT;
BEGIN
    -- Find all duplicate SKUs
    FOR dup IN 
        SELECT business_id, sku
        FROM products
        WHERE COALESCE(is_deleted, false) = false
          AND sku IS NOT NULL
          AND TRIM(sku) != ''
        GROUP BY business_id, sku
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- For each duplicate group, keep the first one and rename the others
        FOR product IN
            SELECT id, sku, name, created_at
            FROM products
            WHERE business_id = dup.business_id 
              AND sku = dup.sku
              AND COALESCE(is_deleted, false) = false
            ORDER BY created_at ASC, id ASC
            OFFSET 1  -- Skip the first (oldest) one
        LOOP
            counter := counter + 1;
            -- Append suffix to make unique
            UPDATE products
            SET sku = dup.sku || '-DUP' || counter,
                updated_at = NOW()
            WHERE id = product.id;
            
            RAISE NOTICE 'Fixed duplicate SKU: % → % for product: %', 
                dup.sku, dup.sku || '-DUP' || counter, product.name;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- Fix Duplicate Barcodes
-- ============================================================================
DO $$
DECLARE
    dup RECORD;
    product RECORD;
    counter INT;
BEGIN
    -- Find all duplicate barcodes
    FOR dup IN 
        SELECT business_id, barcode
        FROM products
        WHERE COALESCE(is_deleted, false) = false
          AND barcode IS NOT NULL
          AND TRIM(barcode) != ''
        GROUP BY business_id, barcode
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- For each duplicate group, keep the first one and rename the others
        FOR product IN
            SELECT id, barcode, name, created_at
            FROM products
            WHERE business_id = dup.business_id 
              AND barcode = dup.barcode
              AND COALESCE(is_deleted, false) = false
            ORDER BY created_at ASC, id ASC
            OFFSET 1  -- Skip the first (oldest) one
        LOOP
            counter := counter + 1;
            -- Append suffix to make unique
            UPDATE products
            SET barcode = dup.barcode || '-DUP' || counter,
                updated_at = NOW()
            WHERE id = product.id;
            
            RAISE NOTICE 'Fixed duplicate Barcode: % → % for product: %', 
                dup.barcode, dup.barcode || '-DUP' || counter, product.name;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- Fix Duplicate Names
-- ============================================================================
DO $$
DECLARE
    dup RECORD;
    product RECORD;
    counter INT;
BEGIN
    -- Find all duplicate names
    FOR dup IN 
        SELECT business_id, name
        FROM products
        WHERE COALESCE(is_deleted, false) = false
          AND name IS NOT NULL
          AND TRIM(name) != ''
        GROUP BY business_id, name
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        -- For each duplicate group, keep the first one and rename the others
        FOR product IN
            SELECT id, name, sku, created_at
            FROM products
            WHERE business_id = dup.business_id 
              AND name = dup.name
              AND COALESCE(is_deleted, false) = false
            ORDER BY created_at ASC, id ASC
            OFFSET 1  -- Skip the first (oldest) one
        LOOP
            counter := counter + 1;
            -- Append suffix to make unique
            UPDATE products
            SET name = dup.name || ' (' || counter || ')',
                updated_at = NOW()
            WHERE id = product.id;
            
            RAISE NOTICE 'Fixed duplicate Name: % → % for SKU: %', 
                dup.name, dup.name || ' (' || counter || ')', product.sku;
        END LOOP;
    END LOOP;
END $$;

-- Verify no duplicates remain
SELECT 'Remaining Duplicate SKUs' as issue, COUNT(*) as count
FROM (
    SELECT business_id, sku
    FROM products
    WHERE COALESCE(is_deleted, false) = false
      AND sku IS NOT NULL
      AND TRIM(sku) != ''
    GROUP BY business_id, sku
    HAVING COUNT(*) > 1
) t
UNION ALL
SELECT 'Remaining Duplicate Barcodes', COUNT(*)
FROM (
    SELECT business_id, barcode
    FROM products
    WHERE COALESCE(is_deleted, false) = false
      AND barcode IS NOT NULL
      AND TRIM(barcode) != ''
    GROUP BY business_id, barcode
    HAVING COUNT(*) > 1
) t
UNION ALL
SELECT 'Remaining Duplicate Names', COUNT(*)
FROM (
    SELECT business_id, name
    FROM products
    WHERE COALESCE(is_deleted, false) = false
      AND name IS NOT NULL
      AND TRIM(name) != ''
    GROUP BY business_id, name
    HAVING COUNT(*) > 1
) t;
