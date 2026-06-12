# End-to-end & form flow testing

This repo uses **two layers** of automated checks for “flows across forms”:

1. **Vitest (fast, no browser)** — business rules, plan gates, and **shared form/action contracts** (`tests/integration`, `tests/unit`; e.g. `tests/unit/formErrorHandler.test.js` for `lib/utils/formErrorHandler.jsx`).
2. **Playwright (browser smoke)** — public pages and **client-side form behaviour** (e.g. validation before network).

## Prerequisites

| Tool | Install |
|------|---------|
| Vitest | Included via `bun install` |
| Playwright browsers | `bun run playwright:install` (Chromium only; add more projects in `playwright.config.ts` if needed) |

## Commands

```bash
# Unit + integration (CI runs `vitest run` without path — same as all discovered tests)
bunx vitest run

# Unit helpers only
bun run test:unit

# Integration slice only
bun run test:integration

# E2E smoke (requires app running — see below)
bun run dev
# other terminal:
bun run test:e2e

# Interactive debugging
bun run test:e2e:ui
```

**Base URL for Playwright:** defaults to `http://127.0.0.1:3000`. Override with `PLAYWRIGHT_BASE_URL`.

## What the Playwright smoke suite covers today

File: `e2e/smoke/public-and-forms.spec.ts`

- Home loads (`/` title contains “TENVO”).
- Pricing shows all five tier names.
- **Contact** — empty submit surfaces **client** validation (`#name-error`), using `data-testid="marketing-contact-form"`.
- Register and demo pages load (no auth session required).

This is **intentionally shallow** for CI/local speed. It does **not** log into the business hub or submit real invoices (those need seeded users, DB, and stable selectors).

## Best practices when extending coverage

1. **Prefer stable selectors:** `getByRole`, `getByLabel`, `data-testid` on root forms (see contact form).
2. **Do not** assert on full toast copy unless necessary — flakier than DOM assertions.
3. **Hub flows:** add a `e2e/hub/` spec that uses [storage state](https://playwright.dev/docs/auth) from a setup project once you have a **non-production** test user and env vars (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`).
4. **API-heavy forms:** consider contract tests against server actions with Vitest + mocked `db` for speed; reserve Playwright for critical user journeys.
5. **After mutations:** assert list refresh or URL change, not only “success” toast.

## Related docs

- `docs/MARKET_READINESS.md` — launch checklist.
- `docs/DATA_INTEGRITY_AND_FORMS.md` — how actions and tenancy should behave under tests.
