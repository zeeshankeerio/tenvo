# Business Registration & Multi-Tenancy Architecture Analysis

**Generated**: May 14, 2026  
**Status**: Comprehensive Audit Complete

---

## 📊 Executive Summary

The system uses a **modular, domain-aware registration flow** that integrates Better Auth with multi-tenant business initialization. Key patterns:
- **3-step wizard** for business registration (Identity → Vertical → Configuration)
- **Domain-first architecture** with 55+ supported business categories
- **Automatic tenant initialization** with Chart of Accounts seeding
- **Role-based multi-tenancy** with `business_users` membership model
- **Better Auth integration** for unified authentication

---

## 🗂️ FILE STRUCTURE & PURPOSE

### Registration Entry Points

#### 1. **[app/register/page.js](app/register/page.js)** — Main Registration Wizard
**Purpose**: 3-step business registration UI and flow orchestration

**Features**:
- Step 1: Business Identity (name, handle, email/password)
- Step 2: Market Vertical Selection (55+ domains with search)
- Step 3: Final Configuration (country, plan tier, region)
- Real-time domain handle availability checking
- Plan tier auto-suggestion based on domain
- Integrated authentication (create account OR add business to existing account)

**Key Code Patterns**:
```js
// Step 1: Create/authenticate user
const { data: authData, error: authError } = await authClient.signUp.email({
    email: formData.email,
    password: formData.password,
    name: formData.businessName,
    username: formData.handle,
});

// Step 2: Create business record
const bizResult = await createBusiness({
    businessName: formData.businessName,
    userId: newUser.id,
    email: newUser.email || formData.email,
    domain: formData.handle,
    category: formData.category,
    country: formData.country,
    planTier: formData.planTier || 'free',
});

// Step 3: Seed domain-specific products
await seedBusinessData(bizResult.businessId, formData.category, formData.country);
```

**What's Working Well**:
✅ Smooth step transitions with progress indicator  
✅ Real-time domain availability validation  
✅ Supports both new user signup and adding business to existing account  
✅ Domain-aware plan suggestions  
✅ Regional tax/compliance defaults  

**What's Missing/Incomplete**:
⚠️ No multi-step form state persistence (if user closes tab, data is lost)  
⚠️ No validation error rollback in database (if step 2 fails, step 1 partial data remains)  
⚠️ Mobile UI could be more compact (currently 48px fields, could be 40px)  
⚠️ No email verification step before creating business  
⚠️ No business logo upload in wizard (only field, not functional)  

---

### Authentication Integration Points

#### 2. **[lib/auth.js](lib/auth.js)** — Better Auth Configuration
**Purpose**: Core authentication engine initialization

**Features**:
- BetterAuth singleton with Prisma adapter
- Email/password provider enabled
- Plugins: admin, username, twoFactor, lastLoginMethod
- PostgreSQL backend

**Key Pattern**:
```js
const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    plugins: [admin(), username(), twoFactor(), lastLoginMethod()]
});
```

**Current State**:
✅ Production-ready configuration  
✅ All needed plugins enabled  
✅ Singleton pattern prevents redundant initialization  

---

#### 3. **[lib/auth-client.js](lib/auth-client.js)** — Client-Side Auth Hook
**Purpose**: Browser-side authentication client for sign up/sign in

**Usage in Registration**:
```js
const { data: authData, error: authError } = await authClient.signUp.email({
    email, password, name, username
});
```

---

#### 4. **[app/login/actions.js](app/login/actions.js)** — Login & Business Routing
**Purpose**: Server action that logs user in and redirects to their business

**Flow**:
1. Better Auth signs user in
2. Query `business_users` to find user's latest active business
3. Fetch business `domain` from `businesses` table
4. Redirect to `/business/{domain}` OR `/register` if no business found

**Key Code**:
```js
// Get user's latest active business
const membershipResult = await client.query(`
    SELECT business_id FROM business_users 
    WHERE user_id = $1 AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
`, [userId]);

// Get business domain
const businessResult = await client.query(`
    SELECT domain FROM businesses WHERE id = $1
`, [business_id]);

// Redirect to business or registration
redirect(`/business/${domain}` || '/register');
```

**What's Working Well**:
✅ Correctly prioritizes latest business  
✅ Handles case where user has no business (redirects to registration)  
✅ Uses domain-based routing for clean multi-tenant URLs  

**What's Missing**:
⚠️ No business switcher after login — always goes to latest  
⚠️ No UX for "Which business do you want?" if user has multiple  
⚠️ No fallback if business_users row is missing (though there's a self-healing mechanism in BusinessContext)  

---

## 🎯 Domain/Category Selection System

### Domain Knowledge Architecture

#### 5. **[lib/domainKnowledge.js](lib/domainKnowledge.js)** — Central Registry
**Purpose**: Master domain configuration consolidated from modular files

**Structure**:
```js
export const domainKnowledge = {
    ...retailDomains,        // 6+ retail variants
    ...industrialDomains,    // 8+ manufacturing/industrial
    ...serviceDomains,       // 12+ hospitality/services
    ...specializedDomains,   // 15+ healthcare/agriculture
    ...textileDomains,       // 8+ fashion/textiles
    ...expansionDomains,     // +5 expansion domains
    ...eduLivestockDomains   // Education & farming
};
```

**Domains with Full Support** (55+):
- Retail Shop, Supermarket, Grocery
- Pharmacy, Hospital, Diagnostic Lab
- Restaurant, Bakery, Hotel
- Textile Mill, Garments, Boutique
- Auto Parts, Electronics, Mobile
- Manufacturing (Chemical, Plastic, Furniture)
- Services (Travel, Gym, Real Estate)
- Agriculture, Poultry, Dairy
- And many more...

#### 6. **[lib/domainData/](lib/domainData/)** — Modular Domain Definitions
**Files**:
- `retail.js` — Retail & grocery domains
- `industrial.js` — Manufacturing & chemicals
- `services.js` — Hospitality & services
- `specialized.js` — Healthcare & pharma
- `textile.js` — Fashion & textiles
- `expansion.js` — New domains
- `edu_livestock.js` — Education & farming

**Each Domain Defines**:
```js
{
    'retail-shop': {
        key: 'retail-shop',
        name: 'Retail / General Store',
        name_ur: 'ریٹیل / جنرل اسٹور',
        icon: 'Store',
        description: 'General retail, supermarkets',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'pack', 'dozen', 'carton'],
        default_categories: ['FMCG', 'Beverages', 'Snacks'],
        required_modules: ['invoicing', 'purchases', 'customers'],
        recommended_modules: ['batch_tracking', 'pos'],
        label_overrides: { product: 'Item', invoice: 'Receipt' },
        fieldConfig: { ... },  // Domain-specific fields
        setupTemplate: { ... }  // Initial product categories
    }
}
```

#### 7. **[lib/config/domains.js](lib/config/domains.js)** — Domain Metadata & Classification
**Purpose**: Domain classification sets for feature enablement

**Key Classifications**:
```js
export const POS_RELEVANT_DOMAINS = new Set([
    'retail-shop', 'supermarket', 'grocery', 'pharmacy', 'restaurant-cafe', ...
]);

export const MANUFACTURING_DOMAINS = new Set([
    'garments', 'textile-mill', 'steel-iron', 'plastic-manufacturing', ...
]);

export const HOSPITALITY_DOMAINS = new Set([
    'restaurant-cafe', 'bakery-confectionery', 'hotel-guesthouse'
]);

export const CAMPAIGN_RELEVANT_DOMAINS = new Set([
    'retail-shop', 'supermarket', 'grocery', 'pharmacy', ...
]);
```

**Helper Functions**:
```js
isPosRelevant(category)          // → Boolean
isManufacturingRelevant(category) // → Boolean
isHospitality(category)           // → Boolean
suggestPlanTier(category)         // → 'free' | 'starter' | 'business' | 'enterprise'
```

#### 8. **[lib/utils/domainHelpers.ts](lib/utils/domainHelpers.ts)** — Domain Utilities
**Key Functions**:
```js
getDomainKnowledge(category)       // Get full config
getDomainProductFields(category)   // Required/suggested fields
getDomainCustomerFields(category)  // Customer-specific fields
getDomainVendorFields(category)    // Vendor-specific fields
getDomainTaxCategories(category)   // Domain tax options
getDomainDisplayName(category)     // UI display name
validateDomainProduct(product, category) // Validate against schema
```

#### 9. **[lib/domainColors.js](lib/domainColors.js)** — Visual Theming
**Purpose**: Domain-specific color schemes for UI

**Example**:
```js
// Returns { primary, secondary, accent, ... }
getDomainColors('retail-shop')    // Wine/retail colors
getDomainColors('pharmacy')       // Green/health colors
getDomainColors('textile-mill')   // Navy/textile colors
```

---

## 🏗️ Tenant Initialization

### Business Creation & Seeding

#### 10. **[lib/actions/basic/business.js](lib/actions/basic/business.js)** — Server Actions for Business Setup
**File Purpose**: All business-related server actions (create, read, update)

**Main Function: `createBusiness(data)`**

**Process**:
```
1. Validate user authentication + extract session user_id
2. Normalize domain handle (lowercase, 3+ chars)
3. Validate domain category against domainKnowledge
4. Check plan tier eligibility (detect trial vs enterprise)
5. Database transaction:
   a) Check domain uniqueness
   b) Check duplicate business name prevention
   c) INSERT into businesses table
   d) INSERT owner into business_users table
   e) Seed Chart of Accounts (COA) into gl_accounts
   f) COMMIT transaction
6. Return businessId, domain, plan tier
```

**Key Code**:
```js
export async function createBusiness(data) {
    const { businessName, email, phone, country, domain, category, planTier } = data;
    
    // Resolve trial vs platform owner
    const ownerIsplatform = isPlatformOwner(email);
    let effectivePlanTier = normalizedPlanTier;
    let planExpiresAt = null;
    
    if (ownerIsplatform) {
        effectivePlanTier = 'enterprise';
        planExpiresAt = null;  // Never expires
    } else if (normalizedPlanTier === 'free') {
        effectivePlanTier = TRIAL_CONFIG.trialPlanTier;  // 'starter'
        planExpiresAt = getTrialExpiryDate();  // 7 days
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Domain uniqueness guard (critical for multi-tenant)
        const domainCheck = await client.query(
            'SELECT id FROM businesses WHERE domain = $1',
            [normalizedDomain]
        );
        if (domainCheck.rows.length > 0) {
            throw new Error(`Domain "${normalizedDomain}" already taken`);
        }
        
        // 1. Insert business
        const bizRes = await client.query(`
            INSERT INTO businesses (
                user_id, business_name, email, phone, country, domain, category,
                plan_tier, plan_seats, max_products, max_warehouses, plan_expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        `, [userId, businessName, email, phone, country, normalizedDomain, ...]);
        
        const businessId = bizRes.rows[0].id;
        
        // 2. Insert business owner
        await client.query(`
            INSERT INTO business_users (business_id, user_id, role, status)
            VALUES ($1, $2, 'owner', 'active')
        `, [businessId, userId]);
        
        // 3. Seed Chart of Accounts
        for (const acc of DEFAULT_COA) {
            await client.query(`
                INSERT INTO gl_accounts (business_id, code, name, type, is_system)
                VALUES ($1, $2, $3, $4, true)
            `, [businessId, acc.code, acc.name, acc.type]);
        }
        
        await client.query('COMMIT');
        return await actionSuccess({ businessId, domain: normalizedDomain, ... });
    } catch (error) {
        await client.query('ROLLBACK');
        return await actionFailure('CREATE_BUSINESS_FAILED', error.message);
    }
}
```

**What's Working Well**:
✅ Atomic transaction with rollback  
✅ Domain uniqueness enforced at database level  
✅ Automatic Chart of Accounts seeding  
✅ Trial vs enterprise distinction  
✅ Duplicate business name prevention  
✅ Failsafe self-healing for missing `business_users` row  

**What's Missing**:
⚠️ No validation of business fields (length, format)  
⚠️ No audit log of business creation  
⚠️ Tax configuration not initialized (only COA)  
⚠️ No webhook/notification on business creation  

---

#### 11. **[app/register/page.js — seedBusinessData()](app/register/page.js#L245)** — Domain Template Seeding
**Purpose**: Populate initial products/inventory based on domain

**Flow**:
```js
const seedBusinessData = async (businessId, domainKey, country) => {
    // 1. Get domain knowledge + regional standards
    const standards = getRegionalStandards(country);
    const regionalTaxRate = standards.defaultTaxRate;
    
    // 2. Get domain-specific products from setupTemplate
    const knowledge = domainKnowledge[domainKey];
    const suggestedProducts = knowledge?.setupTemplate?.suggestedProducts || [];
    
    // 3. Transform to product records
    const itemsToInsert = suggestedProducts.map(p => ({
        business_id: businessId,
        name: p.name,
        unit: p.unit,
        category: p.category,
        stock: p.startingStock,
        price: p.defaultPrice,
        cost_price: p.defaultPrice * 0.6,
        tax_rate: regionalTaxRate,
        ...
    }));
    
    // 4. Call seedBusinessProductsAction
    const seedResult = await seedBusinessProductsAction({
        businessId,
        items: itemsToInsert
    });
};
```

**Triggered**: After successful business creation (registration step 3)

**What Gets Seeded**:
- Domain-specific product templates
- Default categories
- Regional tax rates
- Initial inventory levels

---

### Business Context Initialization

#### 12. **[lib/context/BusinessContext.js](lib/context/BusinessContext.js)** — Business State Sync
**Purpose**: Keeps React component tree in sync with user's current business

**Key Mechanism**:
```js
export function BusinessProvider({ children }) {
    const { data: sessionData } = authClient.useSession();
    
    // 1. Check URL for business domain: /business/[domain]
    const domainFromUrl = pathParts[2];  // From pathname
    
    // 2. Try to load business by domain (with auth check)
    if (domainFromUrl) {
        result = await getBusinessByDomainAndUser(domainFromUrl);
    }
    
    // 3. Fallback to latest business if no domain or auth failed
    if (!result?.success) {
        result = await getBusinessByUserId();
    }
    
    // 4. Set context state + localStorage
    setBusiness(result.business);
    setRole(result.business.user_role);
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('businessData', JSON.stringify(business));
}
```

**Self-Healing Feature**:
- If `business_users` row is missing, automatically recreates it
- Compares direct `businesses.user_id` with session user
- Logs restoration attempt for audit

**What's Working**:
✅ Automatic business detection from URL  
✅ Fallback to latest business  
✅ Self-healing missing links  
✅ Persistent state via localStorage  

**What's Missing**:
⚠️ No business switcher triggered from context  
⚠️ No multi-business preview before redirect  
⚠️ No cache invalidation on business change  

---

## 🔐 Multi-Tenancy Guards & Authorization

### RBAC (Role-Based Access Control)

#### 13. **[lib/rbac/serverGuard.js](lib/rbac/serverGuard.js)** — Server Action Guard (Most Critical)
**Purpose**: Centralized authorization wrapper for all server actions

**Enforces** (in order):
1. ✅ User is authenticated (Better Auth session)
2. ✅ User belongs to business (`business_users` table)
3. ✅ User has required role
4. ✅ Business subscription has feature enabled
5. ✅ Business hasn't exceeded usage limits

**Usage Pattern**:
```js
export async function deleteProduct(businessId, productId) {
    const { session, role, planTier } = await withGuard(businessId, {
        permission: 'inventory.delete',
        feature: 'inventory',
        limitKey: 'max_products',
    });
    
    // Now safe to proceed — auth + role + feature + limit all verified
    const client = await pool.connect();
    await client.query(
        'DELETE FROM products WHERE id = $1 AND business_id = $2',
        [productId, businessId]
    );
}
```

**Key Code**:
```js
export async function withGuard(businessId, options = {}) {
    // 1. Authenticate
    let session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error('Unauthorized: Please log in');
    
    // 2. Check business membership
    const platformAdmin = isPlatformLevel(session.user);  // Owner email check
    
    if (!platformAdmin) {
        const memberRes = await client.query(
            'SELECT role, status FROM business_users WHERE user_id = $1 AND business_id = $2',
            [session.user.id, businessId]
        );
        
        if (memberRes.rows.length === 0) {
            // Failsafe: check if user owns business directly
            const ownerCheck = await client.query(
                'SELECT id FROM businesses WHERE id = $1 AND user_id = $2',
                [businessId, session.user.id]
            );
            if (ownerCheck.rows.length === 0) throw new Error('Unauthorized');
        }
    }
    
    // 3. Check permission (if provided)
    if (permission) {
        const hasPermission = hasPermission(role, permission);
        if (!hasPermission) throw new Error('Permission denied');
    }
    
    // 4. Check feature (if provided)
    if (feature && !planHasFeature(planTier, feature)) {
        throw new Error('Feature not available in your plan');
    }
    
    // 5. Check limit (if provided)
    if (limitKey && !planWithinLimit(planTier, limitKey, currentCount)) {
        throw new Error('Usage limit exceeded');
    }
    
    return { session, role, planTier };
}
```

**Critical Security Features**:
✅ Platform owner bypass (by email)  
✅ Business-level isolation enforced  
✅ Atomic permission checks  
✅ Reusable across all server actions  
✅ Transactional safety with DB client pooling  

**Adoption Gap**:
⚠️ Not all server actions use `withGuard` yet  
⚠️ Some legacy actions still do inline auth checks  
⚠️ No centralized audit log of guard checks  

---

#### 14. **[lib/auth/access.js](lib/auth/access.js)** — Business Access Verification
**Purpose**: Verify user has access to specific business (lower-level than withGuard)

**Function**:
```js
export async function verifyBusinessAccess(
    userId, 
    businessId, 
    requiredRoles = [], 
    existingClient = null
) {
    // Check business_users membership
    const res = await client.query(`
        SELECT role, status FROM business_users 
        WHERE user_id = $1 AND business_id = $2
    `, [userId, businessId]);
    
    if (res.rows.length === 0) {
        // Failsafe: check if user owns business
        const ownerCheck = await client.query(
            'SELECT id FROM businesses WHERE id = $1 AND user_id = $2',
            [businessId, userId]
        );
        
        if (ownerCheck.rows.length === 0) {
            throw new Error('Unauthorized');
        }
        
        // Auto-restore link
        await client.query(`
            INSERT INTO business_users (business_id, user_id, role, status)
            VALUES ($1, $2, 'owner', 'active')
            ON CONFLICT DO UPDATE SET role = 'owner', status = 'active'
        `, [businessId, userId]);
    }
    
    // Check role requirements
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
        throw new Error('Insufficient role');
    }
    
    return true;
}
```

---

#### 15. **[lib/auth/rbac.js](lib/auth/rbac.js)** — Role Hierarchy & Permissions Matrix
**Purpose**: Defines 10-role hierarchy and module-level permissions

**Role Hierarchy** (0-9):
```
viewer (0) < waiter (1) < chef (2) < salesperson (3) < cashier (4) 
< accountant (5) < warehouse_manager (6) < manager (7) < admin (8) < owner (9)
```

**Permissions Matrix** (example):
```js
inventory: {
    read: ['viewer', 'salesperson', 'warehouse_manager', ...],
    write: ['salesperson', 'warehouse_manager', 'manager', ...],
    delete: ['manager', 'admin', 'owner'],
    admin: ['admin', 'owner'],
},
accounting: {
    read: ['accountant', 'manager', 'admin', 'owner'],
    write: ['accountant', 'admin', 'owner'],
    delete: ['owner'],
    admin: ['owner'],
}
```

---

### business_id Usage Patterns

#### Pattern 1: URL-Based Routing
**Files**: `app/business/[category]/page.js`, `app/register/page.js`

```js
// Extract from URL
const { category } = useParams();  // 'retail-shop', 'pharmacy', etc.

// NOT using business_id in URL — using domain!
// Example: /business/my-retail-store
// NOT: /business/550e8400-e29b-41d4-a716-446655440000
```

**Why domain instead of ID?**
- More memorable for users
- Better for multi-business switching UI
- Cleaner URLs for bookmarking
- Domain used as unique identifier

---

#### Pattern 2: business_id in Database Queries
**All tenant-isolated data** includes `business_id` field:

```js
// Products filtered by business
SELECT * FROM products WHERE business_id = $1 AND status = 'active'

// Invoices filtered by business
SELECT * FROM invoices WHERE business_id = $1 AND created_at > $2

// Inventory entries isolated by business
SELECT * FROM inventory_ledger 
WHERE business_id = $1 AND product_id = $2

// Chart of accounts per business
SELECT * FROM gl_accounts WHERE business_id = $1
```

**Database Constraints** (from schema):
```prisma
model products {
    business_id String @db.Uuid
    businesses  businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
    @@index([business_id])
}

model business_users {
    business_id String @db.Uuid
    user_id     String
    businesses  businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
    @@unique([business_id, user_id], map: "unique_user_per_business")
}
```

---

#### Pattern 3: Context-Based Access
**All components access via context**, NOT passed as prop:

```js
// ✅ CORRECT
import { useBusiness } from '@/lib/context/BusinessContext';

export function ProductForm() {
    const { business } = useBusiness();
    
    // Use business.id for all queries
    await productAPI.create(business.id, productData);
}

// ❌ WRONG (no direct business_id props in URLs)
<ProductForm businessId={someId} />
```

---

## 📊 Database Schema (Multi-Tenancy Relevant)

### Core Tables

```prisma
model User {
    id              String
    email           String @unique
    businesses      businesses[]        // User owns businesses
    business_users  business_users[]    // User belongs to businesses
}

model businesses {
    id                  String @id @default(uuid())
    user_id             String?             // Creator/owner
    business_name       String
    domain              String @unique      // Used in routing
    category            String              // domain-knowledge key
    email               String
    country             String
    plan_tier           String
    plan_expires_at     DateTime?           // Trial expiry
    
    // Relations
    user                User? @relation(fields: [user_id])
    business_users      business_users[]
    products            products[]
    invoices            invoices[]
    gl_accounts         gl_accounts[]
    customers           customers[]
    vendors             vendors[]
    // ... 30+ more tables
}

model business_users {
    id          String
    business_id String @unique([business_id, user_id])
    user_id     String
    role        String              // 'owner', 'admin', 'manager', ...
    status      String @default("active")
    permissions Json?
    
    businesses  businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
    user        User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

// Example tenant-isolated table
model products {
    id          String
    business_id String  // MUST be in every query
    name        String
    sku         String
    price       Decimal
    stock       Int
    
    businesses  businesses @relation(fields: [business_id], references: [id], onDelete: Cascade)
    
    @@unique([business_id, sku])  // SKU unique per business, not global
    @@index([business_id])
}
```

---

## 🚀 Registration Flow Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ STEP 1: Business Identity                  │
├────────────────────────────────────────────┤
│ • Enter business name                      │
│ • Enter email & password (if new user)     │
│ • Generate domain handle (e.g., "nexus")   │
│ • Check domain availability (server action)│
└────────────────────────────────────────────┘
           │
           │ checkDomainAvailabilityAction()
           ▼
    ┌──────────────────┐
    │ Domain Available?│
    └──────────────────┘
           │ ✅ Yes
           ▼
┌────────────────────────────────────────────┐
│ STEP 2: Market Vertical Selection          │
├────────────────────────────────────────────┤
│ • Browse 55+ domains (searchable)          │
│ • Select category (e.g., "retail-shop")   │
│ • See domain-specific details              │
│ • Plan tier auto-suggested                 │
└────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ STEP 3: Final Configuration                │
├────────────────────────────────────────────┤
│ • Select country                           │
│ • Confirm plan tier                        │
│ • Regional compliance defaults loaded      │
└────────────────────────────────────────────┘
           │
           │ handleFinish()
           ▼
    ┌──────────────────┐
    │ Create account?  │ (if new user)
    │ authClient.      │
    │ signUp.email()   │
    └──────────────────┘
           │ ✅ User created
           ▼
    ┌──────────────────────────────────────┐
    │ createBusiness() [Server Action]     │
    ├──────────────────────────────────────┤
    │ 1. Validate domain uniqueness        │
    │ 2. INSERT into businesses            │
    │ 3. INSERT into business_users (owner)│
    │ 4. Seed Chart of Accounts            │
    │ 5. COMMIT transaction                │
    └──────────────────────────────────────┘
           │ ✅ businessId returned
           ▼
    ┌──────────────────────────────────────┐
    │ seedBusinessData() [Populate initial │
    │ products from domain template]       │
    │ • seedBusinessProductsAction()       │
    └──────────────────────────────────────┘
           │ ✅ Products seeded
           ▼
    ┌──────────────────────────────────────┐
    │ Mark setup_completed = true          │
    │ Set trial_expires_at (7 days out)    │
    └──────────────────────────────────────┘
           │
           │ router.push(`/business/{domain}`)
           ▼
    ┌──────────────────────────────────────┐
    │ BusinessProvider syncs context       │
    │ • Fetches business data              │
    │ • Sets user role                     │
    │ • Stores in localStorage             │
    └──────────────────────────────────────┘
           │
           ▼
    ✅ REGISTRATION COMPLETE
       User lands in business dashboard
```

---

## 🎯 What's Working Well

### Strengths
✅ **Clean separation of concerns**: Registration (UI) vs Creation (server actions) vs Auth (Better Auth)  
✅ **Atomic transactions**: Business + user link + COA seeding all-or-nothing  
✅ **Domain-driven**: 55+ domains with specific configs (tax, units, features)  
✅ **Multi-tenancy isolation**: `business_id` enforced everywhere via schema + withGuard()  
✅ **Self-healing**: Auto-restores missing `business_users` links  
✅ **Trial system**: Automatic 7-day trials for free tier users  
✅ **Role-based access**: 10-level hierarchy with module permissions  
✅ **Better Auth integration**: Modern, secure authentication  

---

## ⚠️ What's Missing/Incomplete

### Critical Gaps

1. **Email Verification**
   - No email verification before creating business
   - Could create accounts with typos or fake emails
   - **Fix**: Add email verification step after sign-up, before business creation

2. **Form State Persistence**
   - If user closes browser during registration, all form data is lost
   - No way to resume interrupted registration
   - **Fix**: Save form state to localStorage between steps

3. **Multi-Business Switching UX**
   - Login always goes to "latest" business
   - No UI to choose which business on login
   - **Fix**: Add business switcher modal or dedicated page if user has 2+ businesses

4. **Validation & Error Recovery**
   - If product seeding fails (step 3), database is not cleaned up
   - User has business but no initial products
   - **Fix**: Add rollback on seed failure or retry mechanism

5. **Business Logo Upload**
   - Logo field exists but upload not implemented
   - **Fix**: Add file upload handler + CDN storage

6. **No Audit Trail**
   - Business creation not logged
   - No way to track who created what business
   - **Fix**: Add business_creation audit log table

7. **Tax Configuration Not Initialized**
   - Only Chart of Accounts is seeded
   - Tax rates/compliance not auto-configured
   - **Fix**: Add tax_config table seeding in createBusiness()

8. **Missing Data Validation**
   - Business name, email, phone not validated for length/format
   - **Fix**: Add Zod schemas for business fields

9. **No Business Metadata**
   - Business setup doesn't capture: industry details, team size, revenue
   - **Fix**: Add optional onboarding questionnaire

10. **Limited Registration Analytics**
    - No tracking of: where users drop off, which domains most popular
    - **Fix**: Add analytics events to each registration step

---

## 📋 Implementation Checklist

### High Priority (Security/Core)
- [ ] Add email verification step
- [ ] Implement form state localStorage persistence
- [ ] Add registration-related audit logs
- [ ] Enhance createBusiness() validation (Zod schema)
- [ ] Add tax configuration seeding

### Medium Priority (UX)
- [ ] Add multi-business switcher on login
- [ ] Implement business logo upload
- [ ] Add error recovery for failed seeding
- [ ] Create registration drop-off analytics
- [ ] Add business metadata questionnaire

### Low Priority (Enhancement)
- [ ] Add more domains (80+ target)
- [ ] Implement business templates library
- [ ] Add team onboarding workflow
- [ ] Create domain-specific welcome sequences

---

## 🔗 Related Files (Cross-Reference)

**Authentication Flow**:
- `lib/auth.js` → `lib/auth-client.js` → `app/register/page.js`
- `app/login/actions.js` → Business routing

**Domain Knowledge**:
- `lib/domainKnowledge.js` → `lib/domainData/*` → `lib/config/domains.js`
- Domain helpers: `lib/utils/domainHelpers.ts`

**Business Setup**:
- `lib/actions/basic/business.js` → `app/register/page.js` → `app/business/[category]/page.js`
- Context: `lib/context/BusinessContext.js`

**Security**:
- `lib/rbac/serverGuard.js` → All server actions
- `lib/auth/rbac.js` & `lib/auth/access.js` → Permissions

**Multi-Tenancy**:
- `prisma/schema.prisma` → Unique constraints on SKU, serial, batch per business_id
- `proxy.ts` → Rate limiting at edge

---

## 💡 Recommendations

### Short Term (Next Sprint)
1. Add email verification
2. Implement form state localStorage
3. Add registration analytics events
4. Create audit log for business creation

### Medium Term (1-2 Months)
1. Enhance error handling on product seeding
2. Build multi-business switcher
3. Add business metadata collection
4. Implement logo upload

### Long Term (Quarter+)
1. Create advanced onboarding workflows per domain
2. Build business setup wizard templates
3. Add team invitation flows
4. Create migration tools from competitors

---

**Last Updated**: May 14, 2026  
**Author**: Architecture Audit  
**Status**: Ready for Implementation
