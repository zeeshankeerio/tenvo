# 🔧 Products Constraint Fix - START HERE

## ⚡ Quick Fix (30 seconds)

```bash
node apply-products-fix.mjs
```

That's it! The script will automatically:
- ✅ Check for issues
- ✅ Apply the fix
- ✅ Verify it worked
- ✅ Run tests

## 🎯 What This Fixes

Your Inventory Engine is showing these errors:

```
❌ "Failed to update stock: there is no unique or exclusion 
    constraint matching the ON CONFLICT specification"

❌ "Failed to save product: there is no unique or exclusion 
    constraint matching the ON CONFLICT specification"
```

## 📚 Documentation Index

Choose your learning style:

| Guide | Best For | Time |
|-------|----------|------|
| **[PRODUCTS_FIX_README.md](PRODUCTS_FIX_README.md)** | Quick reference, FAQ | 2 min |
| **[VISUAL_GUIDE.md](VISUAL_GUIDE.md)** | Visual learners, diagrams | 5 min |
| **[CONSTRAINT_FIX_COMPLETE.md](CONSTRAINT_FIX_COMPLETE.md)** | Complete overview | 10 min |
| **[FIX_PRODUCTS_CONSTRAINT_ERRORS.md](FIX_PRODUCTS_CONSTRAINT_ERRORS.md)** | Technical deep dive | 20 min |

## 🚀 Installation Options

### Option 1: Automated (Recommended)
```bash
node apply-products-fix.mjs
```

### Option 2: PowerShell (Windows)
```powershell
.\apply-products-fix.ps1
```

### Option 3: Manual Steps
```bash
psql "$DATABASE_URL" -f check_duplicates.sql
psql "$DATABASE_URL" -f fix_duplicate_products.sql
npx prisma migrate dev --name products_unique_constraints
psql "$DATABASE_URL" -f test-products-constraint.sql
```

## 📦 Files Overview

### 📖 Documentation
- `PRODUCTS_FIX_README.md` - Quick start guide
- `VISUAL_GUIDE.md` - Diagrams and examples
- `CONSTRAINT_FIX_COMPLETE.md` - Complete reference
- `FIX_PRODUCTS_CONSTRAINT_ERRORS.md` - Technical details

### 🚀 Scripts
- `apply-products-fix.mjs` - Automated fix (Node.js)
- `apply-products-fix.ps1` - Automated fix (PowerShell)

### 🔧 Database Tools
- `check_duplicates.sql` - Find duplicate products
- `fix_duplicate_products.sql` - Auto-fix duplicates
- `check_constraints.sql` - Verify database constraints
- `test-products-constraint.sql` - Test the fix

## ✅ After Installation

Test these scenarios:

1. **Create Product** - Should work without errors
2. **Update Stock** - Should work without errors
3. **Try Duplicate SKU** - Should show friendly error
4. **Delete & Reuse SKU** - Should allow SKU reuse

## 🆘 Need Help?

- **Quick question?** → Check `PRODUCTS_FIX_README.md`
- **Visual explanation?** → See `VISUAL_GUIDE.md`
- **Technical issue?** → Read `FIX_PRODUCTS_CONSTRAINT_ERRORS.md`
- **Complete reference?** → Browse `CONSTRAINT_FIX_COMPLETE.md`

## 🎯 Success Criteria

Fix is successful when:
- ✅ No "no unique constraint" errors
- ✅ Products save in all modes (Visual/Busy/Excel)
- ✅ Stock updates work correctly
- ✅ Duplicate SKUs rejected with friendly error
- ✅ Barcode scanning works
- ✅ SKU reuse works after deletion

## 🔄 Rollback (if needed)

```sql
DROP INDEX IF EXISTS products_business_sku_active_key;
DROP INDEX IF EXISTS products_business_barcode_active_key;
DROP INDEX IF EXISTS products_business_name_active_key;
```

---

## 🎉 Ready?

**Run the fix now:**
```bash
node apply-products-fix.mjs
```

**Questions?** Read the docs linked above.

**Issues?** Check `FIX_PRODUCTS_CONSTRAINT_ERRORS.md` troubleshooting section.
