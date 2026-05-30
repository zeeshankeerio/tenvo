-- SaaS billing remediation: Stripe customer on business, subscription history, webhook idempotency

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "stripe_subscription_status" VARCHAR(32);

CREATE TABLE IF NOT EXISTS "subscription_history" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "business_id" UUID NOT NULL,
  "plan_tier" VARCHAR(50),
  "status" VARCHAR(50),
  "stripe_subscription_id" VARCHAR(255),
  "effective_at" TIMESTAMPTZ DEFAULT NOW(),
  "amount_minor" INTEGER,
  "currency" VARCHAR(10),
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_subscription_history_business_created"
  ON "subscription_history" ("business_id", "created_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_history_business_id_fkey'
  ) THEN
    ALTER TABLE "subscription_history"
      ADD CONSTRAINT "subscription_history_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "stripe_event_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(128) NOT NULL,
  "business_id" UUID,
  "processed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "payload_digest" VARCHAR(128),
  "metadata" JSONB DEFAULT '{}',
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_events_stripe_event_id_key"
  ON "stripe_webhook_events" ("stripe_event_id");

CREATE INDEX IF NOT EXISTS "idx_stripe_webhook_events_type_processed"
  ON "stripe_webhook_events" ("event_type", "processed_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stripe_webhook_events_business_id_fkey'
  ) THEN
    ALTER TABLE "stripe_webhook_events"
      ADD CONSTRAINT "stripe_webhook_events_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
