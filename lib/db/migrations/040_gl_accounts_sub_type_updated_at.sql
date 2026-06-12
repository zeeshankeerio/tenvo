-- Idempotent mirror of prisma/migrations/20260609_gl_accounts_sub_type_updated_at/migration.sql
-- See docs/DATABASE_MIGRATIONS.md — prefer `bun run db:migrate` / Prisma for canonical applies.

ALTER TABLE "gl_accounts" ADD COLUMN IF NOT EXISTS "sub_type" VARCHAR(100);
ALTER TABLE "gl_accounts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();

UPDATE "gl_accounts" SET "updated_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "updated_at" IS NULL;
