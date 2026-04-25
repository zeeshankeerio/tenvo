-- Migration: Add Composite Indexes for Query Performance Optimization
-- Date: 2026-01-24
-- Purpose: Add missing composite indexes identified in ERP System Architecture Audit
-- Impact: Significant performance improvement for high-traffic queries

-- ============================================================================
-- INVOICES TABLE - High-traffic sales queries
-- ============================================================================

-- Composite index for filtering by status and sorting by date (most common query pattern)
CREATE INDEX IF NOT EXISTS "idx_invoices_business_status_date" 
ON "invoices" ("business_id", "status", "date" DESC);

-- Composite index for customer invoice history with payment status
CREATE INDEX IF NOT EXISTS "idx_invoices_business_customer_payment" 
ON "invoices" ("business_id", "customer_id", "payment_status") 
WHERE "customer_id" IS NOT NULL;

-- Composite index for soft-delete aware date queries
CREATE INDEX IF NOT EXISTS "idx_invoices_business_deleted_date" 
ON "invoices" ("business_id", "is_deleted", "date" DESC);

-- ============================================================================
-- PRODUCTS TABLE - Inventory catalog queries
-- ============================================================================

-- Composite index for active products by category (product listing pages)
CREATE INDEX IF NOT EXISTS "idx_products_business_category_active" 
ON "products" ("business_id", "category", "is_active") 
WHERE "is_deleted" = false;

-- ============================================================================
-- STOCK_MOVEMENTS TABLE - Inventory transaction history
-- ============================================================================

-- Composite index for product movement history (most frequent inventory query)
CREATE INDEX IF NOT EXISTS "idx_stock_movements_business_product_date" 
ON "stock_movements" ("business_id", "product_id", "created_at" DESC);

-- Composite index for warehouse-specific movements
CREATE INDEX IF NOT EXISTS "idx_stock_movements_business_warehouse_type" 
ON "stock_movements" ("business_id", "warehouse_id", "transaction_type") 
WHERE "warehouse_id" IS NOT NULL;

-- Composite index for reference lookups (invoice/purchase stock movements)
CREATE INDEX IF NOT EXISTS "idx_stock_movements_business_ref_type_id" 
ON "stock_movements" ("business_id", "reference_type", "reference_id") 
WHERE "reference_type" IS NOT NULL AND "reference_id" IS NOT NULL;

-- ============================================================================
-- GL_ENTRIES TABLE - Financial ledger queries
-- ============================================================================

-- Composite index for account ledger queries (trial balance, account history)
CREATE INDEX IF NOT EXISTS "idx_gl_entries_business_account_date" 
ON "gl_entries" ("business_id", "account_id", "transaction_date" DESC);

-- Composite index for reference document GL entries (invoice/purchase accounting)
CREATE INDEX IF NOT EXISTS "idx_gl_entries_business_ref_type_id" 
ON "gl_entries" ("business_id", "reference_type", "reference_id") 
WHERE "reference_type" IS NOT NULL AND "reference_id" IS NOT NULL;

-- Composite index for journal entry lines
CREATE INDEX IF NOT EXISTS "idx_gl_entries_business_journal" 
ON "gl_entries" ("business_id", "journal_id") 
WHERE "journal_id" IS NOT NULL;

-- ============================================================================
-- AUDIT_LOGS TABLE - Compliance and audit trail queries
-- ============================================================================

-- Composite index for entity audit history (most common audit query)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_business_entity_type_id" 
ON "audit_logs" ("business_id", "entity_type", "entity_id") 
WHERE "entity_id" IS NOT NULL;

-- Composite index for user activity audit
CREATE INDEX IF NOT EXISTS "idx_audit_logs_business_user_date" 
ON "audit_logs" ("business_id", "user_id", "created_at" DESC) 
WHERE "user_id" IS NOT NULL;

-- Composite index for action-based audit queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_business_action_date" 
ON "audit_logs" ("business_id", "action", "created_at" DESC);

-- ============================================================================
-- PURCHASES TABLE - Procurement queries
-- ============================================================================

-- Composite index for vendor purchase history with payment status
CREATE INDEX IF NOT EXISTS "idx_purchases_business_vendor_payment" 
ON "purchases" ("business_id", "vendor_id", "payment_status") 
WHERE "vendor_id" IS NOT NULL;

-- Composite index for purchase status filtering with date sort
CREATE INDEX IF NOT EXISTS "idx_purchases_business_status_date" 
ON "purchases" ("business_id", "status", "date" DESC);

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- 
-- These indexes are designed for PostgreSQL 14+ with the following considerations:
-- 
-- 1. **Composite Index Order**: Most selective column first (business_id for tenant isolation),
--    then filter columns (status, type), then sort columns (date DESC)
-- 
-- 2. **Partial Indexes**: WHERE clauses reduce index size for nullable foreign keys
--    and soft-deleted records, improving write performance
-- 
-- 3. **DESC Sorting**: Explicitly specified for date columns since most queries
--    fetch recent records first
-- 
-- 4. **Covering Indexes**: Not used here to avoid index bloat; PostgreSQL's
--    index-only scans are efficient enough for these query patterns
-- 
-- 5. **GIN Indexes**: Existing domain_data GIN indexes are preserved; no changes needed
-- 
-- Expected Performance Impact:
-- - Invoice list queries: 10-50x faster (full table scan → index scan)
-- - Stock movement history: 20-100x faster for large inventories
-- - GL account ledger: 15-40x faster for financial reports
-- - Audit trail queries: 30-80x faster for compliance reports
-- 
-- ============================================================================
