# Products Constraint Fix - Quick Start

## The Problem

Inventory Engine shows errors:
- ❌ "Failed to update stock: there is no unique or exclusion constraint matching the ON CONFLICT specification"
- ❌ "Failed to save product: there is no unique or exclusion constraint matching the ON CONFLICT specification"

## The Solution

Add unique constraints to the `products` table to support database upsert operations.

## Quick Fix (Recommended)

### Option 1: Using Node.js Script (Easiest)

```bash
node apply-products-fix.mjs
```

This will:
1. ✅ Check for duplicate products
2. ✅ Apply the migration using Prisma
3. ✅ Verify constraints are created
4. ✅ Show next steps

### Option 2: Using PowerShell Script (Windows)

```powershell
.\apply-products-fix.ps1
```

Interactive script that guides you through the fix.

### Option 3: Manual Steps

```bash
# 1. Check for duplicates
psql "$DATABASE_URL" -f check_duplicates.sql

# 2. Fix duplicates (if any found)
psql "$DATABASE_URL" -f fix_duplicate_products.sql

# 3. Apply migration
npx prisma migrate dev --name products_unique_constraints

# 4. Verify
psql "$DATABASE_URL" -f check_constraints.sql
```

## What Gets Fixed

The migration adds 3 soft-delete-aware unique indexes:

1. **`products_business_sku_active_key`**
   - Prevents duplicate SKUs within a business
   - Allows SKU reuse after product deletion
   
2. **`products_business_barcode_active_key`**
   - Prevents duplicate barcodes
   - Ensures barcode scanning works correctly

3. **`products_business_name_active_key`**
   - Prevents duplicate product names
   - Reduces user confusion

## Files Reference

| File | Purpose |
|------|---------|
| `FIX_PRODUCTS_CONSTRAINT_ERRORS.md` | **Detailed guide** with full explanation |
| `apply-products-fix.mjs` | **Node.js automated fix** (recommended) |
| `apply-products-fix.ps1` | **PowerShell automated fix** (Windows) |
| `check_duplicates.sql` | Find existing duplicates |
| `fix_duplicate_products.sql` | Auto-fix duplicates |
| `check_constraints.sql` | Verify database constraints |
| `prisma/migrations/20260713_products_unique_constraints/migration.sql` | The actual migration |

## Testing After Fix

1. ✅ Create a new product → should work
2. ✅ Update product stock → should work
3. ✅ Try to create duplicate SKU → should show friendly error
4. ✅ Save in Visual/Busy/Excel modes → should work
5. ✅ Barcode scanning → should work

## Rollback (if needed)

```sql
DROP INDEX IF EXISTS products_business_sku_active_key;
DROP INDEX IF EXISTS products_business_barcode_active_key;
DROP INDEX IF EXISTS products_business_name_active_key;
```

## Help

For detailed information, troubleshooting, and advanced scenarios, see:
**`FIX_PRODUCTS_CONSTRAINT_ERRORS.md`**

## Quick FAQ

**Q: Will this delete any data?**  
A: No. It only adds indexes to prevent future duplicates.

**Q: What if I have duplicate products?**  
A: Run `fix_duplicate_products.sql` to auto-rename them with suffixes.

**Q: Can I still reuse SKUs after deleting products?**  
A: Yes! The constraints only apply to active (non-deleted) products.

**Q: What if the fix doesn't work?**  
A: Check `FIX_PRODUCTS_CONSTRAINT_ERRORS.md` for troubleshooting, or search the codebase for ON CONFLICT queries that need updating.

**Q: Is this safe for production?**  
A: Yes, but always backup first! The indexes are non-blocking and don't modify existing data.

---

**Need more details?** → Read `FIX_PRODUCTS_CONSTRAINT_ERRORS.md`
