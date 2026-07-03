-- Superseded by lib/db/migrations/043_storefront_operations_hub.sql and
-- prisma/migrations/20260618_storefront_operations_hub (kept for older manual runs).
ALTER TABLE storefront_analytics ADD COLUMN IF NOT EXISTS visitors INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS storefront_analytics_business_id_date_key
  ON storefront_analytics (business_id, date);
