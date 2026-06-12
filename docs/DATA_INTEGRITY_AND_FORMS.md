# Data integrity, forms, and fast loads

This document ties **tenant isolation**, **mutations**, and **UI refresh** to concrete patterns in this repo. It does not replace per-feature design review.

## Tenant and Prisma

- **Scoped client** (`db` from `lib/db.js`) merges `business_id` for many operations when `withBusinessContext` is active—see `lib/prisma/tenantExtension.js`.
- **`findUnique` is not auto-scoped** (Prisma extension limitation, noted in `tenantExtension.js`). For any read by primary key on tenant data, prefer **`findFirst({ where: { id, business_id } })`** or **`assertEntityBelongsToBusiness`** (`lib/actions/_shared/tenant.js`) before `update` / `delete` by id.
- **Cross-tenant tables** (auth, `businesses`, etc.) use **`prismaBase`**, not `db`, per `AGENTS.md` / `docs/AUDIT_SCHEMA_AND_INTEGRATIONS.md`.

## Server actions (insert / update / delete)

- **Auth + plan**: `withGuard` / `checkPlanFeature` at the start of actions that mutate or read sensitive aggregates.
- **Validation**: Zod schemas in `lib/validation/schemas` (or feature-specific validators) before writes.
- **Result shape**: `actionSuccess` / `actionFailure` from `lib/actions/_shared/result.js` so clients can branch on `success`.
- **Audit**: `auditWrite` for important business mutations where implemented.
- **Multi-step writes**: Use **`prismaBase.$transaction`** or **`db.$transaction`** when several rows must commit or roll back together (see inventory/product flows, billing, platform admin).

## Cache and “instant” UI after mutations

- After server actions that change hub data, call **`revalidatePath`** / **`revalidateTag`** where the affected route or tag is known (examples exist in `lib/actions/standard/invoice-bulk.js`, storefront orders).
- For **perceived** instant feedback: disable submit while `pending`, optimistic updates in client state, and **`loading.js`** / **`Suspense`** boundaries for slow segments—not a single global switch.

## Forms checklist (when adding or changing a form)

1. Validate on the server (never trust the client alone).
2. Pass **`business_id`** from session/context; do not accept a bare “business id” from the body without verifying the user may act for that business.
3. Scope reads/updates with **`business_id`** or **`assertEntityBelongsToBusiness`**.
4. Return **`actionSuccess` / `actionFailure`** and surface errors in the UI.
5. Revalidate or refetch lists after success.

## Hub UI wiring (market-ready forms)

For **document-style** hub forms (inventory, sales, purchases, expenses, journals), use **`lib/utils/formErrorHandler.jsx`** together with server actions that return **`actionSuccess` / `actionFailure`**:

- **`showActionError(result)`** — non-validation failures (toasts, upgrade hints).
- **`isValidationError` / `formatValidationErrors`** — map `details` into field errors.

Reference implementations: **`ProductForm`**, **`CustomerForm`**, **`VendorForm`**, **`SalesDocumentForm`**, **`PurchaseDocumentForm`**, **`ExpenseEntryForm`**, **`JournalEntryForm`** (imports resolve to `formErrorHandler.jsx`).

For hooks or APIs that **throw** instead of returning `{ success }` (e.g. some offline/sync paths), keep **`try/catch`** + **`toast.error`** and ensure the underlying API still scopes by **`business_id`**.

Ship / launch expectations (QA, billing, legal): **`docs/MARKET_READINESS.md`**.

## Related audits

- `docs/MODULAR_PACKAGING_AND_DASHBOARD_MATRIX.md` — plan features vs tabs.
- `docs/SUBSCRIPTION_BILLING_FLOW.md` — billing writes and `prismaBase`.
- `docs/DATABASE_MIGRATIONS.md` — schema evolution.
