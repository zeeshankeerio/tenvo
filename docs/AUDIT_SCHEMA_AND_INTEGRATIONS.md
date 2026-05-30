# Deep audit: schema, data access, and integrations

**Date:** 2026-05-30  
**Scope:** Prisma schema validity, Postgres migration alignment, Stripe/SaaS billing, dual DB access (`pool` vs Prisma), tenant extension, Supabase client usage, and legacy SQL drift.

---

## 1. Prisma schema and migrations

| Check | Result |
|--------|--------|
| `prisma validate` | **Pass** — `prisma/schema.prisma` loads cleanly. |
| SaaS billing models | `businesses.stripe_customer_id`, `stripe_subscription_status`, `subscription_history`, `stripe_webhook_events` are defined in schema and created in `20260530_saas_billing_remediation` (matches migration SQL: FKs, unique `stripe_event_id`, indexes). |
| Audit migrations | `20260517_audit_fixes` / `20260529_audit_fixes` align with operational fixes (payments soft-delete, unique constraints, indexes). |

**Operational note:** After deploy, `_prisma_migrations` should list all folders under `prisma/migrations/`. Use `bun run db:migrate` from repo root; see `docs/DATABASE_MIGRATIONS.md`.

---

## 2. Data layer wiring (`lib/db.js`)

Two surfaces:

1. **`pool` (pg)** — default export `import pool from '@/lib/db'`. Used widely by services/actions for raw SQL and legacy patterns.
2. **Prisma**
   - **`prismaBase`** — `PrismaClient` with `@prisma/adapter-pg` on the **same pool**. No tenant extension. Use for **webhooks**, **platform billing**, **cross-tenant** or **auth-scoped** work.
   - **`db`** — `prismaBase.$extends(createTenantExtension())`. When `withBusinessContext(businessId, fn)` is active, `findMany` / `updateMany` / `create` / etc. auto-scope by `business_id` on models **not** in the exclusion set.

**Accuracy:** Billing routes and Stripe webhook correctly use **`prismaBase`**, so SaaS writes are not accidentally filtered by tenant context.

**Risk (document only):** If future code uses **`db.stripe_webhook_events`** inside `withBusinessContext`, rows with `business_id = null` (platform-wide events) would not match `mergeBusinessWhere`. Today only **`prismaBase`** touches this model — keep it that way.

**Tenant ALS:** `assertEntityBelongsToBusiness` with a `null` client runs reads inside `withBusinessContext(businessId, …)` so the Prisma extension applies on the global `db` client (defense in depth when `where` omits `business_id`).

---

## 3. Stripe integration

| Piece | Wiring |
|--------|--------|
| Checkout | `POST /api/billing/create-checkout` → `getSessionUser` + `assertUserHasBusinessAccess` → `createCustomer` / `createCheckoutSession` from `lib/payments/stripe.js`. Persists `stripe_customer_id` on `businesses`. Metadata: `businessId`, `planTier`, `currency` on session and inside `subscription_data.metadata` (so `customer.subscription.updated` can resolve `businessId`). |
| Webhook | `POST /api/webhooks/stripe` → `constructEvent` → **`prismaBase.$transaction`**: insert `stripe_webhook_events` (unique on `stripe_event_id` → **P2002** returns 200 `duplicate` for idempotency), then handlers update `businesses` / `subscription_history` as appropriate. |
| Manual billing | `BILLING_MODE=manual` → `lib/config/billingMode.js`; checkout route updates plan fields without Stripe. |
| Price IDs | `getPriceIdForPlan(planTier, currency)` maps to `STRIPE_PRICE_*` env keys in `STRIPE_PRICE_IDS` (`lib/payments/stripe.js`). **PKR and USD** keys exist in code; ensure both are set for multi-currency. |

**Stripe API version:** `2024-06-20` in webhook route and `lib/payments/stripe.js` — keep in sync when upgrading.

---

## 4. Tenant extension (`lib/prisma/tenantExtension.js`)

Excluded from auto `business_id` merge (examples): `user`, `session`, `account`, `verification`, `twoFactor`, `businesses`, `subscription_plans`, `invoice_payments`.

**Intent:** Tenant-scoped CRUD for ERP-style tables; auth and business root stay unscoped for correct joins.

**Subscription history:** Has `business_id`; if created via **`db`** under `withBusinessContext`, injection is correct. Current billing code uses **`prismaBase`** and explicit `business_id` — also correct.

---

## 5. Supabase (optional)

| Piece | Wiring |
|--------|--------|
| Browser client | `lib/supabase/client.js` — `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`. |
| Usage | Primarily hooks such as `useMultiLocationSync` (realtime / client tables). If URL/key unset, runtime behavior depends on call sites (may no-op or error). |
| Core ERP | **Better Auth + Prisma/Postgres** are primary; Supabase is not required for migrations or billing. |

---

## 6. Legacy vs canonical schema

| Location | Role |
|----------|------|
| `prisma/migrations/*` | **Canonical** — must match production. |
| `scripts/migrations/*.sql` | Historical / manual; **not** run by `migrate deploy`. See `scripts/migrations/README.md`. |
| `lib/db/migrations/*.sql` | Older Supabase-oriented snippets; **not** Prisma’s source of truth. Treat as archive unless you intentionally replay. |

**Platform feature flags:** Admin UI and `lib/actions/admin/features.js` use tables `platform_feature_flags` and `platform_feature_flag_overrides` (see migration `20260603_platform_feature_flags_tables`). The Prisma model `feature_flags` remains **per-business** toggles (`business_id`, `feature_name`, `is_enabled`) — do not confuse the two.

Avoid applying duplicate DDL from legacy folders on a DB already managed by Prisma without diffing first.

---

## 7. Recommended ongoing checks

1. **`bunx prisma migrate status`** after pulls (expect no pending / failed).  
2. **`bunx prisma validate`** in CI (already low cost).  
3. **Stripe Dashboard:** webhook URL `https://<your-domain>/api/webhooks/stripe`, events subscribed match `switch` in `app/api/webhooks/stripe/route.js`.  
4. **Env parity:** `.env.example` should list every `process.env` key read for billing (including USD price IDs).

---

## 8. Change made from this audit

- **`.env.example`:** document **USD** Stripe price ID variables referenced by `STRIPE_PRICE_IDS` so international checkout configuration is not missed.

No schema or runtime code changes were required for correctness beyond documentation and env example completeness.
