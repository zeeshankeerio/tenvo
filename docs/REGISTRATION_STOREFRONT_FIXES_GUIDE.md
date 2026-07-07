# Business Registration & Storefront Fixes Implementation Guide

**Date:** July 6, 2026  
**Priority:** 🔴 CRITICAL - Production Blockers  
**Estimated Total Effort:** 8 hours development + 4 hours testing

---

## OVERVIEW

This guide provides step-by-step implementation instructions for fixing the 6 identified issues in the business registration → storefront → inventory pipeline.

**Fix Order:**
1. Issue #1: Business creation → storefront init atomicity (2 hours)
2. Issue #2: Redis domain cache drift (3 hours)
3. Issue #3: Checkout retry strategy (1 hour)
4. Issue #5: Order cache invalidation timing (1 hour)
5. Issue #6: Hub product update invalidation (1 hour)

---

## FIX #1: Business Creation → Storefront Init Atomicity

**Priority:** 🔴 P0 Critical  
**File:** `lib/actions/basic/business.js`  
**Time:** 2 hours

### Problem
`StorefrontSyncService.initializeStorefront()` runs **outside** the business creation transaction. If it fails, business exists but storefront returns 404.

### Solution

**Step 1: Modify `createBusiness()` transaction**

File: `lib/actions/basic/business.js` (Lines 239-422)


Add storefront init BEFORE transaction commits:

```javascript
// lib/actions/basic/business.js (inside $transaction block)

const result = await prismaBase.$transaction(async (tx) => {
    // ... existing business creation logic (lines 175-416) ...
    
    // 7. Registration request audit trail
    await tx.registration_requests.create({
        data: {
            business_id: biz.id,
            user_id: userId,
            // ... other fields
        },
    });
    
    // 8. Initialize storefront (INSIDE transaction) ⭐ NEW
    const storefrontInit = await StorefrontSyncService.initializeStorefront(
        biz.id,
        normalizedDomain,
        tx // Pass transaction client
    );
    
    if (!storefrontInit.success) {
        throw new Error('Storefront initialization failed');
    }
    
    return biz; // Transaction commits here (atomic with storefront)
});
```

**Step 2: Update `StorefrontSyncService.initializeStorefront()` to accept transaction**

File: `lib/services/StorefrontSyncService.js` (Lines 211-254)

```javascript
async initializeStorefront(businessId, domain, tx = db) {
    try {
        log.info(`Initializing storefront for business ${businessId}`);
        
        // Use provided transaction or default to db
        const existingDomain = await tx.business_custom_domains.findFirst({
            where: { business_id: businessId, is_active: true }
        });
        
        if (!existingDomain) {
            await tx.business_custom_domains.create({
                data: {
                    business_id: businessId,
                    domain: domain || `store-${businessId}`,
                    is_active: true,
                    is_primary: true
                }
            });
            log.info(`Created default domain for business ${businessId}`);
        }
        
        return {
            success: true,
            domain: existingDomain?.domain || domain
        };
    } catch (error) {
        log.error(`Failed to initialize storefront for ${businessId}:`, error);
        throw error; // Propagate to rollback transaction
    }
}
```

**Step 3: Remove redundant post-transaction storefront init**

File: `lib/actions/basic/business.js` (Lines 510-514)

DELETE these lines:
```javascript
try {
    await StorefrontSyncService.initializeStorefront(result.id, normalizedDomain);
} catch (storefrontErr) {
    console.error('[createBusiness] storefront init failed:', storefrontErr);
}
```


### Verification

```bash
# Run verification script
bun run verify:registration-storefront-flow

# Expected output:
✅ Storefront initialization is inside business transaction
```

**Manual Test:**
1. Register a new business
2. Immediately check storefront URL: `https://tenvo.store/store/{domain}`
3. Verify storefront loads (not 404)
4. If registration fails, verify business was NOT created (atomic rollback)

---

## FIX #2: Redis Domain Cache Drift

**Priority:** 🔴 P0 Critical  
**File:** `lib/storefront/storefrontCache.js`, `lib/tenancy/resolveStorefrontBusiness.js`  
**Time:** 3 hours

### Problem
Redis domain cache has no TTL. After domain reassignment, stale cache can serve old business data (cross-tenant leakage).

### Solution

**Step 1: Add TTL to domain cache writes**

File: `lib/storefront/storefrontCache.js`

Add constant at top of file:
```javascript
const STOREFRONT_DOMAIN_TTL_SEC = 300; // 5 minutes
```

Update `setCachedStorefrontBusiness()`:
```javascript
export async function setCachedStorefrontBusiness(domain, businessData) {
    if (!domain || !businessData?.id) return;
    
    const key = `storefront:domain:${domain}`;
    try {
        // Use SETEX to set with expiration (5 minutes)
        await redis.setex(key, STOREFRONT_DOMAIN_TTL_SEC, JSON.stringify(businessData));
        console.log(`[Redis] Cached storefront business for domain: ${domain} (TTL: ${STOREFRONT_DOMAIN_TTL_SEC}s)`);
    } catch (err) {
        console.warn('[Redis] Failed to cache storefront business:', err?.message);
    }
}
```

**Step 2: Make cache writes blocking (eliminate race window)**

File: `lib/tenancy/resolveStorefrontBusiness.js` (Lines 284-329)

Replace `void setCachedStorefrontBusiness()` with `await`:

```javascript
async function loadResolveStorefrontBusinessUncached(normalizedDomain) {
    const redisCached = await getCachedStorefrontBusiness(normalizedDomain);
    if (redisCached?.id) {
        const client = await pool.connect();
        try {
            const domainRow = await queryBusinessByDomainSegment(normalizedDomain, client);
            if (domainRow?.id === redisCached.id) {
                const resolved = buildCompactStorefrontBusiness(domainRow, normalizedDomain);
                // BLOCKING cache update (not void) ⭐ CHANGED
                await setCachedStorefrontBusiness(normalizedDomain, resolved);
                return resolved;
            }
            // ID mismatch → purge stale cache immediately ⭐ NEW
            await purgeCachedStorefrontDomain(normalizedDomain);
        } finally {
            client.release();
        }
    }

    const client = await pool.connect();
    try {
        const row = await queryBusinessByDomainSegment(normalizedDomain, client);
        if (!row) return null;

        const settings = parseSettingsJson(row.store_settings);
        if (isStorefrontDisabled(row, settings)) return null;

        const resolved = buildCompactStorefrontBusiness(row, normalizedDomain);
        // BLOCKING cache update ⭐ CHANGED
        await setCachedStorefrontBusiness(normalizedDomain, resolved);
        return resolved;
    } finally {
        client.release();
    }
}
```


**Step 3: Add explicit cache purging on domain updates**

File: `lib/actions/basic/business.js` (or create new action)

Add function to update business domain with cache purging:

```javascript
export async function updateBusinessDomainAction(businessId, newDomain) {
    const userId = await resolveSessionUserId();
    
    const result = await prismaBase.$transaction(async (tx) => {
        // Get old domain
        const oldBusiness = await tx.businesses.findUnique({
            where: { id: businessId },
            select: { domain: true }
        });
        
        if (!oldBusiness) {
            throw new Error('Business not found');
        }
        
        // Check new domain is available
        const existingDomain = await tx.businesses.findFirst({
            where: { domain: newDomain }
        });
        
        if (existingDomain && existingDomain.id !== businessId) {
            throw new Error('Domain already taken');
        }
        
        // Update domain
        await tx.businesses.update({
            where: { id: businessId },
            data: { domain: newDomain, updated_at: new Date() }
        });
        
        return { oldDomain: oldBusiness.domain, newDomain };
    });
    
    // Purge old domain cache
    if (result.oldDomain) {
        invalidateStorefrontBusiness(result.oldDomain);
    }
    
    // Purge new domain cache (in case it was cached under different business)
    invalidateStorefrontBusiness(result.newDomain);
    
    return await actionSuccess(result);
}
```

### Verification

```bash
# Run verification script
bun run verify:registration-storefront-flow

# Expected output:
✅ Redis domain cache has TTL configured
✅ Stale domain cache is explicitly purged
```

**Manual Test:**
1. Create business A with domain `test-store-a`
2. Verify storefront resolves to business A
3. Reassign domain to business B
4. Wait 1 second
5. Verify `test-store-a` resolves to business B (not A)
6. Wait 5 minutes
7. Verify cache expired and re-fetches correctly

---

## FIX #3: Checkout Retry Strategy

**Priority:** 🔴 P0 High  
**File:** `app/api/storefront/[businessDomain]/orders/route.js`  
**Time:** 1 hour

### Problem
Only 3 checkout retry attempts with fixed 40ms delays. Under burst traffic, exhausts retries quickly → 409 errors → cart abandonment.

### Solution

File: `app/api/storefront/[businessDomain]/orders/route.js` (Lines 150-161)

Replace retry logic:

```javascript
// BEFORE (Lines 150-161)
const MAX_CHECKOUT_ATTEMPTS = 3;

for (let attempt = 1; attempt <= MAX_CHECKOUT_ATTEMPTS; attempt++) {
    const client = await pool.connect();
    
    try {
        // ... order creation logic ...
    } catch (error) {
        await client.query('ROLLBACK');
        if (attempt === MAX_CHECKOUT_ATTEMPTS) {
            return NextResponse.json(
                { success: false, error: 'Checkout is busy right now. Please try again.' },
                { status: 409 }
            );
        }
        await new Promise(resolve => setTimeout(resolve, 40)); // Fixed delay
    } finally {
        client.release();
    }
}
```

```javascript
// AFTER ⭐ NEW
const MAX_CHECKOUT_ATTEMPTS = 5; // Increased from 3
const BASE_RETRY_DELAY_MS = 30;

for (let attempt = 1; attempt <= MAX_CHECKOUT_ATTEMPTS; attempt++) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // ... existing order creation logic ...
        
        await client.query('COMMIT');
        break; // Success - exit retry loop
    } catch (error) {
        await client.query('ROLLBACK');
        
        if (attempt === MAX_CHECKOUT_ATTEMPTS) {
            return NextResponse.json(
                { success: false, error: 'Checkout is busy right now. Please try again in a moment.' },
                { status: 409 }
            );
        }
        
        // Exponential backoff with jitter ⭐ NEW
        // Delays: ~30ms, ~60ms, ~120ms, ~240ms
        const baseDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
        const delayMs = baseDelay + jitter;
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
    } finally {
        client.release();
    }
}
```

### Verification

```bash
# Run verification script
bun run verify:registration-storefront-flow

# Expected output:
✅ Checkout retry attempts configured (5 attempts)
✅ Exponential backoff implemented
✅ Retry jitter implemented
```

**Load Test:**
```javascript
// Test 100 concurrent checkouts
const results = await Promise.allSettled(
    Array.from({ length: 100 }, () => fetch('/api/storefront/test-store/orders', {
        method: 'POST',
        body: JSON.stringify(checkoutData)
    }))
);

// Target: <1% 409 errors
const errors = results.filter(r => r.value?.status === 409);
console.log(`409 rate: ${(errors.length / 100 * 100).toFixed(1)}%`);
```

---

## FIX #5: Order Cache Invalidation Timing

**Priority:** 🟡 P1 Quality  
**File:** `app/api/storefront/[businessDomain]/orders/route.js`  
**Time:** 1 hour

### Problem
`invalidateStorefrontCatalog()` fires **after** COMMIT in async handler. Small race window where cache can snapshot stale stock.

### Solution

File: `app/api/storefront/[businessDomain]/orders/route.js` (Lines 651-700)

Move cache invalidation BEFORE commit:

```javascript
// Inside order creation transaction (Lines 350-700)

for (let i = 0; i < resolvedLines.length; i++) {
    const line = resolvedLines[i];
    
    // ... create order item ...
    
    // Decrement stock
    await decrementStorefrontOrderLineStock(
        client,
        business.id,
        {
            productId: line.productId,
            quantity: line.quantity,
            isVariant: line.isVariant,
            variantId: line.variantId,
        },
        { orderId, orderNumber }
    );
}

// ⭐ NEW: Invalidate cache BEFORE commit (atomic with stock write)
invalidateStorefrontCatalog(business.id);

// Commit transaction
await client.query('COMMIT');

// Post-commit: emails, analytics (can fail independently)
scheduleStorefrontOrderPostCommit({
    business,
    orderId,
    orderNumber,
    // ... (remove invalidation from here)
});
```

Remove from `lib/storefront/storefrontOrderPostCommit.js` (Line 107):

```javascript
// REMOVE THIS LINE:
invalidateStorefrontCatalog(business.id);
```

### Verification

```bash
bun run verify:registration-storefront-flow

# Expected output:
✅ Order cache invalidation before COMMIT
```

---

## FIX #6: Hub Product Update Invalidation

**Priority:** 🟡 P1 Quality  
**File:** `lib/actions/standard/inventory/product.js`  
**Time:** 1 hour

### Problem
Cache invalidation fires **before** `ProductService.updateProduct()`. Concurrent requests can snapshot stale data.

### Solution

File: `lib/actions/standard/inventory/product.js` (Lines 59-76)

Reorder invalidation to happen AFTER update:

```javascript
// BEFORE
export async function updateProductAction(id, updates) {
    const productData = await getProductById(id);
    
    // Invalidate BEFORE update ❌
    if (updates.is_active === false) {
        result.storefront_published = false;
    }
    invalidateStorefrontCatalog(productData.business_id);
    
    // DB write happens AFTER invalidation ❌
    const product = await ProductService.updateProduct(...);
    
    // Redundant second invalidation ❌
    invalidateStorefrontCatalog(businessId);
    
    return await actionSuccess({ product });
}
```

```javascript
// AFTER ⭐ FIXED
export async function updateProductAction(id, updates) {
    const productData = await getProductById(id);
    
    // DB write FIRST ⭐ CHANGED
    const product = await ProductService.updateProduct(
        id,
        productData.business_id,
        leanProductPayloadForUpdate(updates)
    );
    
    // Invalidate AFTER update (atomic with DB state) ⭐ CHANGED
    invalidateStorefrontCatalog(productData.business_id);
    
    return await actionSuccess({
        product,
        storefront_published: updates.is_active !== false
    });
}
```

### Verification

```bash
bun run verify:registration-storefront-flow

# Expected output:
✅ Product update cache invalidation after DB write
```

---

## DEPLOYMENT PLAN

### Phase 1: Pre-Deployment (Day 1)

1. **Code Review**
   - [ ] Review all 5 fixes with team
   - [ ] Verify no breaking changes
   - [ ] Check backwards compatibility

2. **Testing in Staging**
   ```bash
   # Run all verification scripts
   bun run verify:registration-storefront-flow
   bun run verify:storefront-tenancy
   bun run verify:storefront-checkout-intelligence
   ```

3. **Load Testing**
   - [ ] 100 concurrent registrations
   - [ ] 100 concurrent checkouts
   - [ ] Domain reassignment stress test

### Phase 2: Deployment (Day 2)

**Deploy in order:**

1. **Fix #1** (Business creation atomicity)
   - Deploy `lib/actions/basic/business.js`
   - Deploy `lib/services/StorefrontSyncService.js`
   - Monitor registration success rate

2. **Fix #2** (Domain cache TTL)
   - Deploy `lib/storefront/storefrontCache.js`
   - Deploy `lib/tenancy/resolveStorefrontBusiness.js`
   - Monitor cache hit rates

3. **Fix #3** (Checkout retries)
   - Deploy `app/api/storefront/[businessDomain]/orders/route.js`
   - Monitor 409 error rate

4. **Fix #5 & #6** (Cache timing)
   - Deploy cache invalidation fixes
   - Monitor cache consistency

### Phase 3: Post-Deployment Monitoring

**Metrics to Watch (First 24 Hours):**

```javascript
{
    "registration_success_rate": "> 99.9%",
    "storefront_404_after_registration": "< 0.1%",
    "domain_cache_hit_rate": "> 90%",
    "checkout_409_rate": "< 0.5%",
    "cache_invalidation_lag_p99": "< 10ms"
}
```

**Alert Thresholds:**
- 🔴 Registration success rate < 98%
- 🔴 Storefront 404 rate > 1%
- 🟡 Checkout 409 rate > 2%
- 🟡 Cache hit rate < 80%

---

## ROLLBACK PLAN

If issues are detected post-deployment:

**Fix #1 Rollback:**
```bash
# Revert business.js and StorefrontSyncService.js
git revert <commit-hash>
```

**Fix #2 Rollback:**
```bash
# Revert cache files
git revert <commit-hash>
# Flush Redis cache
redis-cli FLUSHDB
```

**Fix #3 Rollback:**
```bash
# Revert orders route
git revert <commit-hash>
```

**Fixes #5 & #6 Rollback:**
```bash
# Revert invalidation timing changes
git revert <commit-hash>
```

---

## SUCCESS CRITERIA

### ✅ All Fixes Deployed Successfully When:

1. ✅ Registration → storefront flow has 99.9%+ success rate
2. ✅ No storefront 404s after business creation
3. ✅ Domain cache drift events = 0
4. ✅ Checkout 409 rate < 0.5%
5. ✅ Cache invalidation lag < 10ms p99
6. ✅ No cross-tenant data leakage
7. ✅ All verification scripts pass

### 📊 Monitoring Dashboard

Set up dashboard with:
- Registration funnel (start → business created → storefront available)
- Domain resolution latency (cache hit/miss rate)
- Checkout success rate (409 tracking)
- Cache invalidation timing (before/after COMMIT)
- Stock display consistency (hub vs storefront)

---

## CONCLUSION

All fixes are **surgical and low-risk** with clear verification steps. Total implementation time: **8 hours dev + 4 hours testing = 12 hours** to production-ready.

**Next Steps:**
1. Schedule implementation sprint (1-2 days)
2. Set up monitoring dashboards
3. Run verification scripts
4. Deploy to staging
5. Load test
6. Deploy to production
7. Monitor for 24 hours

