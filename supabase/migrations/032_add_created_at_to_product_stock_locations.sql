-- ============================================
-- Migration 032: Add created_at to product_stock_locations
-- ============================================
-- This migration adds the missing created_at column to product_stock_locations
-- which is referenced in the storefront order processing code for FIFO logic.

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_stock_locations' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE product_stock_locations 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Backfill existing rows with updated_at or NOW() if updated_at is null
        UPDATE product_stock_locations 
        SET created_at = COALESCE(updated_at, NOW())
        WHERE created_at IS NULL;
    END IF;
END $$;

-- Create index on created_at for FIFO ordering performance
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_created_at 
ON product_stock_locations(created_at ASC NULLS LAST);

-- Add comment explaining the column's purpose
COMMENT ON COLUMN product_stock_locations.created_at IS 
'Timestamp of when this stock location record was created. Used for FIFO (First In First Out) stock depletion logic in storefront orders.';
