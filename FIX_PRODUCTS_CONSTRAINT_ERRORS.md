# Fix: Products Unique Constraint Errors

## Problem

Two errors are occurring in the Inventory Engine:

1. **"Failed to update stock: there is no unique or exclusion constraint matching the ON CONFLICT specification"**
2. **"Failed to save product: there is no unique or exclusion constraint matching the ON CONFLICT specification"**

## Root Cause

The application code attempts to use PostgreSQL's `ON CONFLICT (business_id, sku) DO UPDATE/NOTHING` upsert syntax, but the `products` table lacks the necessary UNIQUE constraints or UNIQUE INDEXES on these column combinations.

Current state:
- `products` table has only regular indexes: `@@index([business_id, sku])`
- No unique constraints exist on `(business_id, sku)`, `(business_id, barcode)`, or `(business_id, name)`

PostgreSQL requires a UNIQUE constraint or UNIQUE INDEX to match the ON CONFLICT specification.

## Solution Overview

1. Create partial unique indexes (soft-delete aware) to prevent duplicates among active products
2. Allow SKU/barcode/name reuse after soft deletion
3. Clean up any existing duplicates before applying constraints
4. Update Prisma schema documentation

## Files Created

### 1. Migration SQL
**File**: `prisma/migrations/20260713_products_unique_constraints/migration.sql`
- Adds soft-delete-aware partial unique indexes:
  - `products_business_sku_active_key` on `(business_id, sku)`
  - `products_business_barcode_active_key` on `(business_id, barcode)`
  - `products_business_name_active_key` on `(business_id, name)`
- Each index includes `WHERE COALESCE(is_deleted, false) = false` to only enforce uniqueness on active products

### 2. Duplicate Detection Script
**File**: `check_duplicates.sql`
- Queries to find existing duplicate SKUs, barcodes, and product names
- Summary statistics of affected records
- Run this BEFORE applying the migration to identify issues

### 3. Duplicate Cleanup Script  
**File**: `fix_duplicate_products.sql`
- Automatically fixes duplicates by appending suffixes:
  - Duplicate SKUs → `SKU-001-DUP2`, `SKU-001-DUP3`, etc.
  - Duplicate Barcodes → `BAR123-DUP2`, etc.
  - Duplicate Names → `Product Name (2)`, `Product Name (3)`, etc.
- Keeps the oldest record unchanged, modifies newer duplicates
- Run this BEFORE applying the migration if duplicates exist

### 4. Constraint Verification Script
**File**: `check_constraints.sql`
- Queries to inspect all constraints and unique indexes on the products table
- Useful for debugging and verification after migration

## Step-by-Step Fix

### Step 1: Backup Database
```bash
# Create a backup before making changes
pg_dump -h your-host -U your-user -d your-db -t products > products_backup.sql
```

### Step 2: Check for Duplicates
```bash
psql -h your-host -U your-user -d your-db -f check_duplicates.sql
```

**Expected output if no duplicates:**
```
 issue_type | business_id | sku | count | product_ids 
------------+-------------+-----+-------+-------------
(0 rows)
```

**If duplicates found:**
Proceed to Step 3.

**If no duplicates:**
Skip to Step 4.

### Step 3: Fix Duplicates (if needed)
```bash
psql -h your-host -U your-user -d your-db -f fix_duplicate_products.sql
```

This will automatically rename duplicates with suffixes. Review the NOTICE messages to see what changed.

### Step 4: Apply Migration
```bash
# Using Prisma
npx prisma migrate dev --name products_unique_constraints

# OR using psql directly
psql -h your-host -U your-user -d your-db -f prisma/migrations/20260713_products_unique_constraints/migration.sql
```

### Step 5: Verify Constraints
```bash
psql -h your-host -U your-user -d your-db -f check_constraints.sql
```

**Expected output should include:**
```
       constraint_name        | constraint_type 
------------------------------+-----------------
 products_business_sku_active_key     | u
 products_business_barcode_active_key | u  
 products_business_name_active_key    | u
```

### Step 6: Test the Application
1. Try creating a product in the Inventory Engine
2. Try updating stock quantities
3. Try saving products in Visual/Busy/Excel modes
4. Verify no constraint errors appear

## Understanding the Fix

### Partial Unique Indexes

The migration creates **partial unique indexes** with a WHERE clause:

```sql
CREATE UNIQUE INDEX products_business_sku_active_key
  ON products(business_id, sku)
  WHERE COALESCE(is_deleted, false) = false
    AND sku IS NOT NULL
    AND TRIM(sku) != '';
```

**Benefits:**
- ✅ Prevents duplicate SKUs within the same business (for active products)
- ✅ Allows SKU reuse after soft deletion
- ✅ Ignores NULL or empty SKUs (multiple products can have no SKU)
- ✅ Supports ON CONFLICT clauses in SQL queries

### Why Three Indexes?

1. **SKU uniqueness** - Most critical, SKUs are the primary identifier
2. **Barcode uniqueness** - Prevents scanning conflicts
3. **Name uniqueness** - Prevents confusion in dropdowns and search

Some businesses may want duplicate names with different SKUs. If this is too strict, you can drop the name constraint:

```sql
DROP INDEX IF EXISTS products_business_name_active_key;
```

## Code Changes Needed (Optional)

If your code uses ON CONFLICT, ensure it references the constraint properly:

**Before** (won't work):
```sql
INSERT INTO products (business_id, sku, name, price)
VALUES ($1, $2, $3, $4)
ON CONFLICT (business_id, sku) DO UPDATE
SET name = EXCLUDED.name, price = EXCLUDED.price;
```

**After** (works with partial index):
The partial index will work for the above query because PostgreSQL can infer the constraint from the columns. However, for clarity:

```sql
INSERT INTO products (business_id, sku, name, price)
VALUES ($1, $2, $3, $4)
ON CONFLICT (business_id, sku) 
  WHERE COALESCE(is_deleted, false) = false 
DO UPDATE
SET name = EXCLUDED.name, price = EXCLUDED.price
WHERE COALESCE(products.is_deleted, false) = false;
```

## Alternative: Using Application-Level Upserts

Instead of ON CONFLICT, you can handle upserts in application code:

```javascript
// Check if product exists
const existing = await db.products.findFirst({
  where: { business_id: businessId, sku: sku, is_deleted: false }
});

if (existing) {
  // Update
  await db.products.update({
    where: { id: existing.id },
    data: { name, price, ... }
  });
} else {
  // Create
  await db.products.create({
    data: { business_id: businessId, sku, name, price, ... }
  });
}
```

This is safer but slower for bulk operations.

## Monitoring and Maintenance

### Check for Constraint Violations

Run periodically to ensure data integrity:

```sql
-- Active products with duplicate SKUs
SELECT business_id, sku, COUNT(*) 
FROM products 
WHERE is_deleted = false AND sku IS NOT NULL
GROUP BY business_id, sku 
HAVING COUNT(*) > 1;
```

### Handling Future Conflicts

If a user tries to create a product with a duplicate SKU:

**Error message:**
```
duplicate key value violates unique constraint "products_business_sku_active_key"
```

**User-friendly handling:**
```javascript
try {
  await createProduct(data);
} catch (error) {
  if (error.code === '23505') { // Postgres unique violation
    if (error.constraint === 'products_business_sku_active_key') {
      return { 
        success: false, 
        error: `A product with SKU "${data.sku}" already exists. Please use a different SKU.`
      };
    }
    if (error.constraint === 'products_business_barcode_active_key') {
      return { 
        success: false, 
        error: `A product with barcode "${data.barcode}" already exists.`
      };
    }
    if (error.constraint === 'products_business_name_active_key') {
      return { 
        success: false, 
        error: `A product named "${data.name}" already exists. Please use a different name.`
      };
    }
  }
  throw error;
}
```

## Rollback Plan

If the migration causes issues:

```sql
-- Drop the unique indexes
DROP INDEX IF EXISTS products_business_sku_active_key;
DROP INDEX IF EXISTS products_business_barcode_active_key;
DROP INDEX IF EXISTS products_business_name_active_key;

-- Recreate the original regular index
CREATE INDEX IF NOT EXISTS idx_products_business_id_sku 
  ON products(business_id, sku);
```

## Testing Checklist

- [ ] Backup database completed
- [ ] No duplicate products found (or fixed)
- [ ] Migration applied successfully
- [ ] Constraints verified in database
- [ ] Create new product - works
- [ ] Update existing product - works
- [ ] Update stock quantities - works
- [ ] Save in Visual mode - works
- [ ] Save in Busy mode - works
- [ ] Save in Excel mode - works
- [ ] Barcode scanning - works
- [ ] Duplicate SKU rejected with friendly error
- [ ] Soft-deleted product SKU can be reused

## Related Files Modified

1. **prisma/schema.prisma** - Added documentation comments about partial unique indexes
2. **This document** - Comprehensive fix guide

## Support

If issues persist after applying this fix:

1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
2. Review constraint violations: Run `check_constraints.sql`
3. Check for orphaned ON CONFLICT queries: Search codebase for `ON CONFLICT` and verify column names match
4. Verify Prisma client regenerated: `npx prisma generate`

## References

- PostgreSQL Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
- Prisma Unique Constraints: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#unique-constraints
