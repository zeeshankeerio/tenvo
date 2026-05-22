#!/usr/bin/env node
/**
 * Run Missing Columns Migration
 * Adds missing columns for storefront functionality
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Create direct pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running missing columns migration...\n');
    
    // Read and execute migration SQL
    const migrationPath = join(__dirname, '..', 'lib', 'db', 'migrations', 'add_storefront_missing_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify columns
    const columnsResult = await client.query(`
      SELECT 
        table_name, 
        column_name
      FROM information_schema.columns 
      WHERE table_name IN ('product_variants', 'products')
      AND column_name IN ('is_default', 'category_id', 'image_url', 'sku')
      ORDER BY table_name, column_name;
    `);
    
    console.log('📋 Verified columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}.${row.column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
