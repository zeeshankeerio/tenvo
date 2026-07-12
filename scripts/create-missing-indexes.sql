-- Create Missing Foreign Key Indexes
-- Run this during low-traffic period to avoid blocking writes
-- These indexes will improve JOIN performance

-- ============================================================================
-- MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- BOM Materials
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bom_materials_business_id 
ON bom_materials(business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bom_materials_material_id 
ON bom_materials(material_id);

-- BOMs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boms_business_id 
ON boms(business_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boms_product_id 
ON boms(product_id);

-- Businesses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_user_id 
ON businesses(user_id);

-- Campaigns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_segment_id 
ON campaigns(segment_id);

-- Customer Memberships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_memberships_initial_invoice_id 
ON customer_memberships(initial_invoice_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_memberships_recurring_invoice_id 
ON customer_memberships(recurring_invoice_id);

-- Expenses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_account_id 
ON expenses(account_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_vendor_id 
ON expenses(vendor_id);

-- GL Accounts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gl_accounts_parent_id 
ON gl_accounts(parent_id);

-- Invoice Templates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_templates_created_by 
ON invoice_templates(created_by);

-- Invoices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_by 
ON invoices(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_recurring_parent_id 
ON invoices(recurring_parent_id);

-- Journal Entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_reversed_by 
ON journal_entries(reversed_by);

-- POS Sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_sessions_user_id 
ON pos_sessions(user_id);

-- POS Terminals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_terminals_warehouse_id 
ON pos_terminals(warehouse_id);

-- POS Transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_transactions_customer_id 
ON pos_transactions(customer_id);

-- Product Batches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_batches_warehouse_id 
ON product_batches(warehouse_id);

-- Product Serials
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_serials_batch_id 
ON product_serials(batch_id);

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Orders by business and date (common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_business_date 
ON invoices(business_id, date) 
WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_transactions_business_created 
ON pos_transactions(business_id, created_at) 
WHERE is_voided = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storefront_orders_business_created 
ON storefront_orders(business_id, created_at);

-- Products by business and active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_business_active 
ON products(business_id, is_active, is_deleted);

-- Customers by business and active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_business_active 
ON customers(business_id, is_active, is_deleted);

-- ============================================================================
-- VERIFY INDEX CREATION
-- ============================================================================

-- Run this query to verify indexes were created:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
*/

-- Check index sizes:
/*
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;
*/
