-- Align gl_accounts with app usage (createGLAccountAction / updateGLAccountAction / Chart of Accounts UI).
ALTER TABLE "gl_accounts" ADD COLUMN IF NOT EXISTS "sub_type" VARCHAR(100);
ALTER TABLE "gl_accounts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();

-- Backfill updated_at for existing rows (Prisma @updatedAt keeps this fresh on writes).
UPDATE "gl_accounts" SET "updated_at" = COALESCE("updated_at", "created_at", NOW()) WHERE "updated_at" IS NULL;
