# Fix: Missing `created_at` Column in `product_stock_locations`

## Issue Summary

**Error:**
```
error: column "created_at" does not exist
hint: Perhaps you meant to reference the column "product_stock_locations.updated_at"
```

This error occurs during storefront order creation when the system attempts to decrement warehouse stock using FIFO (First In First Out) logic.

## Root Cause

The `product_stock_locations` table was created in migration `007_manufacturing_stock.sql` **without** a `created_at` column, only with `updated_at`:

```sql
CREATE TABLE IF NOT EXISTS product_stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),  -- ❌ No created_at column
  CONSTRAINT unique_product_location UNIQUE (location_id, product_id)
);
```

However, the storefront order processing code in `lib/storefront/storefrontOrderStock.js` (line 122) references `created_at` for FIFO ordering:

```javascript
const locRes = await client.query(
  `SELECT id, quantity::float AS quantity
   FROM product_stock_locations
   WHERE product_id = $1::uuid AND business_id = $2::uuid
     AND COALESCE(state, 'sellable') = 'sellable'
     AND quantity > 0
   ORDER BY created_at ASC NULLS LAST, id ASC`,  -- ❌ Column doesn't exist
  [productId, businessId]
);
```

## Solution

Created migration `032_add_created_at_to_product_stock_locations.sql` that:

1. **Adds the missing `created_at` column** with a default value of `NOW()`
2. **Backfills existing rows** by copying from `updated_at` (or using `NOW()` if null)
3. **Creates an index** on `created_at` for optimal FIFO query performance
4. **Adds documentation** via a SQL comment explaining the column's purpose

## Running the Migration

### Option 1: Using the provided script (Recommended)
```bash
node scripts/run_migration_032.js
```

### Option 2: Using bun
```bash
bun scripts/run_migration_032.js
```

### Option 3: Direct SQL execution
Connect to your database and run:
```bash
psql $DATABASE_URL -f supabase/migrations/032_add_created_at_to_product_stock_locations.sql
```

## Expected Outcome

After running the migration:

✅ The `product_stock_locations` table will have a `created_at` column  
✅ All existing rows will have `created_at` populated (backfilled from `updated_at`)  
✅ New rows will automatically get `created_at = NOW()`  
✅ FIFO stock depletion will work correctly in storefront orders  
✅ The "column created_at does not exist" error will be resolved  

## Testing

After applying the migration, test the fix by:

1. Creating a storefront order through the API
2. Verifying that the order completes successfully without the column error
3. Checking that stock is decremented correctly

```bash
# Example test command (if you have automated tests)
npm run test:integration -- --grep "storefront.*order"
```

## Files Changed

- **Created:** `supabase/migrations/032_add_created_at_to_product_stock_locations.sql`
- **Created:** `scripts/run_migration_032.js`
- **Created:** `docs/FIX_PRODUCT_STOCK_LOCATIONS_CREATED_AT.md` (this file)

## Related Code

- **Error location:** `app/api/storefront/[businessDomain]/orders/route.js`
- **FIFO logic:** `lib/storefront/storefrontOrderStock.js:122`
- **Original table creation:** `supabase/migrations/007_manufacturing_stock.sql`

## Prevention

To prevent similar issues in the future:

1. Always include both `created_at` and `updated_at` on tables that track temporal data
2. Review code that queries tables to ensure all referenced columns exist
3. Run migrations in a test environment before production deployment
