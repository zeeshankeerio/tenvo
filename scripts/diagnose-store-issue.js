#!/usr/bin/env node
/**
 * Diagnostic script for storefront 404 issues
 * Run: node scripts/diagnose-store-issue.js [business-domain]
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function diagnose() {
  const domain = process.argv[2] || 'foodies';
  const client = await pool.connect();

  console.log('========================================');
  console.log(`Diagnosing store: "${domain}"`);
  console.log('========================================\n');

  try {
    // 1. Check businesses table structure
    console.log('1. Checking businesses table columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'businesses'
      ORDER BY ordinal_position
    `);
    console.log('   Columns found:', columnsResult.rows.map(r => r.column_name).join(', '));

    // Check for domain and is_active columns
    const hasDomain = columnsResult.rows.some(r => r.column_name === 'domain');
    const hasIsActive = columnsResult.rows.some(r => r.column_name === 'is_active');

    if (!hasDomain) {
      console.log('   ERROR: "domain" column is missing!');
    }
    if (!hasIsActive) {
      console.log('   WARNING: "is_active" column is missing!');
    }

    // 2. Check if business exists
    console.log('\n2. Checking for business with domain...');
    const businessResult = await client.query(`
      SELECT id, business_name, domain, is_active, category, created_at
      FROM businesses
      WHERE LOWER(domain) = LOWER($1)
    `, [domain]);

    if (businessResult.rows.length === 0) {
      console.log(`   ERROR: No business found with domain "${domain}"`);

      // List all businesses
      console.log('\n3. Listing all businesses...');
      const allBusinesses = await client.query(`
        SELECT id, business_name, domain, is_active, category
        FROM businesses
        ORDER BY created_at DESC
        LIMIT 10
      `);
      if (allBusinesses.rows.length === 0) {
        console.log('   No businesses found in database!');
      } else {
        console.log('   Recent businesses:');
        allBusinesses.rows.forEach(b => {
          console.log(`   - ${b.business_name} (domain: ${b.domain}, active: ${b.is_active})`);
        });
      }
    } else {
      const business = businessResult.rows[0];
      console.log(`   FOUND: ${business.business_name}`);
      console.log(`   - ID: ${business.id}`);
      console.log(`   - Domain: ${business.domain}`);
      console.log(`   - Is Active: ${business.is_active}`);
      console.log(`   - Category: ${business.category}`);

      // 3. Check if is_active is NULL
      if (business.is_active === null) {
        console.log('\n   WARNING: is_active is NULL - this will cause 404 errors!');
        console.log('   Fixing by setting is_active = true...');
        await client.query(`
          UPDATE businesses SET is_active = true WHERE id = $1
        `, [business.id]);
        console.log('   FIXED: is_active set to true');
      } else if (business.is_active === false) {
        console.log('\n   WARNING: Business is inactive (is_active = false)');
        console.log('   This will cause 404 errors for the storefront.');
      }

      // 4. Check product_categories table
      console.log('\n4. Checking product_categories table...');
      const catResult = await client.query(`
        SELECT COUNT(*) as count FROM product_categories WHERE business_id = $1
      `, [business.id]);
      console.log(`   Product categories for this business: ${catResult.rows[0].count}`);

      // 5. Check products
      console.log('\n5. Checking products...');
      const prodResult = await client.query(`
        SELECT COUNT(*) as count FROM products WHERE business_id = $1 AND is_active = true
      `, [business.id]);
      console.log(`   Active products for this business: ${prodResult.rows[0].count}`);

      // 6. Test storefront query
      console.log('\n6. Testing storefront query...');
      const normalizedDomain = domain.toLowerCase().trim();
      const altDomain = normalizedDomain.replace(/-/g, '_');
      const altDomain2 = normalizedDomain.replace(/_/g, '-');

      const storeResult = await client.query(`
        SELECT b.id, b.business_name, b.domain, b.is_active, b.category
        FROM businesses b
        WHERE LOWER(b.domain) = ANY($1) AND b.is_active = true
      `, [[normalizedDomain, altDomain, altDomain2]]);

      if (storeResult.rows.length > 0) {
        console.log('   SUCCESS: Storefront query returns result');
      } else {
        console.log('   ERROR: Storefront query returns no results');
        console.log('   This is likely due to is_active being NULL or false');
      }
    }

    console.log('\n========================================');
    console.log('Diagnosis complete');
    console.log('========================================');

  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnose();
