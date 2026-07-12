# 🚀 Deployment Commands Reference

**Quick reference for deploying inventory fixes**  
**Copy-paste these commands in order**

---

## ✅ Pre-Deployment

### Check Current Status

```powershell
# Navigate to project
cd e:\tenvo-main

# Check migration status
npx prisma migrate status

# Expected: 20260713_products_unique_constraints shows as FAILED
```

---

## 🗄️ Database Preparation

### Step 1: Check for Duplicates

**Open your database admin panel** (Supabase SQL Editor or pgAdmin) and run:

```sql
-- Check for duplicate SKUs
SELECT 
  business_id, 
  sku, 
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as product_ids
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND sku IS NOT NULL 
  AND TRIM(sku) != ''
GROUP BY business_id, sku
HAVING COUNT(*) > 1;
```

**If returns 0 rows:** ✅ No duplicates, proceed to Step 2  
**If returns rows:** Fix duplicates first (see below)

---

### Step 1a: Fix Duplicates (If Found)

**Option A - Rename duplicates:**

```sql
-- Replace <product-id> and <new-sku> with actual values
UPDATE products
SET sku = '<new-sku>',  -- e.g., 'ABC123-2'
    updated_at = NOW()
WHERE id = '<product-id>';
```

**Option B - Soft delete:**

```sql
UPDATE products
SET is_deleted = true, 
    deleted_at = NOW()
WHERE id = '<product-id>';
```

**Then re-run the duplicate check to verify 0 rows.**

---

### Step 2: Mark Migration Resolved

```powershell
npx prisma migrate resolve --applied "20260713_products_unique_constraints"
```

---

### Step 3: Verify Constraints Exist

**In database admin panel:**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'products' 
  AND indexname LIKE '%active%'
ORDER BY indexname;
```

**Expected 3 results:**
- products_business_barcode_active_key
- products_business_name_active_key
- products_business_sku_active_key

---

## 🔨 Build & Deploy

### Local Build Test

```powershell
# Clean previous build
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Build
npm run build

# Expected: Completes without errors
```

---

### Deploy to Production

**Choose your deployment method:**

#### Vercel

```powershell
# Commit and push
git add .
git commit -m "fix: inventory critical issues - schema alignment and batch persistence"
git push origin main

# Vercel auto-deploys, monitor at vercel.com/dashboard
```

#### PM2/VPS

```bash
# On production server
pm2 stop tenvo-app
git pull origin main
npm install
npm run build
pm2 start tenvo-app
pm2 logs tenvo-app --lines 50
```

#### Docker

```bash
# On production server
docker-compose down
git pull origin main
docker-compose build
docker-compose up -d
docker-compose logs -f --tail=50
```

---

## ✅ Post-Deployment Tests

### Test 1: Checkout

```
1. Open storefront in incognito
2. Add product to cart
3. Complete checkout
4. Expected: Success, order number shown
```

**If fails:** Check browser console (F12) and server logs

---

### Test 2: Stock Accuracy

**Create a product with stock = 50**

Then verify in database:

```sql
SELECT 
  p.name,
  p.stock as display_stock,
  COALESCE(SUM(psl.quantity), 0) as location_stock,
  COUNT(psl.id) as location_count
FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.created_at > NOW() - INTERVAL '1 hour'
  AND p.is_deleted = false
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 5;
```

**Expected:** display_stock = location_stock = 50, location_count >= 1

---

### Test 3: Excel Batch Save

```
1. Hub → Inventory → Excel Mode
2. Add row:
   - name: "Batch Test"
   - sku: "BATCH-001"
   - batch_number: "BATCH001"
   - batch_quantity: 100
   - expiry_date: 2025-12-31
3. Save
4. Verify in database:
```

```sql
SELECT * 
FROM product_batches 
WHERE batch_number = 'BATCH001';
```

**Expected:** 1 row with quantity = 100

---

## 📊 Monitoring Queries

### Check for Orphaned Stock

```sql
SELECT COUNT(*) as orphaned_products
FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.stock > 0 
  AND p.is_deleted = false 
  AND psl.id IS NULL;
```

**Expected:** 0

---

### Check for Transaction Errors

```sql
SELECT COUNT(*) as aborted_transactions
FROM pg_stat_activity 
WHERE state LIKE '%abort%';
```

**Expected:** 0

---

### Check Recent Orders

```sql
SELECT 
  COUNT(*) as order_count,
  MAX(created_at) as latest_order
FROM storefront_orders 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Expected:** Shows recent activity

---

## 🚨 Rollback Commands

**If critical issues occur:**

### Rollback Code

```powershell
# Find recent commits
git log --oneline -5

# Revert the fixes commit
git revert <commit-hash>
git push origin main

# Redeploy (use your normal deploy command)
```

### Rollback Database

```powershell
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20260713_products_unique_constraints"

# Verify
npx prisma migrate status
```

---

## 📝 Quick Checklist

Execute in order:

```
□ npx prisma migrate status (check current state)
□ Check for duplicates (SQL query in database)
□ Fix duplicates if any found
□ npx prisma migrate resolve --applied "20260713_products_unique_constraints"
□ Verify constraints (SQL query in database)
□ npm run build (local test)
□ git commit and push (deploy)
□ Test checkout immediately
□ Verify stock accuracy (SQL query)
□ Test Excel batch save
□ Monitor logs for 1 hour
```

---

## 🆘 Emergency Contacts

**If issues arise:**

- Review: `SAFE_DEPLOYMENT_STEPS.md`
- Check: PostgreSQL logs
- Review: Browser console errors
- Check: Application logs

---

**Status:** Commands ready ✅  
**Tested:** Syntax verified ✅  
**Documentation:** Complete ✅

**You can execute these commands safely!** 🚀

