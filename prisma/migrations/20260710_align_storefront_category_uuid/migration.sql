-- Align live storefront schema with Prisma expectations.
-- Fixes drift where:
--   1) business_settings.is_storefront_enabled was never added (legacy integer-id table)
--   2) product_categories.id remained SERIAL while products.category_id is UUID
--      (JOIN p.category_id = c.id → "operator does not exist: uuid = integer")

-- ---------------------------------------------------------------------------
-- 1) business_settings.is_storefront_enabled
-- ---------------------------------------------------------------------------
ALTER TABLE "business_settings"
  ADD COLUMN IF NOT EXISTS "is_storefront_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Backfill from JSON toggles when present (legacy storefront_settings and/or settings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_settings'
      AND column_name = 'storefront_settings'
  ) THEN
    EXECUTE $sql$
      UPDATE business_settings AS bs
      SET is_storefront_enabled = COALESCE(
        CASE
          WHEN bs.storefront_settings ? 'enabled'
            THEN (bs.storefront_settings->>'enabled')::boolean
          ELSE NULL
        END,
        CASE
          WHEN bs.settings->'storefront' ? 'enabled'
            THEN (bs.settings->'storefront'->>'enabled')::boolean
          WHEN bs.settings ? 'enabled'
            THEN (bs.settings->>'enabled')::boolean
          ELSE NULL
        END,
        true
      )
    $sql$;
  ELSE
    UPDATE business_settings AS bs
    SET is_storefront_enabled = COALESCE(
      CASE
        WHEN bs.settings->'storefront' ? 'enabled'
          THEN (bs.settings->'storefront'->>'enabled')::boolean
        WHEN bs.settings ? 'enabled'
          THEN (bs.settings->>'enabled')::boolean
        ELSE NULL
      END,
      true
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) product_categories: INTEGER id/parent_id → UUID (Prisma + products.category_id)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  id_type text;
  parent_type text;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'product_categories'
    AND column_name = 'id';

  IF id_type IS NULL THEN
    RAISE NOTICE 'product_categories missing; skip category uuid align';
    RETURN;
  END IF;

  IF id_type IN ('integer', 'bigint', 'smallint') THEN
    -- Drop self-FK / PK so type changes can proceed
    ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_parent_id_fkey";
    ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_pkey";

    -- parent_id first (no longer referenced as FK)
    SELECT data_type INTO parent_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_categories'
      AND column_name = 'parent_id';

    IF parent_type IN ('integer', 'bigint', 'smallint') THEN
      -- Hierarchy links cannot be preserved across int→uuid; clear then convert
      UPDATE "product_categories" SET "parent_id" = NULL;
      ALTER TABLE "product_categories"
        ALTER COLUMN "parent_id" DROP DEFAULT;
      ALTER TABLE "product_categories"
        ALTER COLUMN "parent_id" TYPE UUID USING NULL;
    ELSIF parent_type IS NULL THEN
      ALTER TABLE "product_categories"
        ADD COLUMN "parent_id" UUID;
    END IF;

    ALTER TABLE "product_categories" ALTER COLUMN "id" DROP DEFAULT;
    -- Empty or legacy int rows get fresh UUIDs (products.category_id already UUID and was unjoinable)
    ALTER TABLE "product_categories"
      ALTER COLUMN "id" TYPE UUID USING gen_random_uuid();
    ALTER TABLE "product_categories"
      ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    ALTER TABLE "product_categories"
      ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");

    -- Drop owned serial if still present
    DROP SEQUENCE IF EXISTS "product_categories_id_seq" CASCADE;
  END IF;

  -- Ensure parent_id is UUID when id already is
  SELECT data_type INTO parent_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'product_categories'
    AND column_name = 'parent_id';

  IF parent_type IN ('integer', 'bigint', 'smallint') THEN
    ALTER TABLE "product_categories" DROP CONSTRAINT IF EXISTS "product_categories_parent_id_fkey";
    UPDATE "product_categories" SET "parent_id" = NULL;
    ALTER TABLE "product_categories" ALTER COLUMN "parent_id" DROP DEFAULT;
    ALTER TABLE "product_categories" ALTER COLUMN "parent_id" TYPE UUID USING NULL;
  ELSIF parent_type IS NULL THEN
    ALTER TABLE "product_categories" ADD COLUMN "parent_id" UUID;
  END IF;
END $$;

-- Ensure supporting columns from 20260531 exist
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "product_categories"
      ADD CONSTRAINT "product_categories_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_product_categories_business_parent"
  ON "product_categories" ("business_id", "parent_id");

-- ---------------------------------------------------------------------------
-- 3) products.category_id must be UUID + FK to product_categories
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  cat_type text;
BEGIN
  SELECT data_type INTO cat_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'category_id';

  IF cat_type IS NULL THEN
    ALTER TABLE "products" ADD COLUMN "category_id" UUID;
  ELSIF cat_type IN ('integer', 'bigint', 'smallint') THEN
    -- Cannot map int→uuid; drop and recreate as UUID (links already broken vs UUID categories)
    ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_category_id_fkey";
    ALTER TABLE "products" DROP COLUMN "category_id";
    ALTER TABLE "products" ADD COLUMN "category_id" UUID;
  END IF;
END $$;

-- Clear orphan category refs that cannot join
UPDATE "products" p
SET "category_id" = NULL
WHERE p."category_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "product_categories" c WHERE c."id" = p."category_id"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "product_categories"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_products_business_category_id"
  ON "products" ("business_id", "category_id");
