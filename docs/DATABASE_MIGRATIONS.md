# Database migrations (required)

The Prisma schema in this repo must match your Postgres database. If you see errors such as **“The column `businesses.stripe_customer_id` does not exist”** after pulling new code, pending migrations have not been applied.

**Connection URL:** `prisma.config.ts` loads **`.env`** first, then **`.env.local`** (overrides), then uses **`DIRECT_URL` or `DATABASE_URL`** for the migration datasource. Run CLI commands from the **repository root**.

**`gl_accounts.sub_type` / `gl_accounts.updated_at`:** Server actions and the chart-of-accounts UI expect these columns. Apply Prisma migration **`20260609_gl_accounts_sub_type_updated_at`** (`bun run db:migrate`) so inserts/updates and Prisma stay aligned.

**Supabase:** Prefer a **direct** Postgres URL on port **5432** for `DIRECT_URL` when applying migrations; `DATABASE_URL` may use the **6543** pooler for the app. Both must point to a reachable host or you will see **P1001**.

**Legacy SQL** under `scripts/migrations/` is **not** applied by `prisma migrate deploy`. See **`scripts/migrations/README.md`** for how it relates to `prisma/migrations/` and recovery steps. For inventory / manufacturing / RBAC drift and duplicate-path notes, see **`docs/AUDIT_INVENTORY_MANUFACTURING_RBAC_2026.md`**. For a local **validate** checklist (schema, migrate, build, tests), see **`docs/VALIDATION.md`**.

**Invoice payments (P1011 / `ip.is_deleted` / balance modal):** If Postgres errors on `invoice_payments.is_deleted` or `calculate_invoice_balance` disagrees with payments, apply **`bun run db:migrate`** so Prisma applies **`20260604_invoice_payments_soft_delete_and_balance`** (adds `is_deleted` / `deleted_at` / `deleted_by`, refreshes `calculate_invoice_balance` and `update_invoice_payment_status` triggers).

**Manual SQL (Supabase editor / psql):** Same DDL is in **`lib/db/migrations/034_calculate_invoice_balance_no_is_deleted.sql`** (idempotent). **`lib/db/migrations/033_invoice_payments_soft_delete_columns.sql`** also adds columns and replaces `calculate_invoice_balance`; prefer **034** or Prisma if you need trigger functions recreated too.

**`column "is_deleted" does not exist` inside `calculate_invoice_balance`:** The database had SQL functions referencing `invoice_payments.is_deleted` before that column existed. Run the Prisma migration above or **`034`** once against that database.

**`column "business_id" of relation "invoice_payments" does not exist`:** Some databases created a minimal `invoice_payments` table without `business_id`. Apply Prisma migration **`20260605_invoice_payments_add_business_id`** (`bun run db:migrate`) or run **`lib/db/migrations/037_invoice_payments_business_id.sql`** (backfills from `invoices.business_id`).

**`column "payment_method" of relation "invoice_payments" does not exist`:** Some databases have `invoice_payments` without payment-detail columns expected by `InvoicePaymentService.recordPayment`. Apply Prisma migration **`20260606_invoice_payments_record_payment_columns`** (`bun run db:migrate`) or run **`lib/db/migrations/038_invoice_payments_record_payment_columns.sql`** in the SQL editor.

**`column "received_by" of relation "invoice_payments" does not exist`:** Some tables omit `received_by` (user who recorded the payment). Apply Prisma migration **`20260607_invoice_payments_received_by`** (`bun run db:migrate`) or run **`lib/db/migrations/039_invoice_payments_received_by.sql`**. Prisma maps `received_by` / `deleted_by` as plain strings so the column stays compatible with **`user`.id** (text).

**`invoice_payments.deleted_by` type (UUID vs text):** If `20260604` created `deleted_by` as UUID on an older DB, apply **`20260608_invoice_payments_deleted_by_text`** (`bun run db:migrate`) so the column is **TEXT** and matches Better Auth user ids and Prisma `String`.

**`inventory_reservations` missing `customer_id` / `notes` / `completed_at` / `cancelled_at`:** `lib/services/reservationManagement.js` expects these columns. Apply Prisma migration **`20260611_inventory_reservations_service_columns`** (`bun run db:migrate`) or run **`lib/db/migrations/041_inventory_reservations_service_columns.sql`** (idempotent).

**Low-stock alerts (`42P01` / `low_stock_alerts` does not exist):** Apply Prisma migration **`20260514_inventory_reorder_cycle_counts`** via `bun run db:migrate`, or run the idempotent script **`lib/db/migrations/035_low_stock_alerts_reorder_points.sql`** in the SQL editor (creates `reorder_points` and `low_stock_alerts`).

**Storefront `[getProducts] Storefront columns missing` / degraded catalog:** Apply Prisma migration **`20260617_storefront_product_columns`** (`bun run db:migrate`) or run **`lib/db/migrations/042_storefront_product_columns.sql`**. Adds `products.compare_price`, `is_featured`, `is_new`, `images`, `has_variants`, `rating`, `review_count`, `enable_reviews` (plus backfills `slug`, `stock_status`, `has_variants`) and creates `product_specifications` / `product_reviews` when missing. Aligns with `lib/actions/storefront/products.js` and `StorefrontSyncService`.

**Storefront Operations hub (`storefront_contact_messages` / `storefront_analytics.visitors`):** Hub **Operations** tab and public storefront visitor tracking need **`storefront_contact_messages`** (contact/booking queue) and **`storefront_analytics.visitors`** with a unique **`(business_id, date)`** rollup. Apply Prisma migration **`20260618_storefront_operations_hub`** (`bun run db:migrate`) or run **`lib/db/migrations/043_storefront_operations_hub.sql`** (idempotent; reconciles legacy composite-PK `storefront_analytics`). Older **`lib/db/migrations/040_storefront_analytics_visitors.sql`** only adds `visitors` — prefer **043** or Prisma. Contact API no longer creates tables at runtime.

**Invoice stock check (`inventory_stock` does not exist):** The app uses **`products.stock`** + **`inventory_reservations`** (not legacy `inventory_stock`). If you still see that error, pull latest `InvoiceService.js`; no migration required for `inventory_stock`.

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

## Invoice payments — record payment columns

Folder: `prisma/migrations/20260606_invoice_payments_record_payment_columns/`

Adds `invoice_payments.payment_method`, `reference_number`, `transaction_id`, `gateway_response`, `notes`, and `payment_date` when missing so **`InvoicePaymentService.recordPayment`** and the payments API stop failing with **42703**. Manual copy: **`lib/db/migrations/038_invoice_payments_record_payment_columns.sql`** (includes `received_by`).

Folder: `prisma/migrations/20260607_invoice_payments_received_by/`

Adds `invoice_payments.received_by` (**TEXT**, nullable) when missing for the same INSERT path and `getPaymentsForInvoice` joins to **`user`**. Manual copy: **`lib/db/migrations/039_invoice_payments_received_by.sql`**.

---

## Development billing (no Stripe)

Set `BILLING_MODE=manual` in `.env`. See `lib/config/billingMode.js`.
