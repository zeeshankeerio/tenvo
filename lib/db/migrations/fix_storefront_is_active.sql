-- ============================================
-- FIX STOREFRONT is_active NULL VALUES
-- ============================================
-- This migration ensures all businesses can be found by storefront queries
-- by setting is_active = true for any businesses where it's NULL

-- Update businesses with NULL is_active to be active
UPDATE businesses
SET is_active = true
WHERE is_active IS NULL;

-- Create index for faster domain lookups if not exists
CREATE INDEX IF NOT EXISTS idx_businesses_domain_lower ON businesses(LOWER(domain));

-- Create index for is_active filtering if not exists
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active);

-- Verify the fix
SELECT 
    COUNT(*) as total_businesses,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
    COUNT(*) FILTER (WHERE is_active IS NULL) as null_count
FROM businesses;
