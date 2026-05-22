-- Migration: Add missing storefront columns
-- Date: 2024-01-20
-- Description: Adds missing columns needed for storefront functionality

-- Add is_default to product_variants if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variants' 
        AND column_name = 'is_default'
    ) THEN
        ALTER TABLE product_variants ADD COLUMN is_default BOOLEAN DEFAULT false;
        
        -- Set first variant of each product as default (using created_at since id is UUID)
        UPDATE product_variants pv
        SET is_default = true
        WHERE pv.id IN (
            SELECT DISTINCT ON (product_id) id
            FROM product_variants
            ORDER BY product_id, created_at ASC
        );
        
        CREATE INDEX IF NOT EXISTS idx_product_variants_is_default ON product_variants(is_default);
        
        RAISE NOTICE 'Added is_default column to product_variants';
    ELSE
        RAISE NOTICE 'is_default column already exists in product_variants';
    END IF;
END $$;

-- Add category_id to products if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE products ADD COLUMN category_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
        
        RAISE NOTICE 'Added category_id column to products';
    ELSE
        RAISE NOTICE 'category_id column already exists in products';
    END IF;
END $$;

-- Add image_url to product_variants if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variants' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE product_variants ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to product_variants';
    ELSE
        RAISE NOTICE 'image_url column already exists in product_variants';
    END IF;
END $$;

-- Add sku to product_variants if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_variants' 
        AND column_name = 'sku'
    ) THEN
        ALTER TABLE product_variants ADD COLUMN sku VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
        RAISE NOTICE 'Added sku column to product_variants';
    ELSE
        RAISE NOTICE 'sku column already exists in product_variants';
    END IF;
END $$;

-- Verify columns were added
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('product_variants', 'products')
AND column_name IN ('is_default', 'category_id', 'image_url', 'sku')
ORDER BY table_name, column_name;

-- Show success message
SELECT 'Migration completed successfully' as status;
