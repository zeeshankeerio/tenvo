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
  // restaurant_orders — add payment tracking columns
  `ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`,
  `ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
  `ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
  `ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(12,2) DEFAULT 0`,
  // restaurant_order_items — ensure unit_price allows 0
  `ALTER TABLE restaurant_order_items ALTER COLUMN unit_price SET DEFAULT 0`,
  // indexes
  `CREATE INDEX IF NOT EXISTS idx_restaurant_orders_payment_status ON restaurant_orders(business_id, payment_status)`,
  `CREATE INDEX IF NOT EXISTS idx_restaurant_orders_status_biz     ON restaurant_orders(business_id, status)`,
];

const SAFE = new Set(['42701', '42P07', '42710', '42704', '42P01']);

async function run() {
  const client = await pool.connect();
  console.log('✓ Connected');
  let ok = 0, skip = 0, fail = 0;
  for (const sql of STMTS) {
    try {
      await client.query(sql);
      process.stdout.write('.');
      ok++;
    } catch (e) {
      if (SAFE.has(e.code)) { process.stdout.write('s'); skip++; }
      else { console.error(`\n✗ [${e.code}] ${e.message}`); fail++; }
    }
  }
  client.release();
  await pool.end();
  console.log(`\n\n${ok} applied, ${skip} skipped, ${fail} failed`);
  if (fail === 0) console.log('✅ restaurant_orders schema up to date');
  else process.exit(1);
}

run();
