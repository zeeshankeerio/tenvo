#!/usr/bin/env node
/**
 * Recreate Storefront Tables with UUID Support
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function recreate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Recreating storefront tables with UUID support...\n');
    
    // Drop existing tables if they exist (they were created with INTEGER)
    await client.query(`
      DROP TABLE IF EXISTS storefront_order_items CASCADE;
      DROP TABLE IF EXISTS storefront_orders CASCADE;
      DROP TABLE IF EXISTS product_categories CASCADE;
      DROP TABLE IF EXISTS business_custom_domains CASCADE;
      DROP TABLE IF EXISTS business_settings CASCADE;
      DROP TABLE IF EXISTS subscription_plans CASCADE;
    `);
    
    console.log('✅ Dropped old tables');
    
    // Read and execute the corrected SQL
    const sqlPath = path.join(__dirname, '..', 'lib', 'db', 'migrations', 'add_storefront_tables_v3.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Created tables with UUID support\n');
    
    // Seed default settings for existing businesses
    const seedResult = await client.query(`
      INSERT INTO business_settings (business_id, plan_tier, settings, storefront_settings)
      SELECT 
        b.id, 
        'free',
        '{"currency": "PKR", "timezone": "Asia/Karachi"}',
        '{"enabled": true}'
      FROM businesses b
      LEFT JOIN business_settings bs ON b.id = bs.business_id
      WHERE bs.id IS NULL
      RETURNING business_id
    `);
    
    console.log(`✅ Created settings for ${seedResult.rowCount} businesses`);
    
    // Verify
    const tables = [
      'subscription_plans',
      'business_settings',
      'business_custom_domains',
      'product_categories',
      'storefront_orders',
      'storefront_order_items'
    ];
    
    console.log('\n📊 Table Status:');
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        ) as exists
      `, [table]);
      const exists = result.rows[0].exists;
      
      if (exists) {
        const count = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table} (${count.rows[0].count} rows)`);
      } else {
        console.log(`   ❌ ${table}`);
      }
    }
    
    console.log('\n🎉 Storefront is ready to use!');
    console.log('   Run: bun start');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

recreate();
