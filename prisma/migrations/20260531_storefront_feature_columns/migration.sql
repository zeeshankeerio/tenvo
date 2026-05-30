-- Storefront: full-feature columns aligned with app expectations (categories + product FK + toggle flag)

-- product_categories: imagery, hierarchy, manual sort order
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "parent_id" UUID;
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "product_categories"
      ADD CONSTRAINT "product_categories_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_product_categories_business_parent"
  ON "product_categories" ("business_id", "parent_id");

-- products: link inventory rows to taxonomy for storefront counts / navigation
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_products_business_category_id"
  ON "products" ("business_id", "category_id");

-- business_settings: explicit flag (kept in sync with settings.storefront.enabled in application code)
ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "is_storefront_enabled" BOOLEAN NOT NULL DEFAULT true;
