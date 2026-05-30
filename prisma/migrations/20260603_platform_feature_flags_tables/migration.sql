-- Platform admin feature flags (separate from per-business `feature_flags` in Prisma).
-- If legacy SQL created platform rows under `feature_flags` / `feature_flag_overrides`, migrate them
-- into these tables (or rename) before dropping old definitions.
CREATE TABLE IF NOT EXISTS "platform_feature_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'boolean',
    "default_value" JSONB NOT NULL DEFAULT 'false',
    "rollout_percentage" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_feature_flags_key_key" ON "platform_feature_flags"("key");
CREATE INDEX IF NOT EXISTS "platform_feature_flags_is_active_idx" ON "platform_feature_flags"("is_active");

CREATE TABLE IF NOT EXISTS "platform_feature_flag_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform_feature_flag_id" UUID NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_feature_flag_overrides_platform_feature_flag_id_fkey'
  ) THEN
    ALTER TABLE "platform_feature_flag_overrides"
      ADD CONSTRAINT "platform_feature_flag_overrides_platform_feature_flag_id_fkey"
      FOREIGN KEY ("platform_feature_flag_id") REFERENCES "platform_feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_feature_flag_overrides_flag_target_key"
  ON "platform_feature_flag_overrides"("platform_feature_flag_id", "target_type", "target_id");

CREATE INDEX IF NOT EXISTS "platform_feature_flag_overrides_target_idx"
  ON "platform_feature_flag_overrides"("target_type", "target_id");

CREATE INDEX IF NOT EXISTS "platform_feature_flag_overrides_flag_idx"
  ON "platform_feature_flag_overrides"("platform_feature_flag_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_feature_flag_overrides_target_type_check'
  ) THEN
    ALTER TABLE "platform_feature_flag_overrides"
      ADD CONSTRAINT "platform_feature_flag_overrides_target_type_check"
      CHECK ("target_type" IN ('business', 'user'));
  END IF;
END $$;

-- Optional seed rows (aligns with legacy admin seed keys; safe on re-run)
INSERT INTO "platform_feature_flags" ("key", "name", "description", "type", "default_value", "rollout_percentage", "is_active")
VALUES
  ('new_dashboard_ui', 'New Dashboard UI', 'Modern redesigned dashboard interface', 'boolean', 'true'::jsonb, 100, true),
  ('beta_ai_features', 'Beta AI Features', 'Experimental AI analytics features', 'boolean', 'false'::jsonb, 0, true),
  ('advanced_reporting', 'Advanced Reporting', 'Enhanced reporting capabilities', 'boolean', 'false'::jsonb, 100, true),
  ('mobile_app_beta', 'Mobile App Beta', 'Beta access to mobile application', 'boolean', 'false'::jsonb, 0, true),
  ('whatsapp_integration', 'WhatsApp Integration', 'WhatsApp Business API features', 'boolean', 'false'::jsonb, 0, true)
ON CONFLICT ("key") DO NOTHING;
