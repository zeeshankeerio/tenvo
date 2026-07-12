# 🚀 Inventory Fix Deployment Checklist

**Use this checklist to safely deploy the inventory fixes**  
**Estimated Time:** 45-60 minutes  
**Risk Level:** Medium (database changes require careful execution)

---

## Pre-Deployment Verification

- [ ] All code changes committed to version control
- [ ] Backup strategy confirmed
- [ ] Rollback plan understood
- [ ] Database credentials available
- [ ] Deployment window scheduled (low-traffic time recommended)
- [ ] Team notified of deployment

---

## Phase 1: Pre-Flight Checks (10 minutes)

### ✅ Verify Environment

```bash
cd e:\tenvo-main

# Check Node/npm versions
node --version  # Should be >= 18
npm --version

# Check database connection
npx prisma db execute --stdin <<< "SELECT 1;"
# Should return: 1

# Check current migration status
npx prisma migrate status
```

**Expected:** Migration `20260713_products_unique_constraints` shows as FAILED

### ✅ Review Code Changes

```bash
# See what was changed
git diff HEAD~1 HEAD --stat

# Review specific files
git show HEAD:lib/actions/premium/automation/inventory_composite.js
git show HEAD:components/InventoryManager.jsx
```

**Files Changed:**
- [x] `lib/actions/premium/automation/inventory_composite.js` - Invalid columns removed
- [x] `components/InventoryManager.jsx` - Batch extraction added
- [x] Scripts created: `fix-duplicate-products.sql`, `fix-inventory-critical.sh`

---

## Phase 2: Database Backup (5 minutes)

### ✅ Create Full Backup

```bash
# Create backup with timestamp
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backups/backup_pre_inventory_fix_${timestamp}.sql"

# Verify backup size (should be > 0)
ls -lh backups/backup_pre_inventory_fix_*.sql

# Test backup is readable
head -20 "backups/backup_pre_inventory_fix_${timestamp}.sql"
```

**Checkpoint:** Backup file created and > 1MB  
**If fails:** DO NOT PROCEED - fix database connection first

---

## Phase 3: Check for Duplicate Data (10 minutes)

### ✅ Run Duplicate Detection Script

```bash
# Check for duplicates (read-only, safe)
psql $DATABASE_URL -f scripts/fix-duplicate-products.sql > duplicate_check_results.txt

# Review results
cat duplicate_check_results.txt
```

**Decision Point:**

**If NO duplicates found:**
- ✅ Proceed to Phase 4

**If duplicates found:**
- Review `duplicate_check_results.txt`
- Note the product IDs and SKUs
- Decide on fix strategy:
  - **Option A:** Auto-rename (safest, automatic)
  - **Option B:** Manual review and merge (best data quality, time-consuming)
  - **Option C:** Soft-delete old duplicates (fastest, potential data loss)

### ✅ Fix Duplicates (If Found)

**Option A - Auto-Rename (Recommended):**

Uncomment lines 50-120 in `scripts/fix-duplicate-products.sql`, then:

```bash
# Apply automated fixes
psql $DATABASE_URL -f scripts/fix-duplicate-products.sql

# Verify duplicates resolved
psql $DATABASE_URL <<< "
SELECT 'SKU duplicates' as check, COUNT(*) FROM (
  SELECT business_id, sku FROM products
  WHERE is_deleted = false AND sku IS NOT NULL
  GROUP BY business_id, sku HAVING COUNT(*) > 1
) sub;
"
```

**Expected:** COUNT = 0

**Checkpoint:** All duplicates resolved  
**If fails:** Review error message, may need manual intervention

---

## Phase 4: Apply Database Migration (5 minutes)

### ✅ Mark Migration as Resolved

```bash
# Tell Prisma the migration was manually prepared
npx prisma migrate resolve --applied "20260713_products_unique_constraints"

# Verify migration status
npx prisma migrate status
```

**Expected:** All migrations show as "Applied"

### ✅ Verify Unique Constraints Exist

```bash
psql $DATABASE_URL <<< "
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'products' 
  AND indexname LIKE '%active%'
ORDER BY indexname;
"
```

**Expected Output:**
```
products_business_barcode_active_key
products_business_name_active_key
products_business_sku_active_key
```

**Checkpoint:** 3 unique constraint indexes exist  
**If fails:** Migration didn't apply correctly, check PostgreSQL logs

---

## Phase 5: Deploy Code (10 minutes)

### ✅ Run Tests

```bash
# Type check (if TypeScript)
npm run type-check

# Lint check
npm run lint

# Unit tests (if available)
npm run test
```

**Checkpoint:** All tests pass  
**If fails:** Fix errors before deploying

### ✅ Build Application

```bash
# Clean build
rm -rf .next
npm run build
```

**Expected:** Build completes without errors

**Checkpoint:** Build successful, no compilation errors  
**If fails:** Review build errors, may be unrelated to inventory fixes

### ✅ Deploy to Production

```bash
# Deploy command (adjust for your setup)
npm run deploy
# OR: git push production main
# OR: vercel --prod
# OR: pm2 restart tenvo-app
```

**Checkpoint:** Deployment complete, app restarted  
**If fails:** Check deployment logs

---

## Phase 6: Smoke Tests (15 minutes)

### ✅ Test 1: Checkout Flow

1. Open storefront in browser
2. Add product to cart
3. Proceed to checkout
4. Fill shipping/payment info
5. Click "Place Order"

**Expected:** ✅ Success message, order number shown  
**If fails:** ❌ Check browser console and server logs

### ✅ Test 2: Excel Batch Save

1. Login to hub
2. Go to Inventory tab
3. Click "Excel Mode"
4. Add new row:
   - name: "Test Batch Product"
   - sku: "TEST-BATCH-001"
   - batch_number: "BATCH-TEST-001"
   - batch_quantity: 100
   - expiry_date: "2025-12-31"
5. Click Save
6. Refresh page
7. Find the product and open it

**Expected:** ✅ Batch shows in product details  
**If fails:** ❌ Check browser console, verify extractBatchesFromExcelRow was deployed

### ✅ Test 3: Stock Accuracy

```sql
-- Run this query after creating a product with stock = 50
SELECT 
  p.name,
  p.stock as display_stock,
  COALESCE(SUM(psl.quantity), 0) as location_stock,
  COUNT(psl.id) as location_count
FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'
GROUP BY p.id
LIMIT 5;
```

**Expected:** display_stock = location_stock, location_count >= 1  
**If fails:** ❌ Product creation bypassing InventoryService

### ✅ Test 4: No Transaction Errors

```bash
# Check PostgreSQL logs for errors
tail -100 /var/log/postgresql/postgresql-*.log | grep -i "error\|abort"
```

**Expected:** No "column does not exist" or "transaction aborted" errors  
**If fails:** ❌ Check if all code changes were deployed

---

## Phase 7: Monitoring (Ongoing)

### ✅ Set Up Alerts

Monitor these metrics for 24 hours:

1. **Checkout Success Rate** - Should be >95%
2. **Order Creation Errors** - Should be near 0
3. **PostgreSQL Transaction Errors** - Should be 0
4. **Average Order Processing Time** - Should be <2 seconds

### ✅ Key Queries to Run Hourly

```sql
-- Check for orphaned stock
SELECT COUNT(*) as orphans FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.stock > 0 AND p.is_deleted = false AND psl.id IS NULL;
-- Should be 0

-- Check for transaction errors
SELECT COUNT(*) FROM pg_stat_activity 
WHERE state LIKE '%abort%';
-- Should be 0

-- Check recent orders
SELECT COUNT(*), MAX(created_at) 
FROM storefront_orders 
WHERE created_at > NOW() - INTERVAL '1 hour';
-- Should show recent activity
```

---

## Phase 8: Rollback (If Needed)

### ⚠️ Rollback Triggers

Roll back if:
- Checkout success rate drops below 80%
- More than 10 customers report issues
- Critical database errors appear
- Stock discrepancies reported

### ✅ Rollback Procedure

```bash
# 1. Revert code
git log --oneline -3
git revert <commit-hash-of-inventory-fixes>
npm run build && npm run deploy

# 2. Restore database
psql $DATABASE_URL < backups/backup_pre_inventory_fix_TIMESTAMP.sql

# 3. Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20260713_products_unique_constraints"

# 4. Verify rollback
npx prisma migrate status
```

---

## Success Criteria

Deployment is successful when:

- ✅ All checklist items completed
- ✅ Checkout works without errors
- ✅ Excel batch data persists
- ✅ No "transaction aborted" errors in logs
- ✅ Stock quantities match between display and locations
- ✅ No new customer complaints
- ✅ Performance metrics stable

---

## Post-Deployment Actions

### Immediate (Same Day)

- [ ] Send "All Clear" message to team
- [ ] Update status page / internal docs
- [ ] Archive backup files securely
- [ ] Document any issues encountered

### Next Day

- [ ] Review 24-hour metrics
- [ ] Check customer feedback
- [ ] Review support tickets
- [ ] Plan Sprint 2 fixes (medium priority issues)

### Next Week

- [ ] Conduct retrospective
- [ ] Update INVENTORY_ROOT_CAUSE_ANALYSIS.md with lessons learned
- [ ] Begin work on remaining P1/P2 issues
- [ ] Improve test coverage

---

## Emergency Contacts

**Production Issues:**
- On-Call Engineer: [phone/pager]
- Database Admin: [contact]
- DevOps Lead: [contact]

**Questions:**
- Slack: #inventory-deployment
- Email: eng-team@company.com

---

**Checklist Complete:** [  ] YES [  ] NO  
**Deployed By:** _______________  
**Date/Time:** _______________  
**Result:** [  ] Success [  ] Rolled Back [  ] Partial  
**Notes:** _______________________________________________

