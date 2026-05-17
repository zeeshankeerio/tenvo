# Business Registration Quick Reference Guide

**For**: Developers working on registration, onboarding, or multi-tenancy  
**Generated**: May 14, 2026

---

## 🎯 Quick Answers

### Q: How do I register a new business?
**A**: User goes through 3-step wizard:
1. `app/register/page.js` → Collect identity (name, email, domain)
2. User selects domain category from 55+ options
3. System calls `createBusiness()` server action
4. Business seeded with products + COA
5. User redirected to `/business/{domain}`

### Q: How do I get business context in a component?
**A**: Use the hook:
```js
import { useBusiness } from '@/lib/context/BusinessContext';

export function MyComponent() {
    const { business, role } = useBusiness();
    console.log(business.id, business.domain, business.category);
}
```

### Q: How do I protect a server action with auth?
**A**: Wrap with `withGuard()`:
```js
'use server';
import { withGuard } from '@/lib/rbac/serverGuard';

export async function deleteProduct(businessId, productId) {
    const { session, role, planTier } = await withGuard(businessId, {
        permission: 'inventory.delete',
        feature: 'inventory',
    });
    
    // Now safe to proceed
    await db.query('DELETE FROM products WHERE id = $1 AND business_id = $2', 
        [productId, businessId]);
}
```

### Q: How do I check if a domain is available?
**A**: Use server action:
```js
import { checkDomainAvailabilityAction } from '@/lib/actions/basic/business';

const result = await checkDomainAvailabilityAction('my-retail-store');
console.log(result.success); // true/false
```

### Q: How do I get domain-specific configuration?
**A**: Use helpers:
```js
import { getDomainKnowledge, getDomainProductFields } from '@/lib/domainKnowledge';

const config = getDomainKnowledge('retail-shop');
console.log(config.tax_config, config.default_units, config.setupTemplate);

const fields = getDomainProductFields('pharmacy');
// ['Batch Number', 'Expiry Date', 'Manufacturer']
```

### Q: How do I query tenant-isolated data?
**A**: Always include `business_id`:
```js
// ✅ CORRECT
const products = await client.query(
    'SELECT * FROM products WHERE business_id = $1 AND status = $2',
    [businessId, 'active']
);

// ❌ WRONG - can leak data from other businesses!
const products = await client.query(
    'SELECT * FROM products WHERE status = $1',
    ['active']  // Missing business_id filter
);
```

### Q: What are the 10 roles in the system?
**A**: In order of privilege:
1. **viewer** — Read-only access
2. **waiter** — POS/service operations
3. **chef** — Kitchen operations
4. **salesperson** — Sales & customer management
5. **cashier** — Payments & receipts
6. **accountant** — Accounting & financial
7. **warehouse_manager** — Inventory & warehousing
8. **manager** — Department lead
9. **admin** — Business administrator
10. **owner** — Business owner (full access)

### Q: How do I check a user's role?
**A**: 
```js
const { role } = useBusiness();  // In components

// In server actions, use withGuard()
const { role } = await withGuard(businessId);
```

### Q: What happens when a user logs in?
**A**: 
1. `app/login/actions.js` authenticates with Better Auth
2. Queries for user's latest active business_users row
3. Fetches business `domain` from businesses table
4. Redirects to `/business/{domain}`
5. If no business found → redirects to `/register`

### Q: How do I add a new business domain?
**A**: 
1. Create domain config in `lib/domainData/*.js`
2. Import in `lib/domainKnowledge.js`
3. Add to `domainKnowledge` export
4. Optional: Add to classification sets in `lib/config/domains.js` if POS/manufacturing/etc

### Q: How do trial periods work?
**A**:
- Free tier signups → Automatically get 7-day "starter" trial
- Trial expiry date stored in `businesses.plan_expires_at`
- Platform owner email → Gets "enterprise" plan with no expiry
- Check via: `isTrialActive(business.plan_expires_at)`

### Q: What's the domain uniqueness story?
**A**: `domain` is unique in `businesses` table:
```prisma
domain String @unique(map: "unique_business_domain")
```

- Domain is used in URLs: `/business/my-retail-store`
- Domain is checked before business creation
- Domain slug-ified (lowercase, no spaces)
- Different businesses can have same name but MUST have different domains

### Q: How do I check if a feature is available in a plan?
**A**:
```js
import { planHasFeature } from '@/lib/config/plans';

if (planHasFeature(planTier, 'manufacturing')) {
    // Show manufacturing features
}

// Available features: 'pos', 'manufacturing', 'accounting', 'batch_tracking', ...
```

### Q: How are Chart of Accounts seeded?
**A**: 
- `lib/config/accounting.js` contains `DEFAULT_COA`
- When business is created, all COA entries inserted with `is_system = true`
- Users can add custom accounts later but can't delete system accounts

### Q: What's the self-healing mechanism?
**A**:
- If `business_users` row is missing but user owns the business (in `businesses.user_id`)
- System automatically creates the link with role='owner'
- Prevents accidental access loss
- Logs the restoration for audit

### Q: How do multi-business users work?
**A**:
- User can create multiple businesses
- Each business has separate `business_users` rows
- User's role per business can differ (owner in one, salesperson in another)
- Login goes to "latest" business (by `created_at`)
- Can switch via business switcher in sidebar

### Q: What's the domain classification system?
**A**: Sets for feature enablement:
```js
POS_RELEVANT_DOMAINS        // 20+ domains (retail, restaurant, etc.)
MANUFACTURING_DOMAINS      // 15+ domains (textile, chemical, etc.)
HOSPITALITY_DOMAINS        // 3 domains
CAMPAIGN_RELEVANT_DOMAINS  // 15+ domains
```

Used to show/hide features:
```js
if (POS_RELEVANT_DOMAINS.has(category)) {
    // Show POS module
}
```

---

## 📁 File Map

| File | Purpose |
|------|---------|
| `app/register/page.js` | 3-step registration UI + orchestration |
| `lib/actions/basic/business.js` | Server actions (create, read, update business) |
| `lib/auth.js` | Better Auth configuration |
| `app/login/actions.js` | Login + business routing |
| `lib/context/BusinessContext.js` | Business state sync for UI |
| `lib/domainKnowledge.js` | Master domain registry |
| `lib/domainData/` | 6 files with 55+ domain configs |
| `lib/config/domains.js` | Domain classifications + helpers |
| `lib/utils/domainHelpers.ts` | Domain utility functions |
| `lib/rbac/serverGuard.js` | Auth/role/feature/limit guard |
| `lib/auth/rbac.js` | Role hierarchy & permissions |
| `lib/auth/access.js` | Business access verification |
| `prisma/schema.prisma` | Data model with tenancy constraints |
| `proxy.ts` | Rate limiting + security headers |

---

## ⚠️ Common Mistakes

### 1. Forgetting business_id in queries
```js
// ❌ WRONG - Data leak risk!
SELECT * FROM products WHERE name = 'Widget'

// ✅ CORRECT
SELECT * FROM products WHERE business_id = $1 AND name = 'Widget'
```

### 2. Not using withGuard() in server actions
```js
// ❌ WRONG - No auth check!
export async function deleteProduct(businessId, productId) {
    await db.query('DELETE FROM products WHERE id = $1', [productId]);
}

// ✅ CORRECT
export async function deleteProduct(businessId, productId) {
    const { role } = await withGuard(businessId, {
        permission: 'inventory.delete'
    });
    await db.query('DELETE FROM products WHERE id = $1 AND business_id = $2', 
        [productId, businessId]);
}
```

### 3. Using business.id when you need business.domain for routing
```js
// ❌ WRONG - Leaks database IDs in URL
router.push(`/business/${business.id}`)  // /business/550e8400-...

// ✅ CORRECT - Use domain
router.push(`/business/${business.domain}`)  // /business/my-retail-store
```

### 4. Not checking domain classification before enabling features
```js
// ❌ WRONG - Shows POS to non-retail
<PosModule />

// ✅ CORRECT
{POS_RELEVANT_DOMAINS.has(category) && <PosModule />}
```

### 5. Assuming user role is the same across businesses
```js
// ❌ WRONG - Role is per-business!
const { role } = useBusiness();  // This is current business's role only

// ✅ CORRECT
const { business, role } = useBusiness();  // role is for this business only
// User might be 'owner' here, 'salesperson' in another business
```

---

## 🚦 Status by Feature

| Feature | Status | Files |
|---------|--------|-------|
| User Registration | ✅ Complete | `app/register/page.js` |
| Email Auth | ✅ Complete | `lib/auth.js` |
| Business Creation | ✅ Complete | `lib/actions/basic/business.js` |
| Domain Selection | ✅ Complete | `lib/domainKnowledge.js` + `lib/config/domains.js` |
| Multi-Tenancy Isolation | ✅ Complete | `prisma/schema.prisma` + `lib/rbac/` |
| Trial System | ✅ Complete | `lib/config/plans.js` |
| Role-Based Access | ✅ Complete | `lib/auth/rbac.js` |
| Business Switching | ⚠️ Partial | `components/layout/BusinessSwitcher.jsx` |
| Email Verification | ❌ Missing | — |
| Business Logo Upload | ❌ Missing | — |
| Audit Logging | ⚠️ Partial | No registration audit |
| Tax Config Seeding | ❌ Missing | — |

---

## 🔗 Common Workflows

### Adding a New User to an Existing Business
```js
// 1. In owner dashboard, invite user by email
// 2. Create business_users record
const result = await client.query(`
    INSERT INTO business_users (business_id, user_id, role, status)
    VALUES ($1, $2, $3, 'active')
`, [businessId, userId, 'salesperson']);

// 3. User can now access via /business/{domain}
```

### Switching Current Business
```js
// In BusinessContext or component
const domain = otherBusiness.domain;
window.location.href = `/business/${domain}`;

// Or use router
router.push(`/business/${domain}`);
```

### Querying Domain-Specific Config
```js
const category = business.category;  // 'retail-shop'
const config = getDomainKnowledge(category);

console.log(config.tax_config.default_tax_rate);     // 17
console.log(config.default_units);                   // ['pcs', 'pack', ...]
console.log(config.setupTemplate.suggestedProducts); // [...]
```

### Enforcing Permission in Component
```js
import { useBusiness } from '@/lib/context/BusinessContext';
import { hasPermission } from '@/lib/auth/rbac';

export function DeleteButton() {
    const { role } = useBusiness();
    
    if (!hasPermission(role, 'inventory.delete')) {
        return <span className="text-gray-400">No delete permission</span>;
    }
    
    return <button onClick={() => deleteProduct()}>Delete</button>;
}
```

---

## 📚 Key Concepts

### Business ID vs Domain
- **Business ID**: UUID stored in database (550e8400-e29b-41d4-a716-446655440000)
- **Domain**: Slug used in URLs (my-retail-store)
- Always query by ID, route by domain

### Tenant Isolation
- Every table has `business_id` foreign key
- All queries MUST filter by `business_id`
- Constraints prevent data leaking between businesses
- Example: Two businesses can both have product "Widget" with same SKU

### Trial Period
- Free tier users get 7-day trial as "starter" plan
- Trial expiry in `businesses.plan_expires_at`
- Platform owner email never expires
- After expiry, features restricted to "free" tier limits

### Role Hierarchy
- 10 roles from viewer (0) to owner (9)
- Higher role ⊃ lower role permissions
- Owner can do everything
- Viewer can only read

---

## 🎓 Next Steps

1. **If adding new domain**: Create file in `lib/domainData/` + update `lib/domainKnowledge.js`
2. **If adding new permission**: Add to matrix in `lib/auth/rbac.js`
3. **If protecting action**: Wrap with `withGuard()` from `lib/rbac/serverGuard.js`
4. **If adding feature flag**: Add to `lib/config/domains.js` sets
5. **If querying data**: Always include `business_id` filter

---

**See Also**: [BUSINESS_REGISTRATION_ARCHITECTURE_ANALYSIS.md](BUSINESS_REGISTRATION_ARCHITECTURE_ANALYSIS.md) for deep dive
