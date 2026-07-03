# Payments environment: manual billing, Stripe, NOWPayments (crypto)

This repo wires **SaaS subscription billing** to **Stripe** (cards, Checkout, Customer Portal, webhooks) and optional **NOWPayments** for **crypto invoices** (`lib/payments/nowpayments.js`, `useSubscription` → `/api/billing/crypto/*`).

> **Naming:** Server-side Stripe uses **`STRIPE_SECRET_KEY`** (see `lib/payments/stripe.js`, `app/api/webhooks/stripe/route.js`). There is **no** `STRIPE_API_KEY` or `STRIPE_SECRATE` in code—those names are mistakes; use the variables below.

---

## 1. Billing modes (card + offline together)

| Variable | Value | Effect |
|----------|--------|--------|
| `BILLING_MODE` | `stripe` or omit | Card checkout via Stripe when `STRIPE_SECRET_KEY` is set. Offline payment always available. |
| `BILLING_MODE` | `manual` or `dev` | **Without** `STRIPE_SECRET_KEY`: instant plan apply in Postgres (UAT). **With** Stripe keys: card checkout **and** offline payment both work. |

`shouldUseDevInstantBilling()` in `lib/config/billingMode.js` controls dev-only instant apply (manual mode + no Stripe keys).

**NOWPayments (crypto)** is independent: `/api/billing/crypto/*` stays available whenever `NOWPAYMENTS_API_KEY` is set.

Production: `BILLING_MODE=stripe` (or unset) + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Amounts come from `lib/payments/stripeCatalog.js` (no dashboard Price IDs required).

---

## 1b. Offline payments (JazzCash / EasyPaisa / bank)

Available in **all** billing modes (including production Stripe):

1. Pay to your platform wallet or bank account (details below).
2. Submit transaction ID in **Settings → Billing → Pay offline** (`ManualPaymentRequestPanel`).
3. Platform admin **Approves** in **Platform Admin → Business details** (or records payment directly).

| Variable | Purpose |
|----------|---------|
| `TENVO_MANUAL_PAYMENT_JAZZCASH` | JazzCash number shown to owners |
| `TENVO_MANUAL_PAYMENT_EASYPAISA` | EasyPaisa number |
| `TENVO_MANUAL_PAYMENT_BANK` | Bank transfer instructions (name, title, IBAN) |
| `TENVO_BILLING_SUPPORT_EMAIL` | Optional support contact in billing copy |

Activation uses **`applyManualSubscriptionPaymentTx`** (`lib/payments/manualSubscriptionPayment.js`) for both admin record and owner approve flows. Supports **plan tier** and **domain package** SKUs (e.g. `clothing-commerce`).

Run `npm run verify:manual-billing` after edits to this flow.

---

## 2. Stripe (subscriptions + webhooks)

### Required env (server)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` — all server Stripe calls |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Stripe Dashboard or **Stripe CLI** `listen` |
| `STRIPE_PRICE_*` | **Optional (legacy).** SaaS amounts are derived from `lib/config/plans.js` and `lib/config/domainPackages.js` via `lib/payments/stripeCatalog.js` using Checkout `price_data` — no dashboard Price IDs required. |

### Optional (browser / Elements later)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` — not required for Checkout redirect used today |

### Webhooks without only using Dashboard

Use the **Stripe CLI** to forward events to your local or tunnel URL:

- [Set up your development environment](https://docs.stripe.com/get-started/development-environment) (CLI, fixtures, webhook forwarding).
- [Webhooks quickstart](https://docs.stripe.com/webhooks/quickstart) — `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

This app’s handler: `POST /api/webhooks/stripe` (`app/api/webhooks/stripe/route.js`). Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Product / price IDs

SaaS checkout uses **code-driven amounts** (`lib/payments/stripeCatalog.js` → Checkout `price_data`). You do **not** need dashboard Price IDs for standard flows.

Optional legacy env `STRIPE_PRICE_*` still maps via `getPriceIdForPlan()` if you prefer dashboard prices. Tier keys match `lib/config/plans.js` (`free`, `starter`, `professional`, `business`, `enterprise`). Legacy `STRIPE_PRICE_GROWTH_*` maps to **professional** when `STRIPE_PRICE_PROFESSIONAL_*` is unset.

### Broader Stripe orientation

- [Stripe quickstarts index](https://docs.stripe.com/quickstarts) — Checkout, Billing, Connect, etc.
- [Startup: accept simple payments](https://docs.stripe.com/get-started/use-cases/startup) — account, Payment Links, go-live checklist (conceptual; this app uses **Checkout Sessions** in code, not Payment Links).

---

## 3. NOWPayments (crypto)

### Env

| Variable | Purpose |
|----------|---------|
| `NOWPAYMENTS_API_KEY` | API key from NOWPayments dashboard |
| `NOWPAYMENTS_IPN_SECRET` | IPN signing secret (primary name in code) |
| `NOWPAYMENTS_SECRET` | **Alias** — same value if you already store the secret under this name |
| `NOWPAYMENTS_IPN_SECRECT` | **Typo alias** — supported so a mis-typed `.env` key still works |
| `NOWPAYMENTS_IPN_CALLBACK_URL` | Optional override for IPN URL sent on invoice create; default `NEXT_PUBLIC_APP_URL` + `/api/webhooks/nowpayments` |

### API reference

- [NOWPayments API (Postman / Documenter)](https://documenter.getpostman.com/view/7907941/2s93JusNJt)

### App routes

| Route | Role |
|-------|------|
| `POST /api/billing/crypto/create` | Creates a NOWPayments payment; returns `paymentId`, `payAddress`, amounts, etc. |
| `GET /api/billing/crypto/status?paymentId=…` | Polls payment status |
| `POST /api/webhooks/nowpayments` | IPN target (verify signature in production; extend to persist receipts if you add a table) |

Implementation: `lib/payments/nowpayments.js`. **IPN verification** in that file is simplified—tighten against [official IPN docs](https://documenter.getpostman.com/view/7907941/2s93JusNJt) before relying on it for money-critical automation.

---

## 4. Quick checklist

1. [ ] `.env` matches **`.env.example`** names (`STRIPE_SECRET_KEY`, not typos).
2. [ ] Stripe keys + webhook secret set; catalog amounts live in `lib/config/plans.js` / `domainPackages.js` (optional `STRIPE_PRICE_*` legacy only).
3. [ ] `STRIPE_WEBHOOK_SECRET` matches the endpoint signing the `POST /api/webhooks/stripe` payload.
4. [ ] `BILLING_MODE=manual` only in dev/UAT.
5. [ ] Offline billing: set `TENVO_MANUAL_PAYMENT_*` payee details for owner-facing instructions.
6. [ ] NOWPayments: API key set; IPN URL reachable in production; `NOWPAYMENTS_IPN_SECRET` set before trusting webhooks.

---

## Related in-repo docs

- `docs/SUBSCRIPTION_BILLING_FLOW.md` — plan tier, webhooks, manual vs Stripe.
- `lib/payments/stripe.js`, `lib/payments/nowpayments.js`, `lib/config/billingMode.js`.
