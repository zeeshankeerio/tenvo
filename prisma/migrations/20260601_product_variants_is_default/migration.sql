-- Storefront + catalog: default variant marker (code referenced pv.is_default before column existed)
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN DEFAULT false;

-- One default per product: earliest active, non-deleted variant
UPDATE "product_variants" SET "is_default" = false;

WITH "first_v" AS (
  SELECT DISTINCT ON ("product_id") "id"
  FROM "product_variants"
  WHERE "product_id" IS NOT NULL
    AND COALESCE("is_deleted", false) = false
  ORDER BY "product_id", "created_at" ASC NULLS LAST, "id" ASC
)
UPDATE "product_variants" "pv"
SET "is_default" = true
FROM "first_v"
WHERE "pv"."id" = "first_v"."id";

CREATE INDEX IF NOT EXISTS "idx_product_variants_product_default"
  ON "product_variants" ("product_id")
  WHERE "is_default" = true;
