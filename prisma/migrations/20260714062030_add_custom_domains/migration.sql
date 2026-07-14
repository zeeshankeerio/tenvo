-- CreateTable
CREATE TABLE IF NOT EXISTS "business_custom_domains" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "business_id" UUID NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "unique_business_custom_domain" ON "business_custom_domains"("business_id", "domain");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_custom_domains_domain" ON "business_custom_domains"("domain" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_custom_domains_business" ON "business_custom_domains"("business_id");

-- Case-insensitive unique constraint on domain (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_custom_domains_domain_lower" ON "business_custom_domains"(LOWER("domain"));

-- Only one primary domain per business (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_custom_domains_one_primary" ON "business_custom_domains"("business_id") WHERE "is_primary" = true;

-- AddForeignKey
ALTER TABLE "business_custom_domains" ADD CONSTRAINT "business_custom_domains_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_custom_domains_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_custom_domains_timestamp ON business_custom_domains;

CREATE TRIGGER update_business_custom_domains_timestamp
    BEFORE UPDATE ON business_custom_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_business_custom_domains_timestamp();
