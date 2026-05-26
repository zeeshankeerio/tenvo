#!/usr/bin/env node
/**
 * Apply all unapplied prisma/manual migrations in order.
 * Runs each file as a single query (no semicolon splitting) so
 * DO $$ ... END $$ and BEGIN/COMMIT blocks work correctly.
 *
 * Usage: node scripts/apply-all-migrations.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
dotenv.config({ path: join(ROOT, '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// Ordered list of migration files to apply
const MIGRATIONS = [
  // prisma/migrations
  'prisma/migrations/fix_floating_stock.sql',       // prerequisite: fixes NULL warehouse_id
  'prisma/migrations/20260205_schema_hardening.sql',
  'prisma/migrations/20260303_child_tables_business_id_hardening.sql',
  'prisma/migrations/20260303_child_tables_business_id_enforce_not_null.sql',
  'prisma/migrations/manual_add_sales_orders_challans_payments.sql',
  'prisma/migrations/20260517_audit_fixes/migration.sql',
  // supabase/migrations (key ones)
  'supabase/migrations/031_comprehensive_schema_fixes.sql',
  // inline: inventory_reservations missing columns (warehouse_id, reference, reference_type, reference_id)
  // Applied via scripts/fix-inventory-reservations.js
];

async function applyFile(client, relPath) {
  const filePath = join(ROOT, relPath);
  if (!existsSync(filePath)) {
    console.log(`  ⚠ SKIP (not found): ${relPath}`);
    return 'skipped';
  }
  const sql = readFileSync(filePath, 'utf8');
  try {
    await client.query(sql);
    return 'ok';
  } catch (err) {
    // These codes mean the change already exists — safe to ignore
    const safeCodePatterns = [
      '42701', // duplicate column
      '42P07', // duplicate table
      '42710', // duplicate constraint/object
      '42704', // constraint not found on DROP
      '23505', // unique violation
    ];
    if (safeCodePatterns.includes(err.code)) {
      return 'skipped (already applied)';
    }
    throw err;
  }
}

async function run() {
  const client = await pool.connect();
  console.log('✓ Connected to database\n');

  let ok = 0, skipped = 0, failed = 0;

  for (const relPath of MIGRATIONS) {
    process.stdout.write(`  Applying ${basename(relPath, '.sql')}... `);
    try {
      const result = await applyFile(client, relPath);
      if (result === 'ok') {
        console.log('✓');
        ok++;
      } else {
        console.log(result);
        skipped++;
      }
    } catch (err) {
      console.log(`✗ FAILED [${err.code}]: ${err.message.split('\n')[0]}`);
      failed++;
    }
  }

  client.release();
  await pool.end();

  console.log(`\n────────────────────────────────────`);
  console.log(`✓ ${ok} applied  |  ~ ${skipped} skipped  |  ✗ ${failed} failed`);

  if (failed === 0) {
    console.log('\n✅ All migrations applied. Schema is fully up to date.');
  } else {
    console.log('\n⚠️  Some migrations failed — check errors above.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
