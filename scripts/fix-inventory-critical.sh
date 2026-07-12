#!/bin/bash
# Critical Inventory Fixes - Run immediately
# Generated from INVENTORY_ROOT_CAUSE_ANALYSIS.md

set -e

echo "🚨 CRITICAL INVENTORY FIXES - Starting..."
echo ""

# Step 1: Backup database
echo "📦 Step 1/5: Creating database backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_before_inventory_fix_${timestamp}.sql"
echo "✅ Backup created: backup_before_inventory_fix_${timestamp}.sql"
echo ""

# Step 2: Check current migration status
echo "🔍 Step 2/5: Checking migration status..."
npx prisma migrate status
echo ""

# Step 3: Apply pending migrations
echo "⚡ Step 3/5: Applying critical migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"
echo ""

# Step 4: Verify unique constraints
echo "🔐 Step 4/5: Verifying unique constraints..."
psql $DATABASE_URL << 'EOF'
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All product unique constraints present'
    ELSE '❌ Missing constraints: ' || (3 - COUNT(*))::text
  END as status
FROM pg_indexes 
WHERE tablename = 'products' 
  AND indexname IN (
    'products_business_sku_active_key',
    'products_business_barcode_active_key', 
    'products_business_name_active_key'
  );
EOF
echo ""

# Step 5: Check for orphaned stock (products without locations)
echo "🔎 Step 5/5: Checking for orphaned stock..."
psql $DATABASE_URL << 'EOF'

SELECT 
  COUNT(*) as orphaned_products,
  SUM(p.stock) as orphaned_stock_units
FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.stock > 0
  AND p.is_deleted = false
  AND psl.id IS NULL;
EOF
echo ""

echo "🎉 Critical checks complete!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Review backup file if rollback needed"
echo "2. Apply code fixes from INVENTORY_ROOT_CAUSE_ANALYSIS.md"
echo "3. Run end-to-end checkout test"
echo "4. Monitor PostgreSQL logs for errors"
echo ""
echo "📖 Full details: INVENTORY_ROOT_CAUSE_ANALYSIS.md"
