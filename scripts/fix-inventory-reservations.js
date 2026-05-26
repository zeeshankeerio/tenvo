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
  `ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS warehouse_id UUID`,
  `ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS reference TEXT`,
  `ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50)`,
  `ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS reference_id UUID`,
  `ALTER TABLE inventory_reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
  `CREATE INDEX IF NOT EXISTS idx_inv_res_warehouse    ON inventory_reservations(warehouse_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_res_biz_status   ON inventory_reservations(business_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_res_expires      ON inventory_reservations(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_res_biz_ref      ON inventory_reservations(business_id, reference_type, reference_id)`,
];

const SAFE = new Set(['42701', '42P07', '42710', '42704']);

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
  if (fail === 0) console.log('✅ inventory_reservations schema is up to date');
  else process.exit(1);
}

run();
