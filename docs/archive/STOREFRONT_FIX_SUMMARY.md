# Storefront 404 Fix Summary

## Problem
The public store page at `/store/foodies` (or any business domain) was returning 404 Not Found.

## Root Cause Analysis
The issue was in `lib/actions/storefront/business.js` where the SQL query checked `b.is_active = true`. 
For businesses created before the `is_active` column was added, this column could be `NULL`, and the query `b.is_active = true` would NOT match rows where `is_active IS NULL`.

## Fixes Applied

### 1. Fixed `getBusinessByDomain` Query (lib/actions/storefront/business.js)
Changed all `b.is_active = true` checks to `COALESCE(b.is_active, true) = true` in three places:

**Location 1 - Main query (line 43):**
```sql
-- Before:
WHERE LOWER(b.domain) = ANY($1) AND b.is_active = true

-- After:
WHERE LOWER(b.domain) = ANY($1) AND COALESCE(b.is_active, true) = true
```

**Location 2 - Fallback query (line 61):**
```sql
-- Before:
WHERE LOWER(b.domain) = ANY($1) AND b.is_active = true

-- After:
WHERE LOWER(b.domain) = ANY($1) AND COALESCE(b.is_active, true) = true
```

**Location 3 - Custom domain query (line 86):**
```sql
-- Before:
WHERE LOWER(cd.domain) = ANY($1) AND cd.is_active = true AND b.is_active = true

-- After:
WHERE LOWER(cd.domain) = ANY($1) AND cd.is_active = true AND COALESCE(b.is_active, true) = true
```

### 2. Created Diagnostic Script (scripts/diagnose-store-issue.js)
Run to check if a specific business domain exists and diagnose issues:
```bash
node scripts/diagnose-store-issue.js foodies
```

### 3. Created Fix Script (scripts/fix-storefront-issues.js)
Run to fix NULL is_active values and ensure indexes exist:
```bash
node scripts/fix-storefront-issues.js
```

## Architecture Flow

### Route Structure
```
app/store/[businessDomain]/
├── layout.jsx          # Store layout with header/footer
├── page.jsx            # Store home page
├── products/
│   └── [slug]/page.jsx # Product detail page
└── ...other routes
```

### Data Flow
1. User visits `/store/foodies`
2. Next.js matches `[businessDomain]` dynamic route
3. `layout.jsx` calls `getBusinessByDomain('foodies')`
4. If business not found → triggers `notFound()` → 404 page
5. If found → renders store with business data

### Database Schema
**businesses table:**
- `id` (UUID)
- `business_name` (TEXT)
- `domain` (TEXT, UNIQUE) - This is the store URL slug (e.g., "foodies")
- `is_active` (BOOLEAN) - Can be NULL for legacy businesses
- `category` (TEXT) - Business type (e.g., "restaurant-cafe")
- ...other fields

**Key Point:** The `domain` field stores the unique URL handle (slug), NOT the business type/category.

## How Business Registration Works

During registration (app/register/page.js):
1. User enters business name (e.g., "Foodies Restaurant")
2. System generates `handle` slug (e.g., "foodies-restaurant")
3. User can customize the handle (e.g., change to "foodies")
4. System checks availability via `checkDomainAvailabilityAction`
5. On submit, `createBusiness` saves the handle as the `domain` field

## Verification Steps

1. **Check business exists:**
   ```sql
   SELECT id, business_name, domain, is_active 
   FROM businesses 
   WHERE LOWER(domain) = 'foodies';
   ```

2. **Fix NULL is_active:**
   ```sql
   UPDATE businesses 
   SET is_active = true 
   WHERE is_active IS NULL;
   ```

3. **Test storefront query:**
   ```sql
   SELECT b.id, b.business_name, b.domain
   FROM businesses b
   WHERE LOWER(b.domain) = 'foodies' 
     AND COALESCE(b.is_active, true) = true;
   ```

## Expected Store URL Format
- Local: `http://localhost:3000/store/{business-domain}`
- Example: `http://localhost:3000/store/foodies`

## Troubleshooting

If 404 persists after these fixes:

1. **Check server logs** - Look for `[getBusinessByDomain]` console messages
2. **Verify database connection** - Ensure DATABASE_URL is correct
3. **Check if business exists** - Run the diagnostic script
4. **Verify column exists** - Ensure `is_active` column was added by migration
5. **Restart dev server** - Sometimes Next.js caches need clearing

## Files Modified
- `lib/actions/storefront/business.js` - Fixed is_active NULL handling

## Files Created
- `scripts/diagnose-store-issue.js` - Diagnostic tool
- `scripts/fix-storefront-issues.js` - Automated fix tool
- `STOREFRONT_FIX_SUMMARY.md` - This documentation
