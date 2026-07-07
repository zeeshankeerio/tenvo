# CRITICAL FIXES - IMPLEMENTATION IN PROGRESS

**Date:** July 6, 2026  
**Status:** 🔧 Implementing All Critical & Quality Fixes

---

## ISSUE #7: 404 on Stock API Endpoint (NEW)

**Error:** `Failed to load resource: the server responded with a status of 404 ()/api/storefront/demo-boutique/products/4afec09e-cc33-4511-a5e7-ca97c8517feb/stock`

**Root Cause Analysis:**

1. ✅ **Correct API Route Exists:** `app/api/storefront/[businessDomain]/products/[productId]/stock/route.js`
2. ✅ **CartContext Uses Correct Path:** `/api/storefront/${domainSegment}/products/${productId}/stock`
3. ❌ **Issue:** Legacy client-side code or SSR component calling old path without domain

**Investigation Needed:**
- Check demo-boutique storefront pages for direct fetch calls
- Verify ProductCard components use proper context
- Check if SSR pages are pre-fetching stock

**Fix Strategy:**
1. Find all stock API calls in storefront components
2. Ensure all use CartContext or proper domain-scoped path
3. Add 404 handler with redirect suggestion

---

## IMPLEMENTING ALL CRITICAL FIXES

### Fix Order:
1. ✅ Issue #7: Stock API 404 (investigate & fix)
2. 🔧 Issue #1: Business creation → storefront init atomicity
3. 🔧 Issue #2: Redis domain cache drift
4. 🔧 Issue #3: Checkout retry strategy
5. 🔧 Issue #5: Order cache invalidation timing
6. 🔧 Issue #6: Hub product update invalidation

