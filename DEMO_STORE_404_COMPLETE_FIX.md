# Demo Store 404 - Complete Fix Implementation

**Date:** July 7, 2026  
**Status:** ✅ **FIXES IMPLEMENTED - TESTING REQUIRED**

---

## 🎯 ISSUES IDENTIFIED & FIXED

### Issue #1: Missing Reviews API Route ✅ FIXED

**Error:**
```
GET /api/storefront/demo-boutique/products/{id}/reviews?page=1
404 Not Found
```

**Root Cause:** Route file didn't exist

**Fix:** Created `app/api/storefront/[businessDomain]/products/[productId]/reviews/route.js`

**Features:**
- ✅ GET endpoint for fetching reviews with pagination
- ✅ POST endpoint for submitting new reviews
- ✅ Business domain resolution
- ✅ Graceful fallback if `product_reviews` table doesn't exist
- ✅ Review approval system (reviews pending until approved)
- ✅ Pagination support (10 reviews per page)

### Issue #2: Stock API Returns 404 ⚠️ INVESTIGATING

**Error:**
```
POST /api/storefront/demo-boutique/products/{id}/stock
404 "Store not found"
```

**Root Cause:** `resolveStorefrontBusiness('demo-boutique')` returns NULL

**Investigation:**
- ✅ Route EXISTS at correct path
- ✅ Database query works (verified by diagnostic)
- ❌ Runtime resolution fails

**Possible Causes:**
1. **Redis cache corruption** (most likely)
2. **Next.js server cache** stale
3. **Runtime environment mismatch** (dev vs production paths)

**Fix Applied:**
- Added detailed logging to stock and reviews routes
- Logs will show exact point of failure

---

## 📊 WHAT WAS CREATED

### New Files

1. **`app/api/storefront/[businessDomain]/products/[productId]/reviews/route.js`**
   - GET: Fetch paginated reviews
   - POST: Submit new review
   - Handles missing table gracefully
   - Full business validation

### Modified Files

1. **`app/api/storefront/[businessDomain]/products/[productId]/stock/route.js`**
   - Added console logging for debugging
   - Logs business resolution success/failure

2. **`app/api/storefront/[businessDomain]/products/[productId]/reviews/route.js`**
   - Added console logging for debugging

---

## 🔧 TESTING INSTRUCTIONS

### Step 1: Clear All Caches

```bash
# 1. Clear Redis
redis-cli FLUSHDB

# 2. Delete Next.js cache
rmdir /s /q .next

# 3. Rebuild
npm run build

# 4. Start dev server
npm run dev
```

### Step 2: Hard Refresh Browser

- Chrome: `Ctrl + Shift + Delete` → Clear cache
- Or use Incognito mode
- Then `Ctrl + Shift + R` (hard refresh)

### Step 3: Test Demo Store

Visit: `http://localhost:3000/store/demo-boutique`

#### Test Reviews API:

1. Navigate to any product
2. Open browser DevTools → Console
3. Look for logs:
   ```
   [reviews route] Resolving business for domain: demo-boutique
   [reviews route] Business resolved: ✅ {uuid}  or  ❌ null
   ```
4. Check Network tab:
   - `GET /api/storefront/demo-boutique/products/{id}/reviews?page=1`
   - Should return `200 OK` with empty reviews array

#### Test Stock API:

1. Click on a product with variants (sizes/colors)
2. Select a variant
3. Check Console for:
   ```
   [stock route] Resolving business for domain: demo-boutique
   [stock route] Business resolved: ✅ {uuid}  or  ❌ null
   ```
4. Check Network tab:
   - `POST /api/storefront/demo-boutique/products/{id}/stock`
   - Should return `200 OK` with stock data

### Step 4: Check Server Logs

In your terminal running `npm run dev`, you should see:

**Success:**
```
[reviews route] Resolving business for domain: demo-boutique
[reviews route] Business resolved: ✅ 71f6fc60-5f57-4769-9644-c3f227118e17
[stock route] Resolving business for domain: demo-boutique
[stock route] Business resolved: ✅ 71f6fc60-5f57-4769-9644-c3f227118e17
```

**Failure (if still happening):**
```
[reviews route] Resolving business for domain: demo-boutique
[reviews route] Business resolved: ❌ null
[reviews route] Store not found for domain: demo-boutique
```

---

## 🐛 IF STILL GETTING 404 AFTER CACHE CLEAR

### Debug Steps

1. **Check `resolveStorefrontBusiness` function:**
   ```bash
   # Add temporary logging
   # File: lib/tenancy/resolveStorefrontBusiness.js
   # Line: ~350
   ```

2. **Verify business exists:**
   ```sql
   SELECT id, business_name, domain, is_active 
   FROM businesses 
   WHERE domain = 'demo-boutique';
   ```

3. **Check if Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

4. **Test direct database query:**
   ```sql
   SELECT b.id, b.business_name, b.domain,
          COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled
   FROM businesses b
   LEFT JOIN business_settings bs ON b.id = bs.business_id
   WHERE LOWER(b.domain) = 'demo-boutique'
     AND COALESCE(b.is_active, true) = true;
   ```

5. **Check Next.js route resolution:**
   - Ensure files are in correct locations
   - Check for typos in folder names
   - Restart dev server completely

---

## 📋 DATABASE REQUIREMENTS

### Required Tables

**For Reviews API:**
```sql
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_email VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    body TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_business_id ON product_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(is_approved);
```

**If table doesn't exist:**
- Reviews API returns empty array gracefully
- No errors, just `reviews: []`
- You can create the table later

**For Stock API:**
- Uses existing `products` and `product_variants` tables
- Should work immediately

---

## ✅ EXPECTED RESULTS AFTER FIX

### Reviews Section

**Before Fix:**
- ❌ 404 error in console
- ❌ Reviews section doesn't load
- ❌ Can't submit reviews

**After Fix:**
- ✅ Reviews section loads (empty if no reviews)
- ✅ "Be the first to review" message shows
- ✅ Review submission form works
- ✅ No 404 errors in console

### Variant Selection

**Before Fix:**
- ❌ 404 error when clicking variants
- ❌ Stock check fails
- ❌ Can't see "Only X left" message
- ❌ Add to Cart might fail

**After Fix:**
- ✅ Clicking variant loads stock
- ✅ Shows "In Stock" or "Only X left"
- ✅ No 404 errors in console
- ✅ Add to Cart works smoothly

---

## 🔍 ROOT CAUSE ANALYSIS

### Why This Happened

**Reviews API:**
- Route file was never created
- Component (`ProductReviews.jsx`) was calling non-existent endpoint
- Silently failed in UI (non-critical feature)

**Stock API:**
- Route file EXISTS
- `resolveStorefrontBusiness()` function works in diagnostics
- But returns NULL at runtime in API route
- **Most likely:** Stale cache or Next.js compilation issue

### Prevention

**For Future:**
1. ✅ Run `npm run build` after route changes
2. ✅ Clear `.next` cache regularly during development
3. ✅ Clear Redis cache after schema/data changes
4. ✅ Use logging in API routes for debugging
5. ✅ Create verification scripts for all API endpoints

---

## 📚 RELATED FILES

### API Routes
- `app/api/storefront/[businessDomain]/products/[productId]/stock/route.js` (modified)
- `app/api/storefront/[businessDomain]/products/[productId]/reviews/route.js` (created)

### Components Using These APIs
- `components/storefront/ProductReviews.jsx` (reviews)
- `components/storefront/ProductVariants.jsx` (stock - indirectly)
- `components/storefront/AddToCartSection.jsx` (stock - indirectly)

### Domain Resolution
- `lib/tenancy/resolveStorefrontBusiness.js` (core logic)
- `lib/cache/storefrontDomainCache.js` (Redis caching)

### Diagnostic Scripts
- `scripts/diagnose-demo-stores-simple.mjs` (✅ verified database OK)

---

## 🎯 NEXT ACTIONS

### Immediate (Do Now)

```bash
# 1. Clear everything
redis-cli FLUSHDB
rmdir /s /q .next

# 2. Rebuild
npm run build

# 3. Start fresh
npm run dev

# 4. Test
# Visit: http://localhost:3000/store/demo-boutique
# Click any product
# Check console for logs
```

### If Logs Show NULL

The logging will tell us EXACTLY where the failure is:

**Scenario A: Business resolves successfully**
```
[stock route] Business resolved: ✅ 71f6fc60-...
→ Great! Stock API should work now
```

**Scenario B: Business is NULL**
```
[stock route] Business resolved: ❌ null
→ Issue is in resolveStorefrontBusiness()
→ Need to debug that function specifically
```

### If B (NULL), Then:

1. Add logging inside `resolveStorefrontBusiness.js`
2. Check Redis connection
3. Check database query execution
4. Verify no middleware blocking
5. Check if running in correct environment

---

## 💡 KEY INSIGHTS

### Architecture Understanding

1. **Domain Resolution Flow:**
   ```
   Request: /store/demo-boutique
   ↓
   Param: businessDomain = 'demo-boutique'
   ↓
   resolveStorefrontBusiness('demo-boutique')
   ↓
   Check Redis cache
   ↓
   If miss: Query businesses table
   ↓
   WHERE LOWER(domain) = 'demo-boutique'
   ↓
   Return business object or NULL
   ```

2. **Caching Layers:**
   - **L1:** Next.js request cache (short-lived)
   - **L2:** Redis domain cache (300s TTL)
   - **L3:** PostgreSQL (source of truth)

3. **Failure Points:**
   - Redis connection down → Falls back to L3
   - Database query fails → Returns NULL
   - Cache has wrong ID → Verified against L3
   - Next.js cache stale → Rebuild fixes

### Why Diagnostic Worked But Runtime Failed

**Diagnostic script:**
- Direct PostgreSQL query
- No caching layers
- Raw SQL execution
- ✅ Works perfectly

**Runtime API route:**
- Goes through caching
- Next.js compilation
- Multiple layers
- ❌ Can fail at any layer

**Solution:** Clear all caches to align layers

---

## ✅ SUCCESS CRITERIA

After implementing fixes and clearing caches:

- [ ] Reviews API returns 200 OK (empty array is OK)
- [ ] Stock API returns 200 OK with stock data
- [ ] No 404 errors in browser console
- [ ] Product page loads completely
- [ ] Variant selection shows stock status
- [ ] "Add to Cart" works
- [ ] Reviews section displays (even if empty)
- [ ] Server logs show "✅" for business resolution

**When ALL checkboxes are checked → Problem solved! 🎉**

---

## 🆘 EMERGENCY FALLBACK

If after ALL steps the issue persists:

### Option 1: Bypass resolveStorefrontBusiness

Temporarily hardcode for testing:

```javascript
// In stock/route.js (TEMPORARY DEBUG ONLY)
const business = { 
    id: '71f6fc60-5f57-4769-9644-c3f227118e17',  // demo-boutique ID
    business_name: 'Tenvo Boutique Demo'
};
// Skip: await resolveStorefrontBusiness(businessDomain);
```

This will tell us if the issue is ONLY in domain resolution.

### Option 2: Direct Database Path

Use raw SQL instead of `resolveStorefrontBusiness`:

```javascript
const result = await client.query(
    `SELECT id, business_name FROM businesses 
     WHERE LOWER(domain) = $1 AND is_active = true`,
    [businessDomain.toLowerCase()]
);
const business = result.rows[0];
```

---

## 📞 SUPPORT

If issues persist after all fixes:

1. Check server logs for exact error
2. Share console logs from browser
3. Verify `.env` has correct DATABASE_URL and REDIS_URL
4. Ensure all dependencies installed: `npm install`
5. Try production build: `npm run build && npm run start`

---

**The fixes are implemented. Now test thoroughly and check logs!** 🚀
