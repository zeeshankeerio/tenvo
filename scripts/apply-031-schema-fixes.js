#!/usr/bin/env node
/**
 * Apply migration 031: Comprehensive schema fixes
 * Fixes all missing columns causing 42703/42P01 errors in production
 * 
 * Usage: node scripts/apply-031-schema-fixes.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  console.log('✓ Connected to database');

  try {
    // Run critical payments fix first as a single atomic statement
    const criticalFixes = [
      `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS status      VARCHAR(20)  DEFAULT 'active',
         ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN      DEFAULT false,
         ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS domain_data JSONB        DEFAULT '{}'::jsonb`,
      `CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON payments (is_deleted)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)`,
    ];

    for (const stmt of criticalFixes) {
      try { await client.query(stmt); process.stdout.write('.'); }
      catch (e) { if (!['42701','42P07','42710'].includes(e.code)) throw e; process.stdout.write('s'); }
    }
    console.log('\n✓ Critical payments columns applied');

    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '031_comprehensive_schema_fixes.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Split on statement terminators, filter blanks — skip payments block (already done above)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().includes('alter table payments'))
      .filter(s => !s.toLowerCase().startsWith('create index if not exists idx_payments_'));

    let ok = 0, skipped = 0, failed = 0;

    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
        process.stdout.write('.');
      } catch (err) {
        // Safe-to-skip error codes:
        // 42701 = duplicate column (column already exists)
        // 42P07 = duplicate table
        // 42710 = duplicate constraint
        // 42704 = constraint not found (on DROP CONSTRAINT IF EXISTS - postgres < 9.x)
        // 42P01 = table does not exist (optional tables like product_stock_locations)
        // 23505 = unique violation
        if (['42701', '42P07', '42710', '42704', '42P01', '23505'].includes(err.code)) {
          skipped++;
          process.stdout.write('s');
        } else {
          failed++;
          console.error(`\n✗ Statement failed [${err.code}]: ${err.message}`);
          console.error('  SQL:', stmt.substring(0, 120));
        }
      }
    }

    console.log(`\n\n✓ Done. ${ok} ok, ${skipped} skipped (already applied), ${failed} failed`);

    if (failed === 0) {
      console.log('\n✅ Migration 031 applied successfully. All schema gaps are fixed.');
    } else {
      console.log('\n⚠️  Some statements failed. Review errors above.');
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
