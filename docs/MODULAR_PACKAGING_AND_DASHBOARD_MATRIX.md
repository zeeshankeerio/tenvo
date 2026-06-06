# Modular plans: dashboard tab → feature → access matrix

This document maps **every major dashboard tab** in the business shell to **plan feature keys** (`lib/config/plans.js`), **RBAC** (`NAV_PERMISSION_MAP` in `lib/rbac/permissions.js`), and **domain rules** (`DashboardTabs.jsx` + `Sidebar.jsx`). Use it to design **à la carte** bundles (inventory-only, POS-only, marketing-only) and to keep **server-side** `checkPlanFeature` aligned with the UI.

---

## How access is enforced today (three layers)

| Layer | Where | What it does |
|--------|--------|----------------|
| **Plan features** | `planHasFeature(planTier, featureKey)` | Boolean flags per tier in `PLAN_TIERS.*.features`. |
| **Navigation / tabs** | `TabGuard` + `NAV_PERMISSION_MAP` | Role permission + optional `feature` → locked tab + `UpgradePrompt`. |
| **Server actions / API** | `checkPlanFeature`, `withPlan`, `assertBusinessAccess` | Must match UI or power users bypass UI. |

**Important:** Some `TabGuard` calls pass **`requiredPlan` overrides** (e.g. `reports` uses `requiredPlan="business"` while `NAV_PERMISSION_MAP.reports` uses feature `advanced_reports`, which unlocks at **professional**). Treat that as a **product/copy inconsistency** to fix when you sell modular SKUs.

**Domain gates** (separate from money): `posRelevant`, `hospitalityDomain`, `campaignRelevant` hide or block modules that are not meaningful for the business category.

---

## Module groups (for packaging)

### A. Core commerce (baseline for almost any SKU)

| Tab (`?tab=`) | Main UI | Plan feature (TabGuard / NAV) | Min tier (FEATURE_MIN_PLAN) | Notes |
|-----------------|---------|-------------------------------|------------------------------|--------|
| `dashboard` | Domain dashboard | none | free | |
| `inventory` | Inventory + Busy grid | none (permission only) | free | Limits: `max_products`, warehouses. |
| `invoices` | Invoice list / builder | none | free | Monthly invoice limits. |
| `customers` | CRM customers | none | free | |
| `vendors` | Vendors | none | free | |
| `purchases` | PO manager | none | free | |
| `payments` | Payment allocations | none | free | |
| `quotations` | Quotes / SO / challans | none | free | Sidebar may hide via `quotations` flag. |
| `sales` | Sales manager | **not in NAV map** — no plan gate via map | — | Only RBAC; align with a feature if you SKU-gate it. |
| `gst` | Tax compliance | none in map | free | |
| `settings` | Settings | none | free | Billing lives here. |

**Candidate “Core only” SKU:** A + tight limits; no POS, no marketing, no advanced ops.

---

### B. Inventory & operations (warehouse / batch / MFG)

| Tab | Main UI | Plan feature | Min tier |
|-----|---------|--------------|----------|
| `warehouses` | Multi-location | `multi_warehouse` | professional |
| `batches` | Batch/serial hub | `batch_tracking` (serials same tab) | professional |
| `manufacturing` | BOM / production | `manufacturing` | business (per `plans.js`) |

**Candidate “Inventory Pro” SKU:** Core + `multi_warehouse` + `batch_tracking` (+ optional `serial_tracking` — same tier today).

**Candidate “Manufacturing add-on”:** `manufacturing` (often sold with inventory).

---

### C. POS & storefront

| Tab | Main UI | Plan feature | Min tier | Domain |
|-----|---------|--------------|----------|--------|
| `pos` | PosTerminal / SuperStorePOS / RestaurantPOS | `pos` | starter | `posRelevant` |
| `refunds` | POS refunds | `pos_refunds` | starter | `posRelevant` |
| `restaurant` | Tables, floor, reservations, KDS embed | `restaurant_pos` | professional | hospitality |
| `orders` | Storefront orders | none in map | — | RBAC only; tie to ecommerce feature if SKU-gating. |

**Candidate “POS only” SKU:** `pos` + `pos_refunds` + limits `max_pos_terminals`; optionally add `orders` behind a new flag `storefront_orders` if you want strict separation from invoicing.

---

### D. Marketing & CRM (promotions, loyalty, campaigns)

| Tab | Main UI | Plan feature | Min tier | Domain |
|-----|---------|--------------|----------|--------|
| `loyalty` | Loyalty + **PromotionEngine** + LoyaltyManager | `loyalty_programs` (map); tab also shows promotions UI | professional (loyalty) | `posRelevant` |
| `campaigns` | CampaignsManager | `campaigns` | business | `campaignRelevant` |

**Today:** Promotions engine is **bundled inside the loyalty tab**, but plan keys split **`promotions_crm`** vs **`loyalty_programs`** vs **`campaigns`**. For modular pricing, decide: **one “Marketing” SKU** = all three keys, or split “Loyalty” vs “Campaigns email/SMS”.

**Candidate “Marketing only” SKU:** `promotions_crm` + `loyalty_programs` + `campaigns` (and domain rule), without POS — requires **new product rules** because today loyalty tab is domain-gated with POS.

---

### E. Finance & accounting (beyond core)

| Tab | Main UI | Plan feature | Min tier |
|-----|---------|--------------|----------|
| `accounting` | AR/AP cards + FinancialOverview | `expense_tracking` in NAV | starter |
| `finance` | FinanceHub | `expense_tracking` | starter |
| `expenses` | ExpenseManager | `expense_tracking` | starter |
| `credit-notes` | FinanceHub | `credit_notes` | starter |
| `fiscal` | Period close | `fiscal_periods` | professional |
| `exchange-rates` | FX | `exchange_rates` | business |

**Candidate “Finance add-on”:** starter finance pack vs professional fiscal.

---

### F. Intelligence & reporting

| Tab | Sub-views | Plan feature (NAV) | Min tier | TabGuard note |
|-----|-----------|-------------------|----------|----------------|
| `reports` | AdvancedAnalytics, DemandForecast, AIInsightsPanel, ReportBuilder | `advanced_reports` (sidebar `reports`); AI views need `ai_analytics` / `ai_forecasting` in tier | professional+ for advanced reports | `requiredPlan="business"` on tab — **stricter than map** |

**Candidate “Analytics add-on”:** Split keys: `advanced_reports` vs `ai_analytics` vs `ai_forecasting` vs `custom_reports` for finer SKUs.

---

### G. HR

| Tab | Sub-views | Plan feature | Min tier |
|-----|-----------|--------------|----------|
| `payroll` | Payroll, attendance, shifts | `payroll` / `attendance_tracking` / `shift_scheduling` | business |

---

### H. Governance & platform

| Tab | Plan feature | Min tier |
|-----|--------------|----------|
| `approvals` | `approval_workflows` | business |
| `audit` | `audit_logs` | business |
| `api` / `webhooks` / `integrations` | `api_access`, `webhook_integrations` | **business**+ |

---

## Small-business à la carte ideas (commercial)

| SKU | Target buyer | Feature keys to enable | Dependencies |
|-----|----------------|------------------------|--------------|
| **Core ledger** | Shops needing invoices + stock only | Core A; no `pos` | — |
| **Inventory Pro** | Wholesale, pharma traceability | + `multi_warehouse`, `batch_tracking` | Core |
| **Retail POS** | Counter sales | + `pos`, `pos_refunds` | Core; domain retail |
| **Marketing suite** | Retail promos + campaigns | + `loyalty_programs`, `promotions_crm`, `campaigns` | Unbundle domain from POS-only if desired |
| **Finance close** | Accountants | + `fiscal_periods`, `exchange_rates`, `credit_notes` | Core |
| **People** | SMB with staff | + `payroll`, `attendance_tracking`, `shift_scheduling` | Core |

---

## Packaging v1 (implemented)

Per-tenant overrides live on **`businesses.settings.packaging`**:

```json
{
  "packaging": {
    "mode": "tier",
    "feature_overrides": { "pos": true, "campaigns": false }
  }
}
```

- **`mode: "tier"`** (default) — ignore `feature_overrides`; access = `PLAN_TIERS[plan_tier].features` only.
- **`mode: "custom"`** — for each key present in `feature_overrides`, that boolean **replaces** the tier default for that feature. Omitted keys still follow the tier.

**Code:**

| Piece | Role |
|--------|------|
| `lib/subscription/effectivePlanAccess.js` | `planHasFeatureWithPackaging`, `getPackagingFromSettings` |
| `lib/rbac/permissions.js` | `getNavItemAccess(..., businessSettings?)` |
| `components/guards/TabGuard.jsx` | Uses context `business.settings` + `FEATURE_MIN_PLAN` for upgrade copy |
| `lib/auth/planGuard.js` | `getBusinessPlan` returns `settings`; `checkPlanFeature` uses packaging |
| `lib/rbac/serverGuard.js` | `withGuard` loads `tenantSettings` from DB for feature checks |
| `lib/hooks/usePermissions.js` | `planCan` / `canNav` / `isLocked` respect packaging |
| `lib/actions/admin/platform.js` | **`updateBusinessPackaging(businessId, { mode, featureOverrides })`** (platform admin) |

**Plan flags added** (all tiers default `true` — no behavior change until you set `mode: 'custom'`):

- `storefront_orders` — gates **Orders** nav (`orders` tab).
- `sales_hub` — gates **Sales** nav (`sales` tab).

**Reports tab:** `TabGuard` no longer hard-codes `requiredPlan="business"`; upgrade target follows `FEATURE_MIN_PLAN.advanced_reports` (**professional**).

---

## Implementation checklist (ongoing)

1. ~~**Single source of truth**~~ — **Done (v1):** `planHasFeatureWithPackaging(planTier, key, settings)` merges tier + `settings.packaging`.
2. ~~**Align TabGuard**~~ — **Done** for `reports`; audit other `requiredPlan` overrides over time.
3. ~~**Add `sales` and `orders` to `NAV_PERMISSION_MAP`**~~ — **Done** with `sales_hub` / `storefront_orders`.
4. **Split loyalty tab** (optional) — Separate “Loyalty” vs “Promotions” if sold separately.
5. **Audit server actions** — Grep for `checkPlanFeature` / `withPlan`; add guards where APIs bypass UI.
6. **Pricing / Stripe** — Map commercial SKUs to prices; optional webhook to call `updateBusinessPackaging` after purchase.

---

## File index

| Concern | File |
|---------|------|
| Tier definitions | `lib/config/plans.js` |
| Feature → minimum tier | `FEATURE_MIN_PLAN` (generated in same file) |
| Sidebar keys | `components/layout/Sidebar.jsx` |
| Tab content + guards | `app/business/[category]/components/DashboardTabs.jsx` |
| Tab URL whitelist | `lib/config/tabs.js` |
| Tab wrapper | `components/guards/TabGuard.jsx` |
| Nav RBAC | `lib/rbac/permissions.js` (`NAV_PERMISSION_MAP`, `getNavItemAccess`) |
| Effective access | `lib/subscription/effectivePlanAccess.js` |
