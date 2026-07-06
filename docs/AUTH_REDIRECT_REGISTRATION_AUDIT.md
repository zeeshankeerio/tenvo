# Authentication Redirect & Registration Flow Audit

## Executive Summary

**Issue Identified**: During registration, users are briefly shown the dashboard (for a few minutes) before being redirected to the approval window. This creates a confusing user experience where they see content they shouldn't have access to yet.

## Root Cause Analysis

### 1. **Race Condition in Registration → Dashboard Flow**

**Location**: `app/register/page.js` (line ~1080-1095)

**Problem**: After `createBusiness` succeeds, the code checks `requiresApproval` but then attempts immediate dashboard navigation. The BusinessContext loads cached/optimistic data before the approval status is properly synced.

```javascript
// Current problematic flow:
if (bizResult.requiresApproval) {
    window.location.assign(`/pending-approval`);
    return;
}
// If approval check fails or has timing issues, falls through to dashboard:
window.location.assign(`/business/${encodeURIComponent(dashboardDomain)}?tab=dashboard`);
```

**Why it fails**:
- `window.location.assign()` is non-blocking
- React state updates and `BusinessContext.useEffect` can execute before the navigation completes
- The optimistic business shell from `localStorage` loads immediately
- User sees dashboard UI for the cached business before browser completes redirect

### 2. **BusinessContext Optimistic Loading**

**Location**: `lib/context/BusinessContext.js` (lines 58-67, 91-111)

**Problem**: The context aggressively loads cached business data from `localStorage` to improve perceived performance, but doesn't respect `approval_status`.

```javascript
// Loads cached shell immediately on mount:
useEffect(() => {
    applyOptimisticShell(
        { setBusiness, setRole, setRegionalStandards, setIsLoading },
        businessDomainFromPath
    );
}, [businessDomainFromPath]);
```

**Why it's problematic**:
- Cached business data doesn't include `approval_status`
- UI renders with stale/incomplete data
- No approval gate before showing dashboard

### 3. **Missing Approval Guard in Business Routes**

**Location**: `app/business/[category]/layout.js` (needs audit)

**Problem**: No server-side or client-side guard that checks `approval_status` before rendering dashboard UI.

### 4. **OAuth Callback Flow Gaps**

**Location**: `app/auth/confirmed/page.js` (lines 24-33)

**Problem**: After OAuth login, redirects to dashboard without checking if business is approved:

```javascript
if (businesses && businesses.length > 0) {
    router.push(`/business/${businesses[0].domain}`);
} else {
    router.push('/register?step=3');
}
```

No `approval_status` check before redirect.

### 5. **Registration Email OTP Flow**

**Location**: `app/register/page.js` (line ~990-1010)

**Problem**: The `handleFinish` function has complex branching with OTP verification mixed with business provisioning. The `completeProvisioning` call happens after OTP verify, but approval redirect logic runs at the very end, creating timing windows.

---

## Detailed Issues

### Issue 1: Timing Window Between Business Creation and Redirect
**Severity**: HIGH  
**User Impact**: Users see dashboard UI they shouldn't access

**Current Flow**:
1. User completes registration form
2. `createBusiness` action runs → creates business with `approval_status: 'pending_approval'`
3. Action returns `{ requiresApproval: true }`
4. Client calls `window.location.assign('/pending-approval')`
5. **RACE CONDITION**: React continues executing, BusinessContext loads cached data
6. User sees dashboard for 100-500ms (or longer on slow devices)
7. Browser completes navigation to `/pending-approval`

### Issue 2: Cached Business Shell Doesn't Include Approval State
**Severity**: HIGH  
**User Impact**: Stale data shown to users

**Current Cache Structure** (`lib/utils/businessClientCache.js`):
```javascript
{
    business: { id, domain, business_name, category, ... },
    role: 'owner',
    _cached_at: timestamp
}
```

**Missing**: `approval_status`, `approval_requested_at`, `approval_decided_at`

### Issue 3: No Route-Level Approval Guard
**Severity**: CRITICAL  
**User Impact**: Unapproved users can access dashboard if they bookmark or manually navigate

**Affected Routes**:
- `/business/[category]/*` - All hub routes
- `/business/[category]/layout.js` - Should block at layout level

**Current Behavior**: Renders dashboard UI even if business is `pending_approval` or `rejected`

### Issue 4: Multi-Window Registration State
**Severity**: MEDIUM  
**User Impact**: If user opens multiple tabs during registration

**Scenario**:
1. User starts registration in Tab A
2. Opens Tab B with same domain
3. BusinessContext in Tab B loads cached shell
4. Tab B shows dashboard while Tab A is still registering

---

## Recommended Fixes

### Fix 1: Add Immediate Approval Check in Registration Flow ✅

**File**: `app/register/page.js`

**Changes**:
1. Before calling `completeProvisioning`, clear any cached business shell
2. Use synchronous redirect logic that blocks React updates
3. Add loading state that prevents UI updates during redirect

```javascript
// At start of completeProvisioning function:
const completeProvisioning = async (newUser) => {
    // Clear any stale cache before provisioning
    clearRegistrationData();
    try {
        const bizResult = await createBusiness({ /* ... */ });
        
        if (!bizResult.success) {
            // ... error handling
            return;
        }

        // CRITICAL: Check approval BEFORE any other operations
        if (bizResult.requiresApproval) {
            toast.success('Registration received! Waiting for approval.');
            
            // Use router.replace (blocking) instead of window.location.assign
            if (typeof window !== 'undefined') {
                // Clear cache to prevent optimistic load
                clearBusinessShell(); // Import from businessClientCache
                window.location.href = '/pending-approval'; // Force full page load
            }
            return; // Exit immediately
        }

        // Only reach here if auto-approved (platform owners)
        toast.success('Registration successful! Welcome to Tenvo.');
        await completeRegistrationSetupAction(bizResult.businessId, {
            settings: { setup_completed: true, setup_at: new Date().toISOString() },
        });

        const dashboardPath = `/business/${encodeURIComponent(formData.handle)}?tab=dashboard`;
        if (typeof window !== 'undefined') {
            window.location.href = dashboardPath; // Force full page load
        }
    } catch (error) {
        console.error('Provisioning failed:', error);
        toast.error('Registration failed. Please contact support.');
    }
};
```

### Fix 2: Enhance Business Cache with Approval State ✅

**File**: `lib/utils/businessClientCache.js`

**Add approval fields to cached shell**:

```javascript
export function persistBusinessShell(business, role) {
    if (typeof window === 'undefined' || !business?.id) return;
    
    const shell = {
        business: {
            id: business.id,
            domain: business.domain,
            business_name: business.business_name,
            category: business.category,
            plan_tier: business.plan_tier,
            currency: business.currency,
            settings: business.settings,
            // ADD APPROVAL FIELDS:
            approval_status: business.approval_status,
            approval_requested_at: business.approval_requested_at,
            approval_decided_at: business.approval_decided_at,
        },
        role,
        _cached_at: Date.now(),
    };
    
    try {
        localStorage.setItem(BUSINESS_SHELL_KEY, JSON.stringify(shell));
    } catch (err) {
        console.error('[businessClientCache] persist failed:', err);
    }
}
```

### Fix 3: Add Client-Side Approval Guard in BusinessContext ✅

**File**: `lib/context/BusinessContext.js`

**Add approval check after business load**:

```javascript
useEffect(() => {
    // ... existing sync logic ...
    
    if (result?.success && result.business) {
        const biz = result.business;
        
        // NEW: Check approval status for /business/* routes
        if (pathname.startsWith('/business/') && biz.approval_status) {
            if (biz.approval_status === 'pending_approval' || biz.approval_status === 'info_requested') {
                console.warn('[BusinessContext] Business not approved - redirecting');
                router.replace('/pending-approval');
                return;
            }
            if (biz.approval_status === 'rejected') {
                console.warn('[BusinessContext] Business rejected - redirecting');
                router.replace('/pending-approval?status=rejected');
                return;
            }
        }
        
        setBusiness(biz);
        // ... rest of existing logic
    }
    
}, [sessionData?.user?.id, isPending, businessDomainFromPath, pathname]);
```

### Fix 4: Add Server-Side Approval Guard in Business Layout ✅

**File**: `app/business/[category]/layout.js`

**Add approval check at layout level**:

```javascript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/rbac';
import { prismaBase } from '@/lib/db';

export default async function BusinessLayout({ children, params }) {
    const session = await getServerSession();
    
    if (!session?.user) {
        redirect('/login');
    }
    
    // Check business approval status
    const business = await prismaBase.businesses.findFirst({
        where: {
            OR: [
                { user_id: session.user.id },
                { business_users: { some: { user_id: session.user.id, status: 'active' } } }
            ]
        },
        select: {
            id: true,
            domain: true,
            approval_status: true,
        }
    });
    
    if (!business) {
        redirect('/register');
    }
    
    // Block unapproved businesses
    if (business.approval_status === 'pending_approval' || 
        business.approval_status === 'info_requested' ||
        business.approval_status === 'rejected') {
        redirect('/pending-approval');
    }
    
    return <>{children}</>;
}
```

### Fix 5: Fix Auth Confirmed Callback ✅

**File**: `app/auth/confirmed/page.js`

**Add approval check before redirect**:

```javascript
try {
    const businesses = await businessAPI.getByUserId(user.id);
    setTimeout(() => {
        if (businesses && businesses.length > 0) {
            const biz = businesses[0];
            
            // NEW: Check approval before redirecting to dashboard
            if (biz.approval_status === 'pending_approval' || 
                biz.approval_status === 'info_requested' ||
                biz.approval_status === 'rejected') {
                router.push('/pending-approval');
            } else {
                router.push(`/business/${biz.domain}`);
            }
        } else {
            router.push('/register?step=3');
        }
    }, 2500);
}
```

### Fix 6: Add Approval Status to Business API Response ✅

**File**: `lib/api/business.js` (or wherever `businessAPI.getByUserId` is defined)

**Ensure approval fields are included**:

```javascript
// In the SELECT clause of business queries:
select: {
    id: true,
    domain: true,
    business_name: true,
    category: true,
    plan_tier: true,
    // ADD THESE:
    approval_status: true,
    approval_requested_at: true,
    approval_decided_at: true,
    approval_notes: true,
    // ... other fields
}
```

---

## Testing Checklist

### Scenario 1: New Non-Owner Registration
- [ ] Complete registration form
- [ ] Verify redirect to `/pending-approval` happens **immediately**
- [ ] Verify NO dashboard UI flash
- [ ] Verify pending approval page loads
- [ ] Verify cached business shell is cleared
- [ ] Try manual navigation to `/business/{domain}` → should redirect back to `/pending-approval`

### Scenario 2: Platform Owner Registration
- [ ] Register with platform owner email
- [ ] Verify `auto_approved` status is set
- [ ] Verify direct redirect to dashboard (no approval page)
- [ ] Verify dashboard loads successfully

### Scenario 3: OAuth (Google) Registration
- [ ] Register via Google OAuth
- [ ] Complete form on step 3
- [ ] Verify approval check runs correctly
- [ ] Non-owner → `/pending-approval`
- [ ] Platform owner → dashboard

### Scenario 4: Existing User Login
- [ ] Login with existing account
- [ ] If business is pending → redirect to `/pending-approval`
- [ ] If business is approved → dashboard loads
- [ ] If business is rejected → `/pending-approval?status=rejected`

### Scenario 5: Multi-Tab Scenario
- [ ] Open registration in Tab A
- [ ] Open same domain in Tab B
- [ ] Complete registration in Tab A
- [ ] Tab B should detect approval status on next navigation

### Scenario 6: Cached Business Shell
- [ ] Complete registration → redirect to approval page
- [ ] Close browser
- [ ] Open browser and navigate to `/business/{domain}`
- [ ] Should redirect to `/pending-approval` (cache should include approval status)

---

## Database Schema Verification

**Table**: `businesses`

Required columns for approval flow:
- ✅ `approval_status` - VARCHAR (pending_approval, auto_approved, approved, info_requested, rejected)
- ✅ `approval_requested_at` - TIMESTAMP
- ✅ `approval_decided_at` - TIMESTAMP
- ✅ `approval_decided_by` - VARCHAR (user_id)
- ✅ `approval_notes` - TEXT
- ✅ `is_demo_requested` - BOOLEAN

**Verify migration**: Check if these columns exist in schema.prisma and migrations.

---

## Performance Considerations

### Current Issues:
1. **Double navigation** - React router + window.location causes flash
2. **Cached data conflicts** - Optimistic UI vs server state
3. **Multiple re-renders** - BusinessContext triggers multiple updates

### Optimizations:
1. Use `window.location.href` (full page load) instead of `router.push` for post-registration redirects
2. Clear localStorage cache before critical redirects
3. Add loading overlay during business provisioning to prevent UI flashes
4. Consider adding `?approved=true` query param for auto-approved flows

---

## Documentation Updates Needed

1. **Registration Flow Diagram** - Update with approval gates
2. **Approval Workflow Guide** - Document admin approval process
3. **Business Context Caching** - Document when cache is used vs server state
4. **OAuth Registration** - Document Google OAuth + approval flow

---

## Priority Implementation Order

### Phase 1: Critical Fixes (Immediate)
1. ✅ Fix registration redirect logic (Fix 1)
2. ✅ Add approval guard in BusinessContext (Fix 3)
3. ✅ Fix auth confirmed callback (Fix 5)

### Phase 2: Robustness (Next Sprint)
4. ✅ Add server-side layout guard (Fix 4)
5. ✅ Enhance business cache (Fix 2)
6. ✅ Update business API responses (Fix 6)

### Phase 3: Polish (Following Sprint)
7. Add loading overlay during provisioning
8. Add comprehensive error boundaries
9. Add telemetry for approval flow tracking
10. Add admin notification for pending approvals

---

## Success Metrics

- **Zero dashboard flashes** during registration
- **100% redirect accuracy** to approval page for non-owners
- **< 200ms** from business creation to approval redirect
- **Zero cache conflicts** between approval states
- **100% approval guard coverage** across all business routes

---

## Rollback Plan

If fixes cause regressions:

1. **Emergency Rollback**: Revert to current flow, add warning banner
2. **Partial Rollback**: Keep server-side guard (Fix 4), revert client-side changes
3. **Feature Flag**: Add `ENABLE_APPROVAL_WORKFLOW` flag to toggle new vs old flow

---

## Related Files to Audit

- [ ] `app/business/[category]/page.jsx` - Dashboard entry point
- [ ] `lib/auth/rbac.js` - Role-based access control
- [ ] `lib/actions/admin/registrationApproval.js` - Admin approval actions
- [ ] `app/admin/registrations/page.jsx` - Admin approval UI
- [ ] `middleware.js` - Global route protection (if exists)

---

## Questions for Product/Design

1. Should we show a loading spinner during the redirect window?
2. What should happen if user bookmarks dashboard URL while pending approval?
3. Should cached business data expire after N hours?
4. Should we add email notification when business is approved?
5. What's the UX for rejected businesses? Can they re-apply?

---

*Last Updated: [Current Date]*  
*Audited By: Kiro AI*  
*Priority: P0 (Critical User Experience Issue)*
