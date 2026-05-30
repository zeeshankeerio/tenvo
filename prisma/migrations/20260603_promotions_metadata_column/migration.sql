-- Align DB with Prisma: extended promotion fields live in metadata (BOGO, bundle, filters).
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb;
