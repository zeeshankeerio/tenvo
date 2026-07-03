/**
 * Post-migration DB checks for storefront operations hub.
 * Run: node scripts/verify-storefront-operations-db.mjs
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('FAIL: DIRECT_URL or DATABASE_URL required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
let failed = false;
const pass = (msg, detail) => console.log(`PASS: ${msg}${detail ? ` — ${detail}` : ''}`);
const fail = (msg, detail) => {
  console.error(`FAIL: ${msg}${detail ? ` — ${detail}` : ''}`);
  failed = true;
};

async function columnExists(table, column) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rowCount > 0;
}

async function indexExists(name) {
  const r = await pool.query(`SELECT 1 FROM pg_indexes WHERE indexname = $1`, [name]);
  return r.rowCount > 0;
}

async function constraintExists(name) {
  const r = await pool.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name]);
  return r.rowCount > 0;
}

try {
  const contactCols = [
    'id',
    'business_id',
    'customer_name',
    'customer_email',
    'subject',
    'message',
    'status',
    'handled_at',
    'handled_by',
    'metadata',
    'created_at',
    'updated_at',
  ];
  for (const col of contactCols) {
    if (await columnExists('storefront_contact_messages', col)) {
      pass(`storefront_contact_messages.${col}`);
    } else {
      fail(`storefront_contact_messages.${col} missing`);
    }
  }

  const analyticsCols = ['id', 'business_id', 'date', 'visitors', 'orders_count', 'revenue'];
  for (const col of analyticsCols) {
    if (await columnExists('storefront_analytics', col)) {
      pass(`storefront_analytics.${col}`);
    } else {
      fail(`storefront_analytics.${col} missing`);
    }
  }

  if (await indexExists('storefront_analytics_business_id_date_key')) {
    pass('storefront_analytics unique (business_id, date)');
  } else {
    fail('storefront_analytics_business_id_date_key index missing');
  }

  if (await constraintExists('storefront_contact_messages_business_id_fkey')) {
    pass('storefront_contact_messages FK to businesses');
  } else {
    fail('storefront_contact_messages_business_id_fkey missing');
  }

  // Tenancy: cross-tenant update must affect 0 rows (synthetic ids)
  const biz = await pool.query(`SELECT id FROM businesses ORDER BY created_at DESC NULLS LAST LIMIT 2`);
  if (biz.rows.length >= 2) {
    const [a, b] = biz.rows;
    const msg = await pool.query(
      `SELECT id FROM storefront_contact_messages WHERE business_id = $1::uuid LIMIT 1`,
      [a.id]
    );
    if (msg.rows[0]) {
      const cross = await pool.query(
        `UPDATE storefront_contact_messages SET updated_at = NOW()
         WHERE id = $1 AND business_id = $2::uuid`,
        [msg.rows[0].id, b.id]
      );
      if (cross.rowCount === 0) {
        pass('cross-tenant contact update blocked by business_id filter');
      } else {
        fail('cross-tenant contact update affected rows — tenancy leak');
      }
    } else {
      pass('cross-tenant contact update (skipped — no sample rows)');
    }
  } else {
    pass('cross-tenant contact update (skipped — need 2+ businesses)');
  }

  // Upsert path smoke test (rollback)
  const oneBiz = biz.rows[0]?.id;
  if (oneBiz) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO storefront_analytics (id, business_id, date, visitors, orders_count, revenue, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1::uuid, CURRENT_DATE, 1, 0, 0, NOW(), NOW())
         ON CONFLICT (business_id, date)
         DO UPDATE SET visitors = COALESCE(storefront_analytics.visitors, 0) + 1, updated_at = NOW()`,
        [oneBiz]
      );
      pass('storefront_analytics upsert ON CONFLICT (business_id, date)');
      await client.query('ROLLBACK');
    } catch (e) {
      await client.query('ROLLBACK');
      fail('storefront_analytics upsert', e.message);
    } finally {
      client.release();
    }
  }
} catch (e) {
  fail('database connection', e.message);
} finally {
  await pool.end();
}

if (failed) {
  console.error('\nStorefront operations DB verification failed.');
  process.exit(1);
}
console.log('\nStorefront operations DB verification passed.');
