# Testing Guide - Verify Perfect Form Wiring

**After P0 Fixes Applied**  
**Date:** June 30, 2026

---

## Quick Verification (5 minutes)

Run all automated checks:

```bash
# Validate Prisma schema
npx prisma validate

# MVP launch checks
bun run verify:mvp-launch

# Storefront tenancy
bun run verify:storefront-tenancy

# Domain verticals
bun run verify:domains

# Registration flow
bun run verify:registration-flow
```

**Expected:** All checks should pass ✅

---

## Manual Testing Scenarios

### Test 1: Visual Form Create → Ledger Verification ⭐

**Goal:** Verify internal ProductForm now routes through composite upsert

**Steps:**
1. Open Inventory tab
2. Click "Add Product" (opens internal ProductForm)
3. Fill in:
   - Name: "Test Product A"
   - SKU: "TEST-001"
   - Stock: 100
   - Price: 50
4. Click "Save"
5. **Verify in database:**
   ```sql
   -- Check product created
   SELECT * FROM products WHERE sku = 'TEST-001';
   
   -- ✅ Critical: Check inventory_ledger entry
   SELECT * FROM inventory_ledger 
   WHERE product_id = (SELECT id FROM products WHERE sku = 'TEST-001')
   ORDER BY created_at DESC LIMIT 1;
   ```

**Expected:**
- ✅ Product created
- ✅ `inventory_ledger` row exists with quantity = 100, notes = 'Opening Balance'
- ✅ `stock_movements` entry (if InventoryService creates it)

---

### Test 2: Busy Grid Inline Create → Ledger Verification

**Goal:** Verify Busy mode inline add uses composite

**Steps:**
1. Switch to Busy view mode
2. Click "Add Row" or Ctrl+Shift+N
3. Fill first row inline:
   - Name: "Test Product B"
   - SKU: "TEST-002"
   - Stock: 50
   - Price: 30
4. Tab out (auto-saves)
5. **Verify in database:**
   ```sql
   SELECT * FROM inventory_ledger 
   WHERE product_id = (SELECT id FROM products WHERE sku = 'TEST-002')
   ORDER BY created_at DESC LIMIT 1;
   ```

**Expected:**
- ✅ Product saved
- ✅ Ledger entry created

---

### Test 3: Excel Mode Batch Entry → Batch Persistence ⭐⭐

**Goal:** Verify batch columns map to `product_batches` table

**Prerequisites:** Domain with batch tracking (pharmacy, food, chemicals)

**Steps:**
1. Click "Excel Mode"
2. Add row with batch data:
   - Name: "Medicine X"
   - SKU: "MED-001"
   - Stock: 100
   - Batch #: "BATCH-2026-06"
   - Batch Qty: 100
   - Expiry: 2027-12-31
3. Click "Save"
4. **Verify in database:**
   ```sql
   -- Check product
   SELECT * FROM products WHERE sku = 'MED-001';
   
   -- ✅ Critical: Check product_batches
   SELECT * FROM product_batches 
   WHERE product_id = (SELECT id FROM products WHERE sku = 'MED-001');
   
   -- ✅ Check ledger
   SELECT * FROM inventory_ledger 
   WHERE product_id = (SELECT id FROM products WHERE sku = 'MED-001');
   ```

**Expected:**
- ✅ Product created with stock = 100
- ✅ `product_batches` row with batch_number = 'BATCH-2026-06', quantity = 100, expiry_date set
- ✅ Ledger entry with notes mentioning batch

---

### Test 4: Multi-Warehouse Create → Location Initialization

**Goal:** Verify `product_stock_locations` initialized

**Prerequisites:** Business with multi-warehouse enabled (auto-parts, manufacturing)

**Steps:**
1. Create product via any mode
2. **Verify in database:**
   ```sql
   SELECT * FROM product_stock_locations 
   WHERE product_id = (SELECT id FROM products WHERE sku = 'YOUR-SKU')
   AND business_id = 'YOUR-BUSINESS-ID';
   ```

**Expected:**
- ✅ Row exists for primary warehouse with correct quantity

---

### Test 5: Domain Field Edit in Busy Grid ⭐

**Goal:** Verify domain field prefill works after unified column builder

**Prerequisites:** Clothing vertical with `fabrictype` field

**Steps:**
1. Switch to Busy grid
2. Find product with fabrictype = "Cotton"
3. Press F2 to edit `fabrictype` cell
4. **Expected:** Cell should pre-fill with "Cotton" (not empty)
5. Change to "Silk"
6. Tab out
7. **Verify:** `domain_data.fabrictype` = "Silk" in database

**Expected:**
- ✅ Pre-fill works (no longer broken)
- ✅ Update persists to `domain_data` JSON

---

### Test 6: Update Existing Product → Stock Delta

**Goal:** Verify stock changes trigger ledger entries

**Steps:**
1. Find existing product with stock = 50
2. Edit in Visual form or Busy grid
3. Change stock to 75 (+25 increase)
4. Save
5. **Verify in database:**
   ```sql
   SELECT * FROM inventory_ledger 
   WHERE product_id = 'PRODUCT-ID'
   ORDER BY created_at DESC LIMIT 2;
   ```

**Expected:**
- ✅ New ledger entry with quantity = +25, notes = 'Manual Stock Adjustment'
- ✅ Product stock updated to 75

---

### Test 7: Excel Bulk Import → Ledger Coverage

**Goal:** Verify bulk import goes through composite

**Steps:**
1. Click "Import"
2. Upload CSV with 10 products
3. Import
4. **Verify in database:**
   ```sql
   SELECT COUNT(*) FROM inventory_ledger 
   WHERE product_id IN (
     SELECT id FROM products WHERE sku LIKE 'IMPORT-%'
   );
   ```

**Expected:**
- ✅ 10 ledger entries created (one per product)

---

### Test 8: Serial Number Tracking

**Goal:** Verify serials persist

**Prerequisites:** Electronics/IMEI domain

**Steps:**
1. Excel mode
2. Add product with:
   - Name: "Phone X"
   - Serial #: "SN123456789"
3. Save
4. **Verify in database:**
   ```sql
   SELECT * FROM product_serials 
   WHERE product_id = (SELECT id FROM products WHERE name = 'Phone X');
   ```

**Expected:**
- ✅ Serial row created
- ✅ Ledger shows stock +1

---

## Regression Tests (Ensure Nothing Broke)

### R1: Dashboard Product Count
- Open dashboard
- **Expected:** Product count KPI matches database count

### R2: Visual Mode Delete
- Delete product from Visual table
- **Expected:** Soft delete (`is_deleted = true`), no crash

### R3: Busy Grid Keyboard Navigation
- Tab, Enter, F2, Esc keys
- **Expected:** All shortcuts work smoothly

### R4: Excel Smart Paste
- Copy 5 rows from Google Sheets
- Paste into Excel modal
- **Expected:** All rows added to grid

### R5: Storefront Product Display
- View public storefront
- **Expected:** Products visible, stock shows correctly

---

## Database Verification Queries

### Check Ledger Coverage
```sql
-- Products WITHOUT ledger entries (should be 0 after fixes)
SELECT p.id, p.name, p.sku, p.stock, p.created_at
FROM products p
LEFT JOIN inventory_ledger il ON il.product_id = p.id
WHERE p.is_deleted = false
  AND p.stock > 0
  AND il.id IS NULL
ORDER BY p.created_at DESC;
```

**Expected:** 0 rows (all products with stock have ledger entries)

### Check Batch Mapping
```sql
-- Products with batch_number but no relational batches
SELECT p.id, p.name, p.batch_number
FROM products p
LEFT JOIN product_batches pb ON pb.product_id = p.id
WHERE p.batch_number IS NOT NULL 
  AND p.batch_number != ''
  AND pb.id IS NULL;
```

**Expected:** 0 rows (all batch metadata in relational table)

### Check Stock Consistency
```sql
-- Products with stock != sum(product_stock_locations)
SELECT 
  p.id, 
  p.name, 
  p.stock as headline_stock,
  COALESCE(SUM(psl.quantity), 0) as location_stock
FROM products p
LEFT JOIN product_stock_locations psl 
  ON psl.product_id = p.id AND psl.business_id = p.business_id
WHERE p.is_deleted = false
GROUP BY p.id, p.name, p.stock
HAVING p.stock != COALESCE(SUM(psl.quantity), 0);
```

**Expected:** 0 rows (stock aligned across tables)

---

## Performance Checks

### P1: Excel Save Performance
- Add 100 rows in Excel mode
- Click Save
- **Expected:** Completes in <30 seconds (concurrency 5)

### P2: Busy Grid Responsiveness
- Scroll through 500+ products in Busy grid
- **Expected:** Smooth, no lag

### P3: Dashboard Load Time
- Refresh dashboard with 1000+ products
- **Expected:** <2 seconds initial load

---

## Error Handling Tests

### E1: Duplicate SKU
1. Try to create product with existing SKU
2. **Expected:** Toast error "SKU already exists"

### E2: Missing Required Field
1. ProductForm: leave Name empty
2. **Expected:** Form validation error

### E3: Invalid Stock Value
1. Busy grid: enter negative stock
2. **Expected:** Rejected or coerced to 0

### E4: Network Failure During Save
1. Disconnect network
2. Try to save product
3. **Expected:** Error toast, state rollback

---

## Mobile Responsiveness (below `lg:` breakpoint)

### M1: Inventory Hub Mobile
- Open inventory on phone
- **Expected:** Tile hub with "Excel Fast Entry" card

### M2: Excel Modal on Mobile
- Open Excel mode on phone
- **Expected:** Full-screen modal, horizontal scroll works

---

## Final Smoke Test Checklist

Run this sequence after deployment:

1. ✅ Register new business → Products seed correctly
2. ✅ Add product via Visual form → Appears in list
3. ✅ Edit product in Busy grid → Changes persist
4. ✅ Bulk add 10 products in Excel → All saved
5. ✅ Delete product → Soft deleted
6. ✅ View public storefront → Products visible
7. ✅ Place storefront order → Stock decrements
8. ✅ Check `inventory_ledger` → All creates have entries
9. ✅ Check `product_batches` → Batch data persists
10. ✅ Check `product_stock_locations` → Multi-warehouse works

**Pass Criteria:** All 10 checks ✅

---

## Rollback Plan

If any test fails critically:

1. **Immediate:** Revert commits to `inventory_composite.js` and `InventoryManager.jsx`
2. **Restore previous version** from git:
   ```bash
   git checkout HEAD~1 lib/actions/premium/automation/inventory_composite.js
   git checkout HEAD~1 components/InventoryManager.jsx
   ```
3. **Notify team** of rollback
4. **Debug offline** before re-applying

---

## Success Metrics

### Pre-Fix Baseline
- Ledger coverage: ~70% (Visual form creates missing)
- Batch persistence: 0% (Excel columns dropped)
- Busy prefill: Broken for domain fields

### Post-Fix Target
- ✅ Ledger coverage: **100%** (all creates through composite)
- ✅ Batch persistence: **100%** (Excel → relational tables)
- ✅ Busy prefill: **Working** (unified column builder)
- ✅ Schema alignment: **Perfect** (no invalid columns)

---

## Contact for Issues

If any test fails:
1. Check `SYSTEM_WIRING_AUDIT_2026.md` for expected behavior
2. Check `FIXES_APPLIED_2026.md` for what was changed
3. Review browser console for client errors
4. Check server logs for action failures
5. Query `inventory_ledger` to verify writes

---

**Testing Prepared By:** Kiro AI System  
**Date:** June 30, 2026  
**Status:** Ready for QA team execution
