const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local for local DATABASE_URL
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();

    try {
        console.log('🔄 Running migration 032_add_created_at_to_product_stock_locations.sql...\n');

        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '032_add_created_at_to_product_stock_locations.sql');
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found at ${migrationPath}`);
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sql);

        console.log('✅ Migration 032 completed successfully!\n');
        console.log('The product_stock_locations table now has the created_at column.');
        console.log('This fixes the "column created_at does not exist" error in order creation.\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
