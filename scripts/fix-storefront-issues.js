#!/usr/bin/env node
/**
 * Fix storefront issues - ensures is_active is set and indexes exist
 * Run: node scripts/fix-storefront-issues.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function fix() {
  const client = await pool.connect();

  console.log('========================================');
  console.log('Fixing Storefront Issues');
  console.log('========================================\n');

  try {
    // 1. Fix NULL is_active values
    console.log('1. Setting is_active = true for NULL values...');
    const fixActiveResult = await client.query(`
      UPDATE businesses
      SET is_active = true
      WHERE is_active IS NULL
    `);
    console.log(`   Fixed ${fixActiveResult.rowCount} businesses with NULL is_active`);

    // 2. Ensure index on domain exists
    console.log('\n2. Creating domain index if needed...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_domain_lower
      ON businesses(LOWER(domain))
    `);
    console.log('   Domain index created/verified');

    // 3. Create index on is_active
    console.log('\n3. Creating is_active index if needed...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_is_active
      ON businesses(is_active)
    `);
    console.log('   is_active index created/verified');

    // 4. Verify unique constraint on domain
    console.log('\n4. Checking unique constraint on domain...');
    const constraintCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM businesses
      WHERE domain IS NOT NULL
      GROUP BY LOWER(domain)
      HAVING COUNT(*) > 1
    `);

    if (constraintCheck.rows.length > 0) {
      console.log(`   WARNING: Found ${constraintCheck.rows.length} duplicate domains`);
      console.log('   You may need to manually resolve these duplicates');
    } else {
      console.log('   No duplicate domains found');
    }

    // 5. List all active businesses with storefront URLs
    console.log('\n5. Active storefronts available:');
    const activeStores = await client.query(`
      SELECT id, business_name, domain, category, is_verified
      FROM businesses
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    if (activeStores.rows.length === 0) {
      console.log('   No active businesses found');
    } else {
      activeStores.rows.forEach(b => {
        const url = `http://localhost:3000/store/${b.domain}`;
        console.log(`   - ${b.business_name}: ${url}`);
      });
    }

    console.log('\n========================================');
    console.log('Fix complete!');
    console.log('========================================');

  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
