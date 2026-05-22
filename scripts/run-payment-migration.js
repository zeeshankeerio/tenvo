/**
 * Payment System Migration Runner
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('[Payment Migration] Starting...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'db', 'migrations', 'add_payment_system.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('[Payment Migration] ✅ Completed successfully');
    
    // Verify tables created
    const tables = [
      'business_payment_methods',
      'payment_transactions',
      'stripe_connect_accounts',
      'store_payment_settings',
      'customer_payment_methods'
    ];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`[Payment Migration] ✅ Table ${table} verified`);
      } else {
        console.error(`[Payment Migration] ❌ Table ${table} missing`);
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Payment Migration] ❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
