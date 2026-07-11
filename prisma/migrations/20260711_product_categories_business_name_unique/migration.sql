-- Prisma product_categories @@unique([business_id, name]) — required for upserts
-- Live DB historically only had UNIQUE (business_id, slug)

-- Collapse duplicate names per business (keep lowest sort_order / earliest id)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, LOWER(TRIM(name))
      ORDER BY COALESCE(sort_order, 0), created_at NULLS LAST, id
    ) AS rn
  FROM product_categories
  WHERE name IS NOT NULL
)
UPDATE product_categories pc
SET is_active = false,
    name = LEFT(pc.name || '-dup-' || SUBSTRING(pc.id::text, 1, 8), 100),
    slug = LEFT(COALESCE(pc.slug, 'cat') || '-dup-' || SUBSTRING(pc.id::text, 1, 8), 100),
    updated_at = NOW()
FROM ranked r
WHERE pc.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_categories_business_id_name_key'
  ) THEN
    ALTER TABLE "product_categories"
      ADD CONSTRAINT "product_categories_business_id_name_key"
      UNIQUE ("business_id", "name");
  END IF;
END $$;
