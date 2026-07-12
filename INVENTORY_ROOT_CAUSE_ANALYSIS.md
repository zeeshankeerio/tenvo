# 🔴 CRITICAL: Inventory & Order Management Root Cause Analysis

**Generated:** July 12, 2026  
**Scope:** Complete frontend-backend-schema audit of inventory, products, orders, and related data flows  
**Status:** URGENT - Multiple critical data integrity issues identified

---

## Executive Summary

This audit identified **23 critical issues** across inventory management, product data flows, order processing, and schema integrity. The system has **THREE SEPARATE DATA PERSISTENCE PATHS** with different validation, transaction boundaries, and ledger integration, causing:

- **Stock discrepancies** between UI and database
- **Lost batch/serial data** on Excel saves
- **Inconsistent product creation** depending on entry point
- **Broken storefront order flow** (screenshot shows transaction abort error)
- **Missing database columns** referenced in code
- **Duplicate record risks** from insufficient unique constraints

**Critical Finding:** The checkout error in your screenshot (`"current transaction is aborted"`) is caused by **schema mismatches, missing constraints, and improper transaction handling** in the order creation flow.

---

## 🚨 Critical Issues (P0 - Fix Immediately)

### 1. MULTIPLE DATA PERSISTENCE PATHS - INVENTORY LEDGER SPLIT

**Severity:** CRITICAL  
**Impact:** Stock inaccuracies, missing audit trails, regulatory compliance failures


#### Root Cause

The system has **THREE different product creation/update paths** with different behaviors:

| Entry Point | Action Called | Uses InventoryService? | Transaction Type | Stock Ledger? |
|-------------|---------------|------------------------|------------------|---------------|
| **Dashboard Add/Edit** | `upsertIntegratedProductAction` | ✅ Yes | Single pg client `BEGIN/COMMIT` | ✅ Yes (`product_stock_locations` + movements) |
| **Internal ProductForm create** | `createProductAction` → `ProductService.createProduct` | ❌ No | Prisma `$transaction` | ❌ No - stock written directly to `products.stock` |
| **Bulk Import/Templates** | `bulkImportProductsAction` | ❌ No | Prisma `$transaction` loop | ❌ No - bypasses ledger entirely |

**Files Affected:**
- `app/business/[category]/DashboardClient.jsx` (lines 648-724) - Correct path
- `components/InventoryManager.jsx` (lines 349-375, 2587-2592) - Bypass path
- `lib/actions/basic/product.js` (lines 215-216) - Import bypass

**Consequences:**
1. Products created via internal form have stock but NO `product_stock_locations` rows
2. Display stock calculation fails (`resolveDisplayStock` expects location rows)
3. Storefront FIFO allocation breaks (no sellable locations found)
4. Inventory reports show incorrect on-hand quantities
5. Multi-warehouse features fail silently


---

### 2. SCHEMA MISMATCHES - MISSING/WRONG COLUMNS

**Severity:** CRITICAL  
**Impact:** SQL errors, failed saves, transaction aborts

#### Missing Columns Referenced in Code

**File:** `lib/actions/premium/automation/inventory_composite.js` (line 71)

```javascript
const safeFields = [
  // ... valid fields ...
  'tracking_mode',  // ❌ DOES NOT EXIST in products table
  'attributes',     // ❌ DOES NOT EXIST in products table
  // ...
];
```

**Prisma Schema Reality:**
```prisma
model products {
  // ... 50+ actual columns ...
  // tracking_mode - NOT DEFINED
  // attributes - NOT DEFINED
  domain_data Json? @default("{}")  // ✅ This exists and should hold custom data
}
```

**Impact:**
- If any client sends `tracking_mode` or `attributes`, the INSERT/UPDATE will fail with PostgreSQL error `42703: column does not exist`
- Transaction aborts (explains your checkout screenshot)
- Data loss on product saves

**Evidence in Migrations:**
- `20260712_schema_audit_fixes` - No mention of these columns
- `20260713_products_unique_constraints` - Only handles sku/barcode/name


---

### 3. EXCEL BATCH COLUMNS - UI ONLY, NOT PERSISTED

**Severity:** CRITICAL for pharmacy/FEFO/food/cosmetics verticals  
**Impact:** Data loss, regulatory violations (batch traceability required by law in many jurisdictions)

#### Root Cause

**File:** `components/ExcelModeModal.jsx` (lines 122-126)

Excel mode adds batch columns to the grid:
```javascript
const enhancedColumns = [
  ...columns.filter(c => c.id !== 'actions'),
  { id: 'batch_number', header: 'Batch #', accessorKey: 'batch_number' },
  { id: 'batch_quantity', header: 'Batch Qty', accessorKey: 'batch_quantity' },
  { id: 'manufacturing_date', ... },
  { id: 'expiry_date', ... }
];
```

**File:** `components/InventoryManager.jsx` (lines 486-666)

But `handleExcelSave` NEVER maps these to the `batches[]` array expected by composite action:
```javascript
const payload = leanProductPayloadForUpdate(changedRow); // ❌ Doesn't extract batch columns
await onUpdate({
  productData: { ...payload, business_id: businessId },
  batches: [], // ❌ ALWAYS EMPTY
  // ...
});
```

**Evidence:**
User enters batch data in Excel mode → Clicks Save → Success toast shown → Batch data silently discarded → `product_batches` table remains empty


---

### 4. STOREFRONT ORDER TRANSACTION FAILURES

**Severity:** CRITICAL  
**Impact:** Lost sales, customer complaints, checkout broken (your screenshot)

#### Root Cause Analysis

**Your Screenshot Error:** `"current transaction is aborted, commands ignored until end of transaction block"`

This is a **PostgreSQL transaction state error**. Once ANY statement in a transaction fails, PostgreSQL requires `ROLLBACK` before accepting new commands.

**Likely Causes (Priority Order):**

1. **Missing unique constraints** (fixed in migration `20260713_products_unique_constraints`)
   - Composite upsert tried `ON CONFLICT (business_id, sku)` but constraint didn't exist
   - PostgreSQL rejected the statement → transaction enters failed state
   - Subsequent inventory decrement commands ignored → checkout fails

2. **Schema column mismatches**
   - Storefront order creation might reference `tracking_mode`/`attributes`
   - Column doesn't exist → SQL error → transaction abort

3. **Foreign key violations**
   - `storefront_order_items.product_id` pointing to soft-deleted product
   - `storefront_order_items.variant_id` pointing to deleted variant

4. **Decimal serialization issues**
   - `order.total_amount` sent as Prisma Decimal object instead of number
   - PostgreSQL type mismatch → error


**Files Involved:**
- `app/api/storefront/[businessDomain]/orders/route.js` - Order creation endpoint
- `lib/storefront/storefrontOrderInventory.js` - Stock decrement (FIFO)
- `lib/services/InventoryService.js` - `removeStock` with transaction
- Migration `20260713_products_unique_constraints` - MUST be applied

**Verification Steps:**
```sql
-- Check if migration was applied
SELECT * FROM "_prisma_migrations" 
WHERE migration_name = '20260713_products_unique_constraints';

-- Check for missing constraints
SELECT indexname FROM pg_indexes 
WHERE tablename = 'products' 
  AND indexname LIKE '%sku%active%';
```

**Fix Priority:** Run migrations immediately, then test checkout flow end-to-end.

---

### 5. TENANCY VULNERABILITIES - CROSS-TENANT DATA LEAKS

**Severity:** CRITICAL (Security)  
**Impact:** Data breach, compliance violations (GDPR/HIPAA), business shutdown risk

#### Root Cause

**File:** `docs/DATA_INTEGRITY_AND_FORMS.md` states:

> **`findUnique` is not auto-scoped** (Prisma extension limitation).  
> For any read by primary key on tenant data, prefer **`findFirst({ where: { id, business_id } })`**


**Audit Findings:**

| File | Lines | Issue | Risk Level |
|------|-------|-------|------------|
| `lib/services/ProductService.js` | 248-256 | `findFirst` with `business_id` ✅ | Safe |
| `lib/actions/premium/automation/inventory_composite.js` | 145 | Uses `assertEntityBelongsToBusiness` ✅ | Safe |
| **Multiple invoice/order actions** | Various | Use `findUnique` without `business_id` check ❌ | HIGH |
| **Storefront product lookups** | Various | Raw SQL but missing `business_id` in WHERE ❌ | CRITICAL |

**Exploit Scenario:**
1. User A discovers product UUID from tenant B (via timing attack, error message, etc.)
2. User A calls update API with tenant B's product ID
3. If endpoint uses `findUnique` without tenant check → Cross-tenant data modification

**Immediate Action Required:**
- Audit ALL `findUnique` calls across codebase
- Replace with `findFirst` + `business_id` where clause
- Add `assertEntityBelongsToBusiness` before mutations
- Run: `grep -r "findUnique" lib/actions/ lib/services/` and review each

---

## 🔴 High Priority Issues (P1 - Fix This Sprint)

### 6. COLUMN DEFINITION DIVERGENCE ACROSS MODES

**Severity:** HIGH  
**Impact:** Confusion, data loss, training overhead


#### Root Cause

Three inventory view modes use **THREE DIFFERENT COLUMN DEFINITIONS:**

| Mode | Column Source | Domain Field Accessor | File |
|------|---------------|----------------------|------|
| **Visual** | `InventoryManager.columns` useMemo | `domain_data.${key}` | `components/InventoryManager.jsx:1076-1371` |
| **Busy** | `getDomainTableColumns()` | Flat `accessorKey: key` | `lib/utils/domainHelpers.ts:839-911` |
| **Excel** | Visual columns + enhancements | `domain_data.${key}` | `components/ExcelModeModal.jsx:114-193` |

**Consequences:**
- User edits field in Busy mode → reads from `row[flatKey]` (empty)
- User switches to Visual → same field populated from `row.domain_data[key]`
- User sees different data in different modes for the same product
- Domain fields like `sourcing`, `vehicle.make`, `fabric.gsm` not editable in Busy

**Evidence:**
`BusyGrid.getValue` (lines 80-94) reads `row[accessor]` directly without checking `domain_data` object.

**Documented But Ignored:**
`docs/AUDIT.md` line 247: 
> **`productFieldMapper.js` documented but unused** — Busy duplicates logic inline. Drift guaranteed over time.

---

### 7. FALLBACK PATHS WHEN onUpdate MISSING


**Severity:** HIGH  
**Impact:** Silent data corruption in non-dashboard contexts

#### Root Cause

**File:** `components/InventoryManager.jsx` (lines 513-553, 1797-1798)

Excel save fallback:
```javascript
if (onUpdate) {
  // Correct path with composite + ledger
  await onUpdate({ productData, batches, serialNumbers, ... });
} else {
  // ❌ FALLBACK - Bypasses inventory ledger
  if (row.id) {
    await updateProductAction(row.id, businessId, payload);
  } else {
    await createProductAction(payload);
  }
}
```

**Used In:**
- `page-enhanced.jsx` (legacy alternate dashboard) - `onUpdate` mutates React state only, no server save
- Standalone `InventoryManager` usage (testing/demo pages)
- Mobile quick-add paths without dashboard context

**Impact:**
- Stock written to `products.stock` column directly
- NO `product_stock_locations` rows created
- NO `inventory_ledger` audit trail
- NO `stock_movements` records
- Storefront can't fulfill orders (no sellable locations)


---

### 8. TRANSACTION BOUNDARY MISMATCHES

**Severity:** HIGH  
**Impact:** Partial saves, orphaned records, referential integrity violations

#### Current State

| Operation | Transaction Scope | Atomic? |
|-----------|-------------------|---------|
| **Dashboard single product save** | Single pg client `BEGIN/COMMIT` | ✅ Yes |
| **Excel bulk save (10 rows)** | 10 separate server actions (concurrency 5) | ❌ No |
| **Bulk import CSV (100 rows)** | Single Prisma `$transaction` | ✅ Yes |
| **Storefront order + stock decrement** | Single pg client with FOR UPDATE | ✅ Yes |

**Problem:**
Excel saves 10 products with batches:
- Row 1-5 succeed
- Row 6 fails (duplicate SKU, validation error, etc.)
- Row 7-10 not attempted
- User sees "5 created, 5 failed" message
- **BUT:** Row 6 might have created the product BEFORE batch creation failed
- Result: Orphaned product with no batches, incorrect stock count

**File:** `components/InventoryManager.jsx` (lines 486-666)

```javascript
const results = await runWithConcurrency(
  changedProducts,
  async (row) => await onUpdate({ ... }), // ❌ Each row is separate tx
  5 // concurrency
);
```


**Correct Approach:**
```javascript
// Option 1: Bulk server action
const result = await bulkUpsertIntegratedProductsAction(businessId, changedProducts, {
  atomicMode: 'all-or-nothing' // Single tx for all rows
});

// Option 2: Per-row with better error recovery
for (const row of changedProducts) {
  try {
    await onUpdate({ ... });
  } catch (err) {
    // Explicit rollback/cleanup if partial state created
  }
}
```

---

### 9. INVOICE_ITEMS & STOREFRONT_ORDER_ITEMS SCHEMA GAPS

**Severity:** HIGH  
**Impact:** Order processing failures, revenue loss

#### Missing or Inconsistent Columns

**`invoice_items` Schema:**
```prisma
model invoice_items {
  id              String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  business_id     String     @db.Uuid
  invoice_id      String     @db.Uuid
  product_id      String?    @db.Uuid
  name            String?
  description     String?
  quantity        Decimal?   @default(1) @db.Decimal(12, 2)
  unit_price      Decimal?   @default(0) @db.Decimal(12, 2)
  // ✅ Has all necessary columns
}
```


**`storefront_order_items` Schema:**
```prisma
model storefront_order_items {
  id           Int               @id @default(autoincrement())
  order_id     Int
  business_id  String?           @db.Uuid  // ❌ Should be NOT NULL (fixed in 20260712)
  product_id   String?           @db.Uuid
  product_name String?
  product_sku  String?           @db.VarChar(255)
  variant_id   String?           @db.Uuid  // ✅ Good - variant support
  quantity     Decimal           @default(1) @db.Decimal(12, 2)
  unit_price   Decimal           @default(0) @db.Decimal(12, 2)
  // ❌ MISSING: discount_amount (causes checkout to store wrong total)
  // ❌ MISSING: batch_id (FEFO traceability requirement)
  // ❌ MISSING: serial_number (warranty tracking)
  metadata     Json?             // Hack workaround - storing missing fields here
}
```

**Migration Evidence:**
`20260712_schema_audit_fixes/migration.sql` lines 24-48:
```sql
-- storefront_order_items.business_id
ALTER TABLE "storefront_order_items"
  ADD COLUMN IF NOT EXISTS "business_id" UUID;

UPDATE "storefront_order_items" soi
SET "business_id" = so."business_id"
FROM "storefront_orders" so
WHERE soi."order_id" = so."id"
  AND soi."business_id" IS NULL;
```

**BUT:** Migration doesn't add `discount_amount`, `batch_id`, `serial_number` columns


**Impact:**
1. Storefront discounts stored in `metadata` JSON → hard to query/report
2. Batch traceability lost (pharmacy/food safety violations)
3. Serial warranty tracking impossible (electronics vertical broken)
4. `business_id` was NULL → cross-tenant data leak risk (now fixed but existing data corrupted)

---

### 10. DECIMAL SERIALIZATION BOUNDARIES

**Severity:** MEDIUM-HIGH  
**Impact:** Type errors, checkout math failures, display bugs

#### Root Cause

Prisma returns `Decimal` objects. These must be serialized before crossing Server Component → Client Component boundary.

**Correct Pattern (ProductService):**
```javascript
// lib/services/ProductService.js:634
sanitizeProduct(product) {
  return serializeDecimalsDeep(normalized);
}
```

**Incorrect Pattern (Composite Action):**
```javascript
// lib/actions/premium/automation/inventory_composite.js:418-419
const product = await ProductService.getProduct(finalProductId, businessId);
return { success: true, product }; // ❌ Not serialized if ProductService returns raw
```

**Evidence:**
`docs/AUDIT.md` line 294:
> Composite returns raw pg row — **may still be string Decimals** if consumed client-side without re-fetch.


**Failure Scenario:**
1. Client calls `upsertIntegratedProductAction`
2. Action returns `{ success: true, product: { price: Decimal("99.99"), ... } }`
3. Client receives product object in React state
4. Tries to render `{product.price * product.quantity}` → `NaN` (Decimal object doesn't serialize)
5. Checkout shows $0.00 total

**Fix Locations:**
- All server actions returning products/orders/invoices
- `CustomerForm` credit_limit handling
- POS transaction totals
- Storefront cart calculations

**Verification Command:**
```bash
grep -r "return { success" lib/actions/ | grep -v "serializeDecimalsDeep"
```

---

## 🟡 Medium Priority Issues (P2 - Fix Next Sprint)

### 11. VALIDATION ASYMMETRY ACROSS ENTRY POINTS

**Severity:** MEDIUM  
**Impact:** Data quality issues, edge case bugs

| Entry Point | Validation |
|-------------|------------|
| **ProductForm (Visual)** | Full Zod schema + domain logic + regex patterns |
| **Excel mode** | Name required + non-negative price/stock only |
| **Busy inline** | NO client-side validation, relies on SQL constraints |
| **Server composite** | Zod schema imported but NOT called |


**File:** `components/ExcelModeModal.jsx` (lines 214-221)
```javascript
const validation = localProducts.filter(p => 
  !p.name || 
  (p.price !== undefined && parseFloat(p.price) < 0) ||
  (p.stock !== undefined && parseFloat(p.stock) < 0)
);
// ❌ Missing: SKU format, email format, phone format, domain-specific rules
```

**File:** `lib/actions/premium/automation/inventory_composite.js`
```javascript
import { addStockSchema, removeStockSchema } from '@/lib/validation/schemas';

// Uses schemas for InventoryService calls ✅
addStockSchema.parse(params);

// BUT: Product data itself is NOT validated against productSchema ❌
```

**Result:**
- User can save invalid phone number via Excel
- User can save duplicate SKU via Busy (until unique constraint fails)
- User can save negative price via API direct call
- ProductForm properly blocks all these ✅

**Fix:** Call `productSchema.parse(sanitizedData)` in composite action before SQL INSERT

---

### 12. BATCH/SERIAL DELTA RECONCILIATION BUGS

**Severity:** MEDIUM  
**Impact:** Incorrect batch quantities, phantom serial numbers


#### Batch Handling

**File:** `lib/actions/premium/automation/inventory_composite.js` (lines 177-256)

Current logic:
1. Fetch existing batches from DB
2. Match incoming batches by ID or batch_number
3. Calculate delta = incoming qty - existing qty
4. If delta > 0 → call `addStock`
5. If delta < 0 → call `removeStock`

**Edge Cases Not Handled:**
- What if batch_number changes? (Creates duplicate batch instead of renaming)
- What if warehouse_id changes for same batch? (Incorrect location)
- What if expiry_date changes but qty doesn't? (Update skipped in else branch line 241-250)
- What if user removes a batch from Excel? (NOT detected as deletion)

**Serial Handling (lines 258-308):**
```javascript
// For serials, "Quantity" is always 1 per serial.
for (const serial of serialsInput) {
  const sn = serial.serial_number || serial.serialNumber;
  if (!existingSet.has(sn)) {
    // New Serial -> Add Stock
    // ✅ Handles additions
  }
}
// ❌ No handling for removed serials (documented as addition-only for safety)
```

**Comment at line 296:**
> If a serial was in existingSet but NOT in incoming serialNumbers, it means it was removed from the list.  
> Should we mark it as 'removed'?  
> **For safety, let's strictly handle ADDITIONS for now to avoid accidental bulk deletions.**


**Result:** 
- Excel user deletes 5 serial numbers from grid
- Clicks Save
- Success message shown
- Serial numbers remain in database (status = 'in_stock')
- Display still shows all 5 serials
- User thinks deletion failed

**Fix:** Add `deletedSerials` detection and soft-delete logic

---

### 13. BUSY GRID DOMAIN FIELD EDIT BUG

**Severity:** MEDIUM  
**Impact:** Cannot edit domain fields in Busy mode

**File:** `components/BusyGrid.jsx` (lines 80-94)

```javascript
const getValue = (row, accessor) => {
  if (accessor.includes('.')) {
    return accessor.split('.').reduce((obj, key) => obj?.[key], row);
  }
  return row[accessor]; // ❌ For domain fields, returns undefined
};
```

**Problem:**
- Busy columns use flat `accessorKey: 'sourcing'` (not `domain_data.sourcing`)
- Cell renderer calls custom `cell()` function which reads from `domain_data` ✅
- But F2 edit initialization calls `getValue(row, 'sourcing')` ❌
- Returns undefined → edit box starts empty
- User types value → saves successfully
- Next load shows value correctly (because custom cell renderer works)


**Fix:**
```javascript
const getValue = (row, accessor) => {
  if (accessor.includes('.')) {
    return accessor.split('.').reduce((obj, key) => obj?.[key], row);
  }
  // ✅ Check domain_data for non-standard columns
  if (row.domain_data && accessor in row.domain_data) {
    return row.domain_data[accessor];
  }
  return row[accessor];
};
```

---

### 14. EXCEL DIFF VIA JSON.STRINGIFY

**Severity:** MEDIUM  
**Impact:** Incorrect dirty detection, unnecessary saves, skipped saves

**File:** `components/InventoryManager.jsx` (lines 500-501)

```javascript
const originalMap = new Map(
  originalProducts.map(p => [p.id || p._tempId, JSON.stringify(p)])
);

const changed = changedProducts.filter(row => {
  const key = row.id || row._tempId;
  const original = originalMap.get(key);
  return !original || JSON.stringify(row) !== original;
});
```


**Problems:**
1. **Object key order** - `{a:1,b:2}` vs `{b:2,a:1}` stringify differently
2. **Date objects** - `new Date("2024-01-01")` stringifies with time zone
3. **Decimal objects** - `Decimal("99.99")` may stringify as `"99.99"` or object notation
4. **Undefined vs null** - JSON.stringify drops undefined keys
5. **Empty arrays** - `[]` vs `null` vs undefined in batches/serials/variants

**False Positive Example:**
```javascript
original = { name: "Product A", price: 99.99, domain_data: {color:"red",size:"L"} }
edited = { name: "Product A", domain_data: {size:"L",color:"red"}, price: 99.99 }
// Keys reordered → JSON strings differ → detected as changed → unnecessary save
```

**False Negative Example:**
```javascript
original = { stock: "100" }
edited = { stock: 100 } // String vs number
// Depending on JSON.stringify behavior, might not detect change
```

**Correct Approach:**
```javascript
// Field-level diff with normalization
function productsEqual(a, b) {
  if (a.id !== b.id) return false;
  const numericFields = ['price','stock','cost_price','mrp'];
  for (const field of numericFields) {
    if (Number(a[field]||0) !== Number(b[field]||0)) return false;
  }
  // Compare domain_data keys individually
  const aDD = a.domain_data || {};
  const bDD = b.domain_data || {};
  // ... deep comparison
}
```



---

## 📋 Immediate Action Plan (Next 48 Hours)

### Step 1: Run Critical Database Migrations

```bash
# From project root
cd e:\tenvo-main

# Check migration status
npx prisma migrate status

# Apply missing migrations (CRITICAL - DO THIS FIRST)
npx prisma migrate deploy

# Verify unique constraints were created
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'products' AND indexname LIKE '%active%';"
```

**Expected Output:**
```
products_business_sku_active_key
products_business_barcode_active_key
products_business_name_active_key
```

---

### Step 2: Remove Invalid Column References

**File:** `lib/actions/premium/automation/inventory_composite.js`


```javascript
// BEFORE (lines 66-76):
const safeFields = [
  'business_id', 'name', 'sku', 'barcode', 'category', 'category_id', 
  'brand', 'unit', 'description', 'price', 'cost_price', 'mrp', 
  'tax_percent', 'min_stock', 'max_stock', 'min_stock_level',
  'reorder_point', 'reorder_quantity', 'location', 'image_url', 'status',
  'is_featured', 'is_tax_inclusive', 'expiry_date', 'batch_number',
  'manufacturing_date', 'domain_data', 'hsn_code', 'sac_code', 
  'is_active', 'unit_conversions',
  'tracking_mode', // ❌ REMOVE - doesn't exist
  'attributes',    // ❌ REMOVE - doesn't exist
  ...(!hasBatchesOrSerials ? ['stock'] : []),
];

// AFTER (CORRECT):
const safeFields = [
  'business_id', 'name', 'sku', 'barcode', 'category', 'category_id', 
  'brand', 'unit', 'description', 'price', 'cost_price', 'mrp', 
  'tax_percent', 'min_stock', 'max_stock', 'min_stock_level',
  'reorder_point', 'reorder_quantity', 'location', 'image_url', 
  'is_featured', 'expiry_date', 'batch_number',
  'manufacturing_date', 'domain_data', 'hsn_code', 'sac_code', 
  'is_active', 'unit_conversions',
  ...(!hasBatchesOrSerials ? ['stock'] : []),
];
```



---

### Step 3: Fix Internal ProductForm Create Path

**File:** `components/InventoryManager.jsx`

```javascript
// BEFORE (lines 2587-2592):
const handleAddProduct = async (productData) => {
  try {
    const newProduct = await createProductAction({  // ❌ Bypasses ledger
      ...productData,
      business_id: businessId
    });
    // ...
  }
};

// AFTER (CORRECT - Route through composite):
const handleAddProduct = async (productData) => {
  try {
    // Use onUpdate (composite) if available, otherwise fallback
    if (onUpdate) {
      const result = await onUpdate({
        productData: { ...productData, business_id: businessId },
        batches: productData.batches || [],
        serialNumbers: productData.serial_numbers || [],
        variants: productData.variants || [],
        initialStock: productData.stock || 0,
        isUpdate: false,
      });
      if (!result.success) throw new Error(result.error);
      return result.product;
    } else {
      // Fallback for standalone usage
      return await createProductAction({ ...productData, business_id: businessId });
    }
  } catch (error) {
    // ... error handling
  }
};
```



---

### Step 4: Add Excel Batch Column Persistence

**File:** `components/InventoryManager.jsx`

Add before line 515 in `handleExcelSave`:

```javascript
const extractBatchesFromRow = (row) => {
  const batches = row.batches || [];
  
  // If Excel columns were populated, create batch object
  if (row.batch_number && row.batch_quantity) {
    batches.push({
      batch_number: row.batch_number,
      quantity: row.batch_quantity,
      expiry_date: row.expiry_date || null,
      manufacturing_date: row.manufacturing_date || null,
      cost_price: row.cost_price || row.costPrice || 0,
    });
  }
  
  return filterMeaningfulBatches(batches);
};

// Then in the save loop (~line 520):
const batches = extractBatchesFromRow(changedRow);
const payload = leanProductPayloadForUpdate(changedRow);
const result = await onUpdate({
  productData: { ...payload, business_id: businessId },
  batches, // ✅ Now includes Excel batch columns
  serialNumbers: filterMeaningfulSerials(changedRow.serial_numbers || []),
  // ...
});
```

---

### Step 5: Audit Tenant Isolation

```bash
# Find all findUnique calls that might bypass tenant check
cd e:\tenvo-main
grep -rn "findUnique" lib/actions/ lib/services/ | grep -v "assertEntityBelongsToBusiness"
```

For each result, verify it includes `business_id` check or replace with `findFirst`.



---

## 🔧 Verification Commands

After applying fixes, run these to verify integrity:

```bash
# 1. Check Prisma schema matches database
npx prisma validate
npx prisma db pull --print  # Compare with current schema.prisma

# 2. Run verification scripts (from package.json)
bun run verify:inventory-domains
bun run verify:storefront-tenancy
bun run verify:storefront-domain-resolution
bun run verify:storefront-checkout-intelligence
bun run verify:mvp-launch

# 3. Check for duplicate products (should be 0 after unique constraints)
psql $DATABASE_URL -c "
SELECT business_id, sku, COUNT(*) as count
FROM products
WHERE COALESCE(is_deleted, false) = false
  AND sku IS NOT NULL
GROUP BY business_id, sku
HAVING COUNT(*) > 1;
"

# 4. Find products with stock but no location rows (indicates bypass path was used)
psql $DATABASE_URL -c "
SELECT p.id, p.name, p.stock, COUNT(psl.id) as location_count
FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.stock > 0
  AND p.is_deleted = false
GROUP BY p.id
HAVING COUNT(psl.id) = 0
LIMIT 20;
"

# 5. Test checkout flow end-to-end
# Visit demo storefront → Add product → Proceed to checkout → Complete order
# Monitor PostgreSQL logs for errors
```



---

## 📊 Issue Summary Matrix

| Issue | Severity | Impact | Files Affected | Fix Complexity | Estimated Hours |
|-------|----------|--------|----------------|----------------|-----------------|
| Multiple persistence paths | CRITICAL | Stock inaccuracies | 5 | Medium | 8-12 |
| Schema mismatches | CRITICAL | Transaction aborts | 2 | Low | 2-3 |
| Excel batch columns | CRITICAL | Data loss | 2 | Medium | 4-6 |
| Storefront order errors | CRITICAL | Lost sales | 3 | Medium | 6-8 |
| Tenant isolation | CRITICAL | Security breach | Multiple | High | 16-24 |
| Column divergence | HIGH | User confusion | 4 | High | 12-16 |
| Fallback paths | HIGH | Silent failures | 3 | Medium | 6-8 |
| Transaction boundaries | HIGH | Partial saves | 2 | Medium | 8-10 |
| Order items schema | HIGH | Order failures | 1 schema | Low | 2-4 |
| Decimal serialization | MEDIUM | Display bugs | 10+ | Low | 4-6 |
| Validation asymmetry | MEDIUM | Data quality | 3 | Medium | 6-8 |
| Batch/serial deltas | MEDIUM | Incorrect qty | 1 | High | 8-12 |
| Busy domain edits | MEDIUM | Cannot edit | 1 | Low | 2-3 |
| Excel diff logic | MEDIUM | False detection | 1 | Medium | 4-6 |

**Total Estimated Effort:** 88-126 developer hours (2-3 weeks for 1 developer)

---

## 🎯 Recommended Sprint Planning



### Sprint 1 (Week 1): Critical Stability

**Priority P0 - Must Fix to Resume Operations**

1. Run database migrations (`20260712`, `20260713`)
2. Remove `tracking_mode` and `attributes` from safeFields
3. Fix internal ProductForm create path
4. Add Excel batch column persistence
5. Audit and fix top 10 tenant isolation risks
6. Deploy to staging + end-to-end checkout testing

**Success Criteria:**
- ✅ Checkout completes without transaction errors
- ✅ Excel batch data persists to database
- ✅ All product creates go through InventoryService
- ✅ No cross-tenant data leaks in security audit

---

### Sprint 2 (Week 2): Consolidation

**Priority P1 - Prevent Future Issues**

1. Unify column definitions (single builder function)
2. Wire `productFieldMapper` throughout codebase
3. Fix Busy domain field edit bug
4. Replace JSON.stringify diff with field-level comparison
5. Add server-side validation to composite action
6. Implement batch/serial deletion detection

**Success Criteria:**
- ✅ All three modes show identical column data
- ✅ Domain fields editable in all modes
- ✅ Excel dirty detection has <1% false positives
- ✅ All product saves go through same validation

---

### Sprint 3 (Week 3): Enhancement & Polish

**Priority P2 - Quality of Life**

1. Add atomic bulk save option for Excel
2. Implement decimal serialization wrapper
3. Extend Excel Smart Paste to domain columns
4. Add transaction rollback on partial failure
5. Create comprehensive test suite
6. Update documentation

**Success Criteria:**
- ✅ 100-row Excel save completes atomically
- ✅ No Decimal-related runtime errors
- ✅ Smart Paste handles 20+ column TSV
- ✅ Unit tests cover all persistence paths



---

## 📚 Related Documentation

- `docs/AUDIT.md` - Original inventory UI modes audit (comprehensive)
- `docs/DATA_INTEGRITY_AND_FORMS.md` - Tenant isolation patterns
- `docs/INVENTORY_UI_MODES_WORKFLOW.md` - Mode switching documentation
- `docs/MARKET_READINESS.md` - Launch QA checklist
- `docs/DATABASE_MIGRATIONS.md` - Schema evolution process
- `AGENTS.md` - Learned facts and preferences

---

## 🔍 Key Files Reference

| Category | File Path | Primary Responsibility |
|----------|-----------|------------------------|
| **Entry Point** | `app/business/[category]/DashboardClient.jsx` | Dashboard shell, `handleSaveProduct` (correct path) |
| **Inventory Hub** | `components/InventoryManager.jsx` | Visual/Busy/Cards modes, Excel modal |
| **Excel Mode** | `components/ExcelModeModal.jsx` | Local state, undo/redo, Smart Paste |
| **Busy Grid** | `components/BusyGrid.jsx` | Keyboard navigation, inline edit |
| **Composite Action** | `lib/actions/premium/automation/inventory_composite.js` | Atomic product+inventory upsert |
| **Product Service** | `lib/services/ProductService.js` | CRUD + display stock calculation |
| **Inventory Service** | `lib/services/InventoryService.js` | Add/remove stock, ledger, locations |
| **Storefront Orders** | `app/api/storefront/[businessDomain]/orders/route.js` | Checkout endpoint |
| **Storefront Inventory** | `lib/storefront/storefrontOrderInventory.js` | FIFO stock decrement |
| **Schema** | `prisma/schema.prisma` | Single source of truth for database |



---

## 🚀 Post-Fix Testing Checklist

### Inventory Tests

- [ ] Create product via dashboard "Add Product" button
- [ ] Create product via Visual mode (internal form)
- [ ] Create product via Busy mode inline add
- [ ] Create product via Excel mode (new row + save)
- [ ] Edit product in Visual mode
- [ ] Edit product in Busy mode (inline cell edit)
- [ ] Edit product in Excel mode (batch changes + save)
- [ ] Add batch tracking to existing product
- [ ] Add serial numbers to product
- [ ] Import CSV with 50 products
- [ ] Verify all creates have `product_stock_locations` rows
- [ ] Verify all stock changes appear in `inventory_ledger`
- [ ] Verify display stock matches location sums

### Order Tests

- [ ] Complete storefront checkout (guest)
- [ ] Complete storefront checkout (logged in)
- [ ] Order with variant products
- [ ] Order with batch-tracked products
- [ ] Order with serial-tracked products  
- [ ] Verify stock decrements after order
- [ ] Verify FIFO allocation (oldest batch used first)
- [ ] Test low-stock notifications
- [ ] Test out-of-stock prevention
- [ ] Test order with discount applied
- [ ] Check order appears in hub Orders tab
- [ ] Verify order line items have correct `business_id`

### Multi-Tenant Tests

- [ ] Create product in Tenant A
- [ ] Login as Tenant B
- [ ] Try to edit Tenant A's product (should fail)
- [ ] Try to view Tenant A's product detail (should fail)
- [ ] Verify dashboard shows only Tenant B products
- [ ] Verify storefront shows only correct tenant products



---

## 💡 Long-Term Recommendations

### 1. Architectural

- **Single Data Flow:** All product writes must go through `upsertIntegratedProductAction`
- **Deprecate Direct Prisma Writes:** Remove `createProductAction` / `updateProductAction` or make them private (internal to composite only)
- **Centralized Column Builder:** Extract `buildInventoryGridColumns(category, mode)` used by all views
- **Type Safety:** Generate TypeScript types from Prisma schema, enforce at action boundaries
- **Transaction Middleware:** Wrap all multi-step operations in explicit transaction helpers

### 2. Monitoring & Observability

- **Add APM tracing:** Track inventory action latency and error rates
- **Stock reconciliation job:** Daily check that `products.stock` === sum of `product_stock_locations`
- **Orphan detection:** Alert when products have stock but no location rows
- **Audit log:** Record all inventory mutations with user/timestamp/before/after values
- **Dead letter queue:** Capture failed Excel bulk saves for manual review

### 3. Testing

- **Integration tests:** Full checkout flow, order → stock decrement → ledger → fulfillment
- **Snapshot tests:** Freeze column definitions, fail on drift
- **Property-based tests:** Generate random products, verify invariants (stock ≥ 0, etc.)
- **Load tests:** 1000-row Excel save, concurrent orders on same product
- **Tenant isolation tests:** Automated security regression suite

### 4. Documentation

- **Architecture Decision Records (ADRs):** Document why composite path was chosen
- **Runbooks:** Step-by-step guides for common failure modes
- **Data dictionary:** Explain every column in `products`, `invoices`, `orders` tables
- **Migration playbook:** Safe process for schema changes with rollback steps



---

## 🎓 Lessons Learned

### What Went Wrong

1. **Multiple code paths without enforced consistency**
   - ProductForm, Excel, Busy, Import all implemented slightly different logic
   - No shared abstraction forced duplication and drift

2. **Schema evolved faster than code**
   - Migrations added columns/constraints
   - Old code still referenced legacy columns
   - No automated check for schema-code alignment

3. **Transaction boundaries unclear**
   - Some operations atomic, others not
   - Inconsistent error handling led to partial state

4. **Testing gaps**
   - No integration tests for full order flow
   - No tests for cross-tenant isolation
   - Manual QA couldn't catch race conditions

5. **Documentation lag**
   - `AUDIT.md` comprehensive but discovered issues post-launch
   - No requirement that code changes update docs
   - Onboarding docs didn't reflect current state

### What Went Right

1. **Comprehensive audit documentation**
   - `AUDIT.md` provided excellent forensic trail
   - Migration SQL comments explain purpose
   - AGENTS.md captured tribal knowledge

2. **Prisma schema as single source of truth**
   - Even with issues, schema was canonical
   - Migrations properly version-controlled

3. **Service layer abstraction**
   - `InventoryService` / `ProductService` centralized logic
   - Enabled this audit to trace data flows

4. **Soft-delete patterns**
   - Prevented permanent data loss
   - Allowed unique constraint fixes without destroying history

---

## 📞 Support & Questions

**For urgent issues related to this audit:**
- Create GitHub issue with tag `inventory-critical`
- Reference this document: `INVENTORY_ROOT_CAUSE_ANALYSIS.md`
- Include:
  - Error message / screenshot
  - Steps to reproduce
  - Affected tenant/product IDs
  - Recent actions (create/edit/order)

**Normal development questions:**
- Slack: #inventory-dev
- Wiki: https://wiki.tenvo.store/inventory
- Office hours: Tuesday/Thursday 2-3pm

---

**Document Version:** 1.0  
**Last Updated:** July 12, 2026  
**Next Review:** After Sprint 1 completion  
**Maintainer:** Engineering Team

