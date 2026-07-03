# Platform subscription & billing flow

This document describes how **Tenvo SaaS billing** (your merchants’ subscriptions to Tenvo) works today, how it compares to a “Zoho / Shopify / NetSuite–style” lifecycle, and how **manual / offline payments** (Easypaisa, JazzCash, bank transfer) fit in before or alongside card gateways.

## Data model (source of truth: `prisma/schema.prisma`)

| Field | Role |
|--------|------|
| `businesses.plan_tier` | Feature tier (`free`, `starter`, …). Drives `planGuard` / RBAC limits. |
| `businesses.settings.packaging` | Optional **modular packaging**: `mode: 'tier' \| 'custom'` and `feature_overrides` (per-feature booleans). When `custom`, `planHasFeatureWithPackaging` (`lib/subscription/effectivePlanAccess.js`) overrides tier flags for nav, tabs, and server guards. **Business owner** can edit this in **Settings → Billing → Custom module access** via `updateOwnerBusinessPackagingAction`. Platform admin can reset via `updateBusinessPackaging`. |
| `feature_flags` (per-business table) | Present in Prisma for legacy / future use; **product access today** uses `plan_tier` + `settings.packaging`, not this table. Do not confuse with **`platform_feature_flags`** (rollout for the whole platform). |
| `businesses.plan_expires_at` | Optional hard end for trial or **term-based manual billing**. When in the past, guards treat the tenant as **free** (unless you rely only on Stripe with no expiry). |
| `businesses.stripe_customer_id` / `stripe_subscription_id` | Stripe Billing linkage. |
| `businesses.stripe_subscription_status` | Mirror of Stripe status + app-specific values (`manual_dev`, `manual_payment_active`). |
| `subscription_history` | Append-only audit of plan/status/payment-related events (Stripe + **platform manual payment**). |

Customer **AR invoices** (invoices you issue to *your* customers) are separate from this; `subscription_history` is **platform SaaS** only.

## Runtime paths

### 1. Stripe (production default)

1. **Checkout** — `POST /api/billing/create-checkout` → `lib/payments/stripe.js` `createCheckoutSession` with `metadata.businessId`, `planTier` and/or `domainPackageKey`. Amounts come from **`lib/payments/stripeCatalog.js`** (`PLAN_TIERS` + `lib/config/domainPackages.js`) via inline **`price_data`** — dashboard Price IDs / `STRIPE_PRICE_*` env vars are optional legacy fallbacks only. Success/cancel URLs return to **`/business/{domain}?tab=settings&…`** (see `lib/utils/billingReturnUrls.js`).
2. **Webhook** — `POST /api/webhooks/stripe` (uses **`prismaBase`**, not tenant `db` — see `AGENTS.md`).
   - `checkout.session.completed` → sets `plan_tier`, `stripe_subscription_*`, **`stripe_subscription_status`** from the live Stripe subscription (e.g. **`trialing`**), sets **`plan_expires_at`** from **`trial_end`** while trialing (clears when **active**), writes `subscription_history` with the same status.
   - `invoice.payment_succeeded` → sets status **active**, clears **`plan_expires_at`** (paid period).
   - `invoice.payment_failed` → sets **past_due**, clears **`plan_expires_at`** (avoid stale trial expiry downgrading access), sends email.
   - `customer.subscription.updated` → syncs status and **`plan_expires_at`** (trial end while **trialing**; cleared otherwise).
   - `customer.subscription.deleted` → downgrades to **free**, clears Stripe ids, history row.

**Trial length:** in-app signup trial and Stripe **`trial_period_days`** both follow **`TRIAL_CONFIG.durationDays`** in `lib/config/platform.js` (currently **14**).

### 2. `BILLING_MODE=manual` (dev / UAT only)

Same checkout route **skips Stripe** and updates Postgres only (`stripe_subscription_status: manual_dev`). Described in `lib/config/billingMode.js`. This is **not** a production “Easypaisa received” workflow — it is for testing tiers without payments.

### 3. Platform admin — plan changes & manual renew

- **`updateBusinessPlan(businessId, newPlanTier, expiresAt?)`** — sets tier + limits + optional expiry; appends **`subscription_history`** (`platform_admin_plan_change`).
- **`recordManualSubscriptionPayment({...})`** — for **real offline PSP / bank** payments: extends `plan_expires_at` from `max(now, current_expiry)`, applies paid tier limits and optional **domain package** packaging via **`getBillingActivationPayload`**, sets `stripe_subscription_status` to **`manual_payment_active`**, writes **`subscription_history`** with `status: manual_payment_received` and reference/notes/amount metadata. **Does not** call Stripe.
- **`approveManualSubscriptionPaymentRequest` / `rejectManualSubscriptionPaymentRequest`** — review owner-submitted offline payments stored in **`settings.billing.pending_manual_payment`**.

UI: **Platform Admin → Businesses → Details** includes manual payment recording and approve/reject for pending owner requests.

### 3b. Business owner — offline payment self-serve

1. Owner pays JazzCash / EasyPaisa / bank using platform payee details (`TENVO_MANUAL_PAYMENT_*` env vars).
2. **Settings → Billing → Pay offline** (`components/billing/ManualPaymentRequestPanel.jsx`) — submit transaction ID, method, optional amount, and target **plan tier** or **domain package** (e.g. `clothing-commerce`).
3. Request is stored as **`settings.billing.pending_manual_payment`** with status **`pending`**.
4. Platform admin verifies and **Approves** → same **`applyManualSubscriptionPaymentTx`** path as direct admin record; request moves to history.

Server actions: **`lib/actions/basic/billing.js`** (`submitManualSubscriptionPaymentRequestAction`, `getManualSubscriptionPaymentContextAction`). Shared apply logic: **`lib/payments/manualSubscriptionPayment.js`**.

**Marketing paths:** `/pricing` lists the same **`PLAN_TIERS`** as registration and in-app billing. Domain suites (e.g. **`/solutions/clothing-commerce`**) link to registration with **`?package=clothing-commerce`**. Guests use **`/register?planTier=…`**; logged-in users can use **`/contact?topic=subscription&planTier=…`** (form pre-fills) or **Book demo** (`/demo`) for sales-led activation and manual payment recording as above.

### 4. Access control vs “billing health”

- **Feature access** (`lib/auth/planGuard.js`, `lib/rbac/serverGuard.js`) uses **`plan_tier` + `plan_expires_at`**, optional **`settings.packaging`**, and limit overrides. It does **not** currently block on `past_due` alone — so merchants keep working during Stripe retries (similar in spirit to a grace period).
- **`GET /api/billing/subscription`** exposes:
  - **`isActive`** — `true` while the subscription should still **allow product use**: includes `active`, `trialing`, `manual_*`, `cancellation_scheduled`, and **grace** states `past_due` / `unpaid` / `incomplete` for non-free tiers.
  - **`needsBillingAttention`** — show banners / reminders (past_due, unpaid, incomplete, incomplete_expired, cancellation_scheduled).

So: **grace = continue access + show “fix payment”**, not silent hard lock on first failed charge (unless you later add `billing_suspended_at` or similar).

## Roles, billing, and owner-only controls

| Area | Who |
|------|-----|
| **Plan tier & Stripe checkout** | **Owner** (and platform owner bypass). Billing tab in Settings. |
| **Team invites & roles (except owner)** | **Admin** or **owner** (`settings.manage_users`). Changing **owner** membership / **roles** matrix is **owner**-only where noted in UI. |
| **Custom module packaging** (`settings.packaging`) | **Owner** only — permission `settings.packaging` (`lib/rbac/permissions.js`). Server: `updateOwnerBusinessPackagingAction` in `lib/actions/basic/business.js`. |
| **Platform-wide feature rollout** | **Platform admin** — `platform_feature_flags` / `FeatureFlagManager`, not per-tenant business owners. |

Limits (**seats**, **max_products**, **max_warehouses**) always follow **`plan_tier`** (and column overrides from checkout/admin). Packaging overrides **named feature modules** only (see `PLAN_FEATURE_TOGGLE_KEYS` in `lib/config/plans.js`).

## Gaps & follow-ups (professional roadmap)

| Topic | Today | Suggested next step |
|--------|--------|---------------------|
| **Easypaisa / JazzCash / one-link** | Owner submit + admin approve; admin direct record | Optional PSP webhooks → call **`applyManualSubscriptionPaymentTx`** when you automate reconciliation. |
| **`useSubscription` → `/api/billing/update`** | `POST /api/billing/update` changes the Stripe subscription using **dynamic catalog prices** (`ensureStripePriceForCatalogItem`), merges `planTier` / `domainPackageKey` / `businessId` on subscription metadata for webhooks, and applies activation payload locally after Stripe. Manual billing mode updates Postgres only. | Ensure Stripe account currency/tax settings match PKR/USD catalog; optional `STRIPE_AUTOMATIC_TAX=true`. |
| **Explicit grace end date** | Implicit (Stripe lifecycle + `plan_expires_at`) | Optional column e.g. `subscription_grace_until` for non-Stripe dunning. |
| **Owner self-serve “I paid”** | **Built** — Settings → Billing offline panel; admin approve/reject | Email notify on submit/approve; optional auto-match by amount. |

## Related files

- `app/api/webhooks/stripe/route.js` — Stripe events → `businesses` + `subscription_history`
- `app/api/billing/create-checkout/route.js`, `app/api/billing/update/route.js`, `cancel/route.js`, `portal/route.js`, `subscription/route.js`
- `lib/payments/stripe.js`, `lib/hooks/useSubscription.js`
- `lib/actions/admin/platform.js` — `updateBusinessPlan`, `recordManualSubscriptionPayment`, `approveManualSubscriptionPaymentRequest`, `extendTrial`, `updateBusinessPackaging`
- `lib/actions/basic/billing.js` — owner offline payment submit/context
- `lib/actions/basic/business.js` — `createBusiness`, `updateOwnerBusinessPackagingAction`
- `lib/utils/businessPackagingSettings.js` — shared merge for `settings.packaging`
- `lib/subscription/effectivePlanAccess.js` — `planHasFeatureWithPackaging`, `getPackagingFromSettings`
- `components/SettingsManager.jsx` — Billing + owner **Custom module access** + **offline payment** panel
- `components/billing/ManualPaymentRequestPanel.jsx` — owner txn ID submit UI
- `components/billing/SubscriptionBillingBanner.jsx` — billing reminders
- `docs/PAYMENTS_ENV_AND_SETUP.md` — env vars, manual vs Stripe, NOWPayments, official doc links
- `docs/subscription-analysis.md` — packaging / tiers vs Zoho (separate from payment rails)
