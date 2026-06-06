# Platform subscription & billing flow

This document describes how **Tenvo SaaS billing** (your merchants’ subscriptions to Tenvo) works today, how it compares to a “Zoho / Shopify / NetSuite–style” lifecycle, and how **manual / offline payments** (Easypaisa, JazzCash, bank transfer) fit in before or alongside card gateways.

## Data model (source of truth: `prisma/schema.prisma`)

| Field | Role |
|--------|------|
| `businesses.plan_tier` | Feature tier (`free`, `starter`, …). Drives `planGuard` / RBAC limits. |
| `businesses.settings.packaging` | Optional **modular packaging**: `mode: 'tier' \| 'custom'` and `feature_overrides` (per-feature booleans). When `custom`, `planHasFeatureWithPackaging` (`lib/subscription/effectivePlanAccess.js`) overrides tier flags for nav, tabs, and server guards. Platform admin can **reset to tier** via `updateBusinessPackaging`. |
| `businesses.plan_expires_at` | Optional hard end for trial or **term-based manual billing**. When in the past, guards treat the tenant as **free** (unless you rely only on Stripe with no expiry). |
| `businesses.stripe_customer_id` / `stripe_subscription_id` | Stripe Billing linkage. |
| `businesses.stripe_subscription_status` | Mirror of Stripe status + app-specific values (`manual_dev`, `manual_payment_active`). |
| `subscription_history` | Append-only audit of plan/status/payment-related events (Stripe + **platform manual payment**). |

Customer **AR invoices** (invoices you issue to *your* customers) are separate from this; `subscription_history` is **platform SaaS** only.

## Runtime paths

### 1. Stripe (production default)

1. **Checkout** — `POST /api/billing/create-checkout` → `lib/payments/stripe.js` `createCheckoutSession` with `metadata.businessId`, `planTier`.
2. **Webhook** — `POST /api/webhooks/stripe` (uses **`prismaBase`**, not tenant `db` — see `AGENTS.md`).
   - `checkout.session.completed` → sets `plan_tier`, `stripe_subscription_*`, `stripe_subscription_status: active`, clears `plan_expires_at`, writes `subscription_history`.
   - `invoice.payment_succeeded` → sets status **active** (renewal).
   - `invoice.payment_failed` → sets **past_due**, sends email.
   - `customer.subscription.updated` → syncs status (and plan from metadata when present).
   - `customer.subscription.deleted` → downgrades to **free**, clears Stripe ids, history row.

### 2. `BILLING_MODE=manual` (dev / UAT only)

Same checkout route **skips Stripe** and updates Postgres only (`stripe_subscription_status: manual_dev`). Described in `lib/config/billingMode.js`. This is **not** a production “Easypaisa received” workflow — it is for testing tiers without payments.

### 3. Platform admin — plan changes & manual renew

- **`updateBusinessPlan(businessId, newPlanTier, expiresAt?)`** — sets tier + limits + optional expiry; appends **`subscription_history`** (`platform_admin_plan_change`).
- **`recordManualSubscriptionPayment({...})`** — for **real offline PSP / bank** payments: extends `plan_expires_at` from `max(now, current_expiry)`, applies paid tier limits, sets `stripe_subscription_status` to **`manual_payment_active`**, writes **`subscription_history`** with `status: manual_payment_received` and reference/notes/amount metadata. **Does not** call Stripe.

UI: **Platform Admin → Businesses → Details** includes a short form to record a manual payment.

**Marketing paths:** `/pricing` lists the same **`PLAN_TIERS`** as registration and in-app billing. Guests use **`/register?planTier=…`**; logged-in users can use **`/contact?topic=subscription&planTier=…`** (form pre-fills) or **Book demo** (`/demo`) for sales-led activation and manual payment recording as above.

### 4. Access control vs “billing health”

- **Feature access** (`lib/auth/planGuard.js`, `lib/rbac/serverGuard.js`) uses **`plan_tier` + `plan_expires_at`**, optional **`settings.packaging`**, and limit overrides. It does **not** currently block on `past_due` alone — so merchants keep working during Stripe retries (similar in spirit to a grace period).
- **`GET /api/billing/subscription`** exposes:
  - **`isActive`** — `true` while the subscription should still **allow product use**: includes `active`, `trialing`, `manual_*`, `cancellation_scheduled`, and **grace** states `past_due` / `unpaid` / `incomplete` for non-free tiers.
  - **`needsBillingAttention`** — show banners / reminders (past_due, unpaid, incomplete, incomplete_expired, cancellation_scheduled).

So: **grace = continue access + show “fix payment”**, not silent hard lock on first failed charge (unless you later add `billing_suspended_at` or similar).

## Gaps & follow-ups (professional roadmap)

| Topic | Today | Suggested next step |
|--------|--------|---------------------|
| **Easypaisa / JazzCash / one-link** | Not integrated | Add PSP webhooks or reconciliation jobs → call **`recordManualSubscriptionPayment`** or a Stripe-only path when you unify on Stripe. |
| **`useSubscription` → `/api/billing/update`** | `POST /api/billing/update` changes the Stripe subscription price, merges `planTier` / `businessId` on subscription metadata for webhooks, and applies `getPlanTierQuotaUpdateData` locally after Stripe. Manual billing mode updates Postgres only. | Configure `STRIPE_PRICE_*` for every sellable tier × currency you expose in the app. |
| **Explicit grace end date** | Implicit (Stripe lifecycle + `plan_expires_at`) | Optional column e.g. `subscription_grace_until` for non-Stripe dunning. |
| **Owner self-serve “I paid”** | Not built | Ticket + attachment → ops approves → same server action as admin. |

## Related files

- `app/api/webhooks/stripe/route.js` — Stripe events → `businesses` + `subscription_history`
- `app/api/billing/create-checkout/route.js`, `app/api/billing/update/route.js`, `cancel/route.js`, `portal/route.js`, `subscription/route.js`
- `lib/payments/stripe.js`, `lib/hooks/useSubscription.js`
- `lib/actions/admin/platform.js` — `updateBusinessPlan`, `recordManualSubscriptionPayment`, `extendTrial`, `updateBusinessPackaging`
- `lib/subscription/effectivePlanAccess.js` — `planHasFeatureWithPackaging`, `getPackagingFromSettings`
- `components/billing/SubscriptionBillingBanner.jsx` — billing reminders
- `docs/PAYMENTS_ENV_AND_SETUP.md` — env vars, manual vs Stripe, NOWPayments, official doc links
- `docs/subscription-analysis.md` — packaging / tiers vs Zoho (separate from payment rails)
