# Legacy SQL vs Prisma migrations

## Two different pipelines

| Location | Role |
|----------|------|
| **`prisma/migrations/*`** | **Source of truth** for schema today. Applied with `bun run db:migrate` (`prisma migrate deploy`). Prisma tracks history in `_prisma_migrations`. |
| **`scripts/migrations/*.sql`** | **Older / ad-hoc** scripts (e.g. `002_add_admin_features.sql`, `003_add_subscription_tables.sql`) from before or alongside Prisma. They are **not** run automatically by `migrate deploy`. Use only if you intentionally replay history on a blank DB or for documentation. |

Always prefer **`prisma migrate deploy`** for Supabase/Postgres so the DB matches `schema.prisma`.

---

## Error **P3009** — “failed migrations in the target database”

Example:

```text
The `20260517_audit_fixes` migration ... failed
```

Prisma blocks new migrations until that row is **resolved**.

### What happened

`20260517_audit_fixes` started, hit an error (e.g. `unique_product_warehouse_state` already exists), and Prisma recorded it as **failed**. The SQL file in the repo was later fixed to be idempotent (`DROP INDEX IF EXISTS` before `ADD CONSTRAINT`).

### Path A — Re-run the migration via Prisma (recommended)

1. Ensure the **current** `prisma/migrations/20260517_audit_fixes/migration.sql` is in your repo (with `DROP INDEX IF EXISTS unique_product_warehouse_state`).

2. Mark the failed migration as **rolled back** (does not undo SQL already applied; it only clears the failed flag so Prisma can run the migration again):

   ```bash
   bunx prisma migrate resolve --rolled-back "20260517_audit_fixes"
   ```

   On **Windows PowerShell**, use separate lines or `;` (not `&&` on older PS).

3. Apply migrations again:

   ```bash
   bun run db:migrate
   ```

Optional helper (requires `CONFIRM_REPAIR=1`):

```bash
CONFIRM_REPAIR=1 bun run db:repair:failed-audit
```

### Path B — DB already matches the migration (you fixed SQL by hand)

If every statement from `20260517_audit_fixes` is already applied and you only need Prisma to move on:

```bash
bunx prisma migrate resolve --applied "20260517_audit_fixes"
bun run db:migrate
```

### Optional — run SQL in Supabase SQL editor

If you want to align the database **before** resolve/deploy, you can execute the same steps as the migration from:

- **`repair-20260517_audit_fixes.sql`** (copy of the Prisma migration in this folder)

Then use **Path B** if everything matches, or **Path A** if you want Prisma to execute the file again.

---

## Env files

Prisma CLI loads **`.env`** then **`.env.local`** (see `prisma.config.ts`). Run commands from the **repository root**.
