# CRITICAL FIXES - IMPLEMENTATION STATUS

**Date:** July 6, 2026  
**Status:** 🔧 IN PROGRESS

---

## FIXES IMPLEMENTED

### ✅ Fix #1: Business Creation → Storefront Init Atomicity (DONE)

**Files Modified:**
- `lib/actions/basic/business.js` (Lines 403-430)
- `lib/services/StorefrontSyncService.js` (Lines 211-240)

**Changes:**
1. ✅ Moved `initializeStorefront()` inside business transaction
2. ✅ Pass transaction client to StorefrontSyncService
3. ✅ Throw error on storefront init failure (triggers rollback)
4. ✅ Removed redundant post-transaction storefront init

**Impact:** Business + storefront creation is now atomic. If storefront init fails, entire registration rolls back.

---

### ✅ Fix #2: Redis Domain Cache Drift (DONE)

**Files Modified:**
- `lib/tenancy/resolveStorefrontBusiness.js` (Lines 284-315)

**Changes:**
1. ✅ Made cache writes BLOCKING (`await` instead of `void`)
2. ✅ Added explicit cache purge on ID mismatch
3. ✅ TTL already exists via `REDIS_TTL.domainIndex` (300s)

**Impact:** Eliminates race window for stale cache. Cache purged immediately on domain reassignment.

---

### ⏭️ Fix #3: Checkout Retry Strategy (SKIPPED - Not Found)

**Status:** Could not locate retry logic in orders route

**Notes:**
- `MAX_CHECKOUT_ATTEMPTS` constant not found
- No retry loop detected
- May not be implemented yet or in different file

**Action:** Document as potential enhancement, not critical bug

---

### ⏭️ Fix #5: Order Cache Invalidation Timing (PENDING)

**Target File:** `app/api/storefront/[businessDomain]/orders/route.js`

**Action Needed:**
1. Find stock decrement location
2. Add `invalidateStorefrontCatalog(business.id)` BEFORE commit
3. Remove from post-commit handler

---

### ⏭️ Fix #6: Hub Product Update Invalidation (PENDING)

**Target File:** `lib/actions/standard/inventory/product.js`

**Action Needed:**
1. Move `invalidateStorefrontCatalog()` AFTER `ProductService.updateProduct()`
2. Remove duplicate invalidation calls

---

## NEW ISSUE DISCOVERED

### 🔍 Issue #7: Stock API 404 Error

**Error:** `Failed to load resource: 404 /api/storefront/demo-boutique/products/{id}/stock`

**Root Cause:** Client calling correct API, but route may have issue

**Status:** INVESTIGATING

**Correct Route Exists:**
- ✅ `app/api/storefront/[businessDomain]/products/[productId]/stock/route.js`

**Possible Causes:**
1. SSR component making direct fetch without await
2. Client-side hydration mismatch
3. Product ID not resolving correctly
4. Demo business not configured properly

**Next Steps:**
1. Check demo-boutique storefront pages
2. Verify product resolution logic
3. Add better error logging

---

## SUMMARY

**Completed:** 2/6 fixes  
**Pending:** 2/6 fixes  
**Skipped:** 1/6 (not found)  
**New Issues:** 1

**Next Actions:**
1. Investigate Fix #3 location (checkout retries)
2. Implement Fix #5 (cache invalidation timing)
3. Implement Fix #6 (product update invalidation)
4. Debug Issue #7 (stock API 404)

