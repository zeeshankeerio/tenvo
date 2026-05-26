import dotenv from 'dotenv';
import pg from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const STMTS = [
  // ── storefront_orders ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS storefront_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    order_number      VARCHAR(100) NOT NULL,
    customer_id       UUID REFERENCES customers(id),
    customer_email    VARCHAR(255),
    customer_phone    VARCHAR(50),
    customer_name     VARCHAR(255),
    shipping_address  JSONB,
    billing_address   JSONB,
    subtotal          DECIMAL(14,2) DEFAULT 0,
    tax_amount        DECIMAL(14,2) DEFAULT 0,
    shipping_amount   DECIMAL(14,2) DEFAULT 0,
    discount_amount   DECIMAL(14,2) DEFAULT 0,
    total_amount      DECIMAL(14,2) DEFAULT 0,
    currency          VARCHAR(10) DEFAULT 'PKR',
    status            VARCHAR(30) DEFAULT 'pending',
    payment_status    VARCHAR(30) DEFAULT 'pending',
    fulfillment_status VARCHAR(30) DEFAULT 'unfulfilled',
    notes             TEXT,
    metadata          JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_orders_number ON storefront_orders(business_id, order_number)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_orders_business    ON storefront_orders(business_id)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_orders_email       ON storefront_orders(customer_email)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_orders_status      ON storefront_orders(business_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_orders_created     ON storefront_orders(created_at DESC)`,

  // ── storefront_order_items ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS storefront_order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES storefront_orders(id) ON DELETE CASCADE,
    business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name  VARCHAR(500) NOT NULL,
    product_sku   VARCHAR(100),
    quantity      INTEGER DEFAULT 1,
    unit_price    DECIMAL(14,2) DEFAULT 0,
    total_price   DECIMAL(14,2) DEFAULT 0,
    tax_amount    DECIMAL(14,2) DEFAULT 0,
    variant_id    UUID,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Backfill missing columns on pre-existing storefront_order_items table
  `ALTER TABLE storefront_order_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE`,
  `ALTER TABLE storefront_order_items ADD COLUMN IF NOT EXISTS variant_id UUID`,
  // Backfill missing columns on pre-existing storefront_orders table
  `ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_order_items_order    ON storefront_order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_order_items_business ON storefront_order_items(business_id)`,
  `CREATE INDEX IF NOT EXISTS idx_storefront_order_items_product  ON storefront_order_items(product_id)`,

  // ── business_payment_methods (needed by payments.js) ────────────────────
  `CREATE TABLE IF NOT EXISTS business_payment_methods (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider       VARCHAR(50) NOT NULL,
    display_name   VARCHAR(200),
    description    TEXT,
    icon_url       TEXT,
    is_active      BOOLEAN DEFAULT true,
    is_default     BOOLEAN DEFAULT false,
    sort_order     INTEGER DEFAULT 0,
    supports_cod   BOOLEAN DEFAULT false,
    supports_cards BOOLEAN DEFAULT false,
    supports_wallet BOOLEAN DEFAULT false,
    supports_bank_transfer BOOLEAN DEFAULT false,
    fee_percentage DECIMAL(5,2) DEFAULT 0,
    fee_fixed      DECIMAL(10,2) DEFAULT 0,
    config         JSONB DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bpm_business ON business_payment_methods(business_id)`,

  // ── store_payment_settings ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS store_payment_settings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id             UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    default_currency        VARCHAR(10) DEFAULT 'PKR',
    accept_cod              BOOLEAN DEFAULT true,
    accept_cards            BOOLEAN DEFAULT false,
    stripe_publishable_key  TEXT,
    stripe_secret_key       TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── stripe_connect_accounts ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id       UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    stripe_account_id TEXT,
    status            VARCHAR(30) DEFAULT 'pending',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── Seed COD payment method for every existing business that has none ────
  `INSERT INTO business_payment_methods (business_id, provider, display_name, description, is_active, is_default, supports_cod)
   SELECT id, 'cod', 'Cash on Delivery', 'Pay when your order arrives', true, true, true
   FROM businesses
   WHERE is_active = true
     AND id NOT IN (SELECT DISTINCT business_id FROM business_payment_methods)
   ON CONFLICT DO NOTHING`,
];

const SAFE = new Set(['42701', '42P07', '42710', '42704', '23505']);

async function run() {
  const client = await pool.connect();
  console.log('✓ Connected\n');
  let ok = 0, skip = 0, fail = 0;
  for (const sql of STMTS) {
    const label = sql.trim().substring(0, 60).replace(/\s+/g, ' ');
    try {
      await client.query(sql);
      console.log(`  ✓ ${label}`);
      ok++;
    } catch (e) {
      if (SAFE.has(e.code)) {
        console.log(`  ~ ${label} (already exists)`);
        skip++;
      } else {
        console.error(`  ✗ [${e.code}] ${e.message.split('\n')[0]}`);
        console.error(`    SQL: ${label}`);
        fail++;
      }
    }
  }
  client.release();
  await pool.end();
  console.log(`\n${ok} applied, ${skip} skipped, ${fail} failed`);
  if (fail === 0) console.log('✅ Storefront tables fully set up');
  else process.exit(1);
}

run();
