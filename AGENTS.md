## Learned User Preferences

- When auditing or changing data paths, cross-check table and column names against `prisma/schema.prisma` and `prisma/migrations`, not assumptions from older SQL scripts.
- For security and tenancy reviews, prefer concrete file references, severities, and apply-ready fixes over high-level advice alone.

## Learned Workspace Facts

- Tenant-style isolation in this app is `business_id` scoped to `businesses`; there is no separate `tenant_id` column family across the main schema.
- Prisma migrations under `prisma/migrations` are the canonical database evolution path; `scripts/migrations` and `lib/db/migrations` are historical or manual—treat them as non-authoritative unless explicitly reconciled.
- Admin platform feature flags use `platform_feature_flags` and `platform_feature_flag_overrides`; the Prisma `feature_flags` model remains per-business toggles (`business_id`, `feature_name`) and must not be confused with platform rollout tables.
- Stripe webhooks and other cross-tenant billing writes should use `prismaBase` from `lib/db.js`, not the tenant-extended `db` client, especially for models like `stripe_webhook_events`.
- Storefront checkout for orders uses the shared `pg` pool with transactions and locked reads on variant/product rows for server-side pricing and stock consistency.
- Finance flows that post journals should use `journal_entries` and `gl_entries` shapes from the schema (e.g. via `AccountingService`), not legacy column names from abandoned SQL sketches.
- `POS` and other raw-SQL services must match Prisma column names for `pos_transaction_items` (e.g. `total_amount`, required `product_id`) to avoid runtime drift.
- `lib/db.js` documents TLS behavior for the pool via `.env.example` (`DATABASE_SSL_INSECURE`, `DATABASE_SSL_CA_PATH`, `DATABASE_SSL_DISABLE`, hosted-host heuristics).
- Platform owner detection is driven by env allowlists (`PLATFORM_OWNER_EMAILS`, plus legacy merge vars); environments must set these after moving off any in-repo defaults.
- Internal wiring notes for pool vs `prismaBase` vs `db` and related risks live in `docs/AUDIT_SCHEMA_AND_INTEGRATIONS.md`.
