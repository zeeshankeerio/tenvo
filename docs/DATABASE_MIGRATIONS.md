# Database migrations (required)

The Prisma schema in this repo must match your Postgres database. If you see errors such as **“The column `businesses.stripe_customer_id` does not exist”** after pulling new code, pending migrations have not been applied.

**Connection URL:** `prisma.config.ts` loads **`.env`** first, then **`.env.local`** (overrides), then uses **`DIRECT_URL` or `DATABASE_URL`** for the migration datasource. Run CLI commands from the **repository root**.

**Supabase:** Prefer a **direct** Postgres URL on port **5432** for `DIRECT_URL` when applying migrations; `DATABASE_URL` may use the **6543** pooler for the app. Both must point to a reachable host or you will see **P1001**.

**Legacy SQL** under `scripts/migrations/` is **not** applied by `prisma migrate deploy`. See **`scripts/migrations/README.md`** for how it relates to `prisma/migrations/` and recovery steps.

**Windows PowerShell:** use separate lines or `;` between commands — **`&&` is not valid** on older PowerShell. From repo root: `Set-Location E:\path\to\tenvo-main` then run the `bunx` / `bun` commands below.

---

## Production / staging

```bash
bun run db:migrate
```

(equivalent to `bunx prisma migrate deploy`)

---

## Local development

```bash
bunx prisma migrate dev
```

Quick sync (accepts drift; not for shared production DBs):

```bash
bun run db:push
```

---

## Error **P3009** — “migrate found failed migrations in the target database”

Prisma recorded a migration as **failed** (it started, errored, and never finished). **New migrations will not apply** until you resolve it.

Typical case: **`20260517_audit_fixes`** failed (e.g. duplicate index), then the migration SQL in the repo was fixed to be idempotent.

**Re-run that migration via Prisma:**

```bash
bunx prisma migrate resolve --rolled-back "20260517_audit_fixes"
bun run db:migrate
```

One command (explicit consent):

```bash
CONFIRM_REPAIR=1 bun run db:repair:failed-audit
```

PowerShell:

```powershell
$env:CONFIRM_REPAIR = "1"; bun run db:repair:failed-audit
```

**DB already matches that migration** (you applied SQL manually):

```bash
bunx prisma migrate resolve --applied "20260517_audit_fixes"
bun run db:migrate
```

Optional: run **`scripts/migrations/repair-20260517_audit_fixes.sql`** in the Supabase SQL editor, then choose `--applied` or `--rolled-back` as appropriate. Decision tree: **`scripts/migrations/README.md`**.

---

## Error **P3018** — SQL error during migrate (e.g. “relation already exists”)

If deploy stops mid-migration with Postgres **42P07** / duplicate name (e.g. `invoice_approvals_invoice_id_approved_by_key` already exists):

1. Pull the latest **`prisma/migrations/20260517_audit_fixes/migration.sql`** (drops that name before `ADD CONSTRAINT`, and `DO $$` catches **duplicate_object** and **duplicate_table**).

2. Resolve the failed migration (same as **P3009**): `--rolled-back` then `bun run db:migrate`, or `--applied` if the DB is already correct.

3. One-off in SQL editor if needed:

   ```sql
   DROP INDEX IF EXISTS unique_product_warehouse_state;
   ```

---

## SaaS billing migration

Folder: `prisma/migrations/20260530_saas_billing_remediation/`

Adds: `businesses.stripe_customer_id`, `businesses.stripe_subscription_status`, tables `subscription_history`, `stripe_webhook_events`.

---

## Storefront feature columns

Folder: `prisma/migrations/20260531_storefront_feature_columns/`

Adds: `business_settings.is_storefront_enabled` (default `true`, kept in sync with `settings.storefront.enabled` via admin actions), `product_categories.image_url`, `parent_id`, `sort_order`, and `products.category_id` (FK to `product_categories`). Apply with `bun run db:migrate` so storefront SQL can select hierarchy and imagery without **42703** errors.

---

## Product variant default flag

Folder: `prisma/migrations/20260601_product_variants_is_default/`

Adds `product_variants.is_default` (boolean, default false) and backfills one default variant per product for storefront joins and variant ordering. Required if legacy SQL never ran `add_storefront_missing_columns.sql`.

---

## Storefront order line SKU / variant

Folder: `prisma/migrations/20260602_storefront_order_items_sku_variant/`

Adds `storefront_order_items.product_sku` and `variant_id`, backfills from `metadata`, and supports `getStorefrontOrders` / exports without **42703**. Run `bun run db:migrate`.

---

## Development billing (no Stripe)

Set `BILLING_MODE=manual` in `.env`. See `lib/config/billingMode.js`.
