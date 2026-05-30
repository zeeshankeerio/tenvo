-- Line-item identifiers for storefront orders (reports, order lookup, exports)
ALTER TABLE "storefront_order_items" ADD COLUMN IF NOT EXISTS "product_sku" VARCHAR(255);
ALTER TABLE "storefront_order_items" ADD COLUMN IF NOT EXISTS "variant_id" UUID;

-- Backfill from JSON metadata written before these columns existed
UPDATE "storefront_order_items" oi
SET "product_sku" = NULLIF(TRIM(COALESCE(oi.metadata->>'product_sku', oi.metadata->>'sku')), '')
WHERE (oi."product_sku" IS NULL OR TRIM(oi."product_sku") = '')
  AND oi.metadata IS NOT NULL
  AND NULLIF(TRIM(COALESCE(oi.metadata->>'product_sku', oi.metadata->>'sku')), '') IS NOT NULL;

UPDATE "storefront_order_items" oi
SET "variant_id" = (oi.metadata->>'variant_id')::uuid
WHERE oi."variant_id" IS NULL
  AND oi.metadata IS NOT NULL
  AND (oi.metadata->>'variant_id') ~ '^[0-9a-fA-F-]{36}$';

CREATE INDEX IF NOT EXISTS "idx_storefront_order_items_variant_id"
  ON "storefront_order_items" ("variant_id")
  WHERE "variant_id" IS NOT NULL;
