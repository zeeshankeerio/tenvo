# Market readiness — scope and standards

“**Everything perfect**” is not a single commit: it is **release discipline** (QA, monitoring, legal, performance) plus **consistent engineering patterns**. This doc defines what **market-ready means in this codebase** and how **forms** should wire to the backend.

## What “fully working” means here

1. **Tenant safety** — Every mutation for business data is scoped to `business_id` (see `docs/DATA_INTEGRITY_AND_FORMS.md` and `lib/prisma/tenantExtension.js`). Never trust IDs from the client without an ownership check.
2. **Server authority** — Validation and permission checks run on the **server** (Zod + `withGuard` / plan limits where applicable).
3. **Predictable API for the UI** — Hub actions return `{ success: true, ... }` or `{ success: false, code, error, details? }` via `lib/actions/_shared/result.js`.
4. **User-visible failures** — Forms surface errors with toasts and, where relevant, field-level messages (see below).

## Hub forms — canonical wiring

Primary document: **`docs/DATA_INTEGRITY_AND_FORMS.md`**.

**Client helper:** `lib/utils/formErrorHandler.jsx`

- After `await someAction(...)`, branch on **`result.success`**.
- For validation failures: **`isValidationError(result)`** → **`formatValidationErrors(result)`** → merge into local `errors` state.
- For other failures: **`showActionError(result)`** (toast + upgrade copy when applicable).

**Components already using this pattern** (use as references when building or auditing new forms):

- `components/ProductForm.jsx`
- `components/CustomerForm.jsx`, `components/VendorForm.jsx`
- `components/SalesDocumentForm.jsx`, `components/PurchaseDocumentForm.jsx`
- `components/ExpenseEntryForm.jsx`
- `components/JournalEntryForm.jsx`

**Other patterns** (still valid, different stack):

- **Marketing** — `ContactForm`, `DemoRequestForm`, newsletter flows may call routes or actions directly; keep CSRF/rate limits and success/error UX in mind.
- **Quick flows** — e.g. `QuickVendorForm` uses `vendorAPI` + `subscriptionErrors` helpers instead of `formErrorHandler`; ensure the returned shape is still handled and `business_id` comes from context.

## Pre-launch checklist (product + ops)

Use this as a **gate**, not a one-time read.

| Area | Minimum bar |
|------|-------------|
| **Auth** | Session boundaries, no sensitive data in client-only storage. |
| **Billing** | Stripe / manual flows per `docs/SUBSCRIPTION_BILLING_FLOW.md`; env vars set in prod. |
| **Database** | Migrations applied via `prisma/migrations`; backups and restore tested. |
| **Observability** | Server errors logged; user-facing errors never leak stack traces. |
| **Legal / marketing** | Privacy, terms, regional copy where you sell (see `docs/REGIONAL_STANDARDS.md` where relevant). |
| **Performance** | Critical lists use reasonable `select`/`include`; avoid unbounded `findMany` on huge tables without pagination. |
| **QA** | Smoke path: register → business hub → create invoice / product → refresh → data still correct. |

Automated smoke (public + contact validation): **`docs/FLOW_E2E_TESTING.md`** — `bun run test:e2e` with dev server; unit contract tests in `tests/unit/formErrorHandler.test.js`.

## What this repo does *not* guarantee by default

- **100% of forms** audited in one pass — new screens should follow the checklist in `DATA_INTEGRITY_AND_FORMS.md`.
- **Instant load everywhere** — requires per-route tuning (`loading.js`, Suspense, caching, query shape); see same doc.

## Related files

- `lib/utils/formErrorHandler.jsx` — action result → UX
- `lib/actions/_shared/result.js` — action result shape
- `lib/actions/_shared/tenant.js` — ownership assertions
- `docs/MODULAR_PACKAGING_AND_DASHBOARD_MATRIX.md` — plan vs features vs tabs
