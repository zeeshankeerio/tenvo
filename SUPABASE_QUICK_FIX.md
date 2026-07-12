# Quick Fix for Supabase Users

Since you're using Supabase, here's the easiest way to apply the fix:

## Option 1: Supabase SQL Editor (Recommended - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy & Paste the Migration**
   - Open: `prisma/migrations/20260713_products_unique_constraints/migration.sql`
   - Copy all the SQL
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Success**
   You should see:
   ```
   Success. No rows returned.
   ```

5. **Test It**
   - Go to your Inventory Engine
   - Try creating a product
   - Should work without errors!

## Option 2: Using Prisma (Automated)

```bash
# This will work now with the updated script
node apply-products-fix.mjs
```

The script has been updated to:
- Use `prisma db execute` instead of psql
- Work with Supabase connection pooling
- Handle Supabase-specific constraints

## Option 3: Prisma Migrate Deploy

```bash
npx prisma migrate deploy
```

This applies any pending migrations to your database.

## Verification

After applying, run this query in Supabase SQL Editor:

```sql
SELECT 
    i.relname AS index_name,
    idx.indisunique AS is_unique
FROM pg_index idx
INNER JOIN pg_class i ON i.oid = idx.indexrelid
INNER JOIN pg_class t ON t.oid = idx.indrelid
WHERE t.relname = 'products'
  AND i.relname LIKE '%active_key'
ORDER BY i.relname;
```

**Expected results:**
```
index_name                              | is_unique
----------------------------------------+----------
products_business_barcode_active_key    | t
products_business_name_active_key       | t
products_business_sku_active_key        | t
```

If you see these 3 indexes, the fix is installed correctly! ✅

## Troubleshooting

### "Migration already applied"
- This is fine! The fix is already in place.
- Test your Inventory Engine to confirm.

### "Duplicate key violation" when running migration
- You have duplicate products
- Run this in Supabase SQL Editor first:
  ```sql
  -- Copy contents of fix_duplicate_products.sql
  ```
- Then apply the migration again

### Still seeing "no unique constraint" errors
- Check if migration actually ran:
  ```sql
  SELECT * FROM _prisma_migrations 
  WHERE migration_name LIKE '%products_unique%';
  ```
- If empty, the migration didn't apply - try again

## Need Help?

See the main documentation:
- **Quick Start**: `PRODUCTS_FIX_README.md`
- **Visual Guide**: `VISUAL_GUIDE.md`
- **Technical Details**: `FIX_PRODUCTS_CONSTRAINT_ERRORS.md`
