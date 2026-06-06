# Payments environment: manual billing, Stripe, NOWPayments (crypto)

This repo wires **SaaS subscription billing** to **Stripe** (cards, Checkout, Customer Portal, webhooks) and optional **NOWPayments** for **crypto invoices** (`lib/payments/nowpayments.js`, `useSubscription` → `/api/billing/crypto/*`).

> **Naming:** Server-side Stripe uses **`STRIPE_SECRET_KEY`** (see `lib/payments/stripe.js`, `app/api/webhooks/stripe/route.js`). There is **no** `STRIPE_API_KEY` or `STRIPE_SECRATE` in code—those names are mistakes; use the variables below.

---

## 1. Manual billing (no Stripe, local / UAT)

| Variable | Value |
|----------|--------|
| `BILLING_MODE` | `manual` or `dev` |

Effect: `create-checkout`, `cancel`, and `update` subscription routes **only update Postgres** (`lib/config/billingMode.js`). Good for testing tiers without cards.

Production: omit `BILLING_MODE` or set `stripe` (default).

---

## 2. Stripe (subscriptions + webhooks)

### Required env (server)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` — all server Stripe calls |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from Stripe Dashboard or **Stripe CLI** `listen` |
| `STRIPE_PRICE_*` | Price IDs per tier × currency — see `STRIPE_PRICE_IDS` in `lib/payments/stripe.js` and `.env.example` |

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

Create **Products** and recurring **Prices** in Stripe (Dashboard or API), then map each to `STRIPE_PRICE_<tier>_monthly_<pkr|usd>` so `getPriceIdForPlan()` resolves checkout and `/api/billing/update`.

### Broader Stripe orientation

- [Stripe quickstarts index](https://docs.stripe.com/quickstarts) — Checkout, Billing, Connect, etc.
- [Startup: accept simple payments](https://docs.stripe.com/get-started/use-cases/startup) — account, Payment Links, go-live checklist (conceptual; this app uses **Checkout Sessions** in code, not Payment Links).

---

## 3. NOWPayments (crypto)

### Env

| Variable | Purpose |
|----------|---------|
| `NOWPAYMENTS_API_KEY` | API key from NOWPayments dashboard |
| `NOWPAYMENTS_IPN_SECRET` | Used to verify IPN callbacks (set when you enable IPN) |
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
2. [ ] `STRIPE_PRICE_*` set for every tier you sell × each currency (`pkr` / `usd`).
3. [ ] `STRIPE_WEBHOOK_SECRET` matches the endpoint signing the `POST /api/webhooks/stripe` payload.
4. [ ] `BILLING_MODE=manual` only in dev/UAT.
5. [ ] NOWPayments: API key set; IPN URL reachable in production; `NOWPAYMENTS_IPN_SECRET` set before trusting webhooks.

---

## Related in-repo docs

- `docs/SUBSCRIPTION_BILLING_FLOW.md` — plan tier, webhooks, manual vs Stripe.
- `lib/payments/stripe.js`, `lib/payments/nowpayments.js`, `lib/config/billingMode.js`.
