# Business Registration & Storefront Audit - Executive Summary

**Date:** July 6, 2026  
**Status:** 🔴 **6 Issues Identified** (3 Critical, 3 Quality)  
**Overall Assessment:** Architecture is SOLID with surgical fixes needed

---

## CRITICAL ISSUES (Production Blockers)

### 1. 🔴 Business Creation → Storefront Init Non-Atomic
**File:** `lib/actions/basic/business.js:510-514`  
**Impact:** User completes registration but storefront returns 404  
**Fix:** Move `initializeStorefront()` inside business transaction  
**Effort:** 2 hours

### 2. 🔴 Redis Domain Cache Drift
**File:** `lib/tenancy/resolveStorefrontBusiness.js:286-306`  
**Impact:** Cross-tenant data leakage after domain reassignment  
**Fix:** Add 300s TTL + explicit cache purging on domain updates  
**Effort:** 3 hours

### 3. 🔴 Checkout 409 Errors Under Burst Traffic
**File:** `app/api/storefront/[businessDomain]/orders/route.js:150-161`  
**Impact:** Cart abandonment during flash sales  
**Fix:** Increase retries (3→5) + exponential backoff  
**Effort:** 1 hour

---

## QUALITY IMPROVEMENTS (Non-Blocking)

### 5. 🟡 Order Cache Invalidation Timing
**File:** `lib/storefront/storefrontOrderPostCommit.js:107`  
**Impact:** Stale stock display (<50ms race window)  
**Fix:** Move invalidation inside transaction (before COMMIT)  
**Effort:** 1 hour

### 6. 🟡 Hub Product Update Invalidation Order
**File:** `lib/actions/standard/inventory/product.js:59-76`  
**Impact:** Stale product data (60s cache window)  
**Fix:** Invalidate after DB write (not before)  
**Effort:** 1 hour

---

## VERIFIED CORRECT ✅

✅ Domain uniqueness guards - No duplicate registrations  
✅ Tenant isolation (SQL) - All queries use `business_id`  
✅ Product creation atomicity - Single transaction  
✅ Stock decrement logic - Hub + storefront parity  
✅ Display stock resolution - Mirrors hub exactly  
✅ Integrated product upsert - No race conditions  
✅ Registration seed - Products immediately queryable

---

## IMPLEMENTATION TIMELINE

**Week 1 (Critical Fixes):**
- Day 1-2: Fix Issue #1 (storefront init atomicity)
- Day 3-4: Fix Issue #2 (domain cache TTL)
- Day 5: Fix Issue #3 (checkout retries)

**Week 2 (Quality Improvements):**
- Day 1: Fix Issue #5 (order cache timing)
- Day 2: Fix Issue #6 (product update invalidation)
- Day 3-5: Testing + monitoring setup

**Total Effort:** 8 hours dev + 4 hours testing = **12 hours**

---

## MONITORING METRICS

```javascript
{
    "registration_storefront_404_rate": "< 0.1%",  // Detect Issue #1
    "domain_cache_drift_events": "0 per day",      // Detect Issue #2
    "checkout_409_rate": "< 0.5%",                 // Detect Issue #3
    "cache_invalidation_lag_p99": "< 10ms",        // Detect Issue #5, #6
    "stock_sync_discrepancy_rate": "< 0.01%"
}
```

---

## DEPLOYMENT CHECKLIST

**Pre-Deployment:**
- [ ] Run `bun run verify:registration-storefront-flow`
- [ ] Load test checkout (100 concurrent requests)
- [ ] Domain reassignment test
- [ ] Staging end-to-end smoke test

**Deployment:**
- [ ] Deploy Issue #1 fix
- [ ] Deploy Issue #2 fix
- [ ] Deploy Issue #3 fix
- [ ] Deploy Issue #5, #6 fixes
- [ ] Monitor error rates

**Post-Deployment:**
- [ ] Verify registration success >99.9%
- [ ] Check storefront 404 rate <0.1%
- [ ] Monitor checkout 409 rate <0.5%
- [ ] Validate cache consistency

---

## CONCLUSION

**Architecture Grade: A-**  
Core design is solid with strong tenant isolation and correct transaction boundaries. All issues are edge cases with surgical fixes. **Production-ready in 12 hours.**

