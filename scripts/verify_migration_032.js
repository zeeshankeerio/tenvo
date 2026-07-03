const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function verifyMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();

    try {
        console.log('🔍 Verifying migration 032...\n');

        // Check if created_at column exists
        const columnCheck = await client.query(`
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'product_stock_locations'
            AND column_name IN ('created_at', 'updated_at')
            ORDER BY column_name;
        `);

        console.log('📋 Columns in product_stock_locations:');
        console.table(columnCheck.rows);

        // Check if index exists
        const indexCheck = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'product_stock_locations'
            AND indexname = 'idx_product_stock_locations_created_at';
        `);

        if (indexCheck.rows.length > 0) {
            console.log('✅ Index created successfully:');
            console.log('   ', indexCheck.rows[0].indexdef);
        } else {
            console.log('⚠️  Index not found (may not be critical)');
        }

        // Count rows with created_at data
        const dataCheck = await client.query(`
            SELECT 
                COUNT(*) as total_rows,
                COUNT(created_at) as rows_with_created_at,
                COUNT(updated_at) as rows_with_updated_at
            FROM product_stock_locations;
        `);

        console.log('\n📊 Data verification:');
        console.table(dataCheck.rows);

        // Sample a few rows to verify backfill
        const sampleCheck = await client.query(`
            SELECT id, created_at, updated_at
            FROM product_stock_locations
            LIMIT 5;
        `);

        if (sampleCheck.rows.length > 0) {
            console.log('📝 Sample rows (first 5):');
            console.table(sampleCheck.rows.map(row => ({
                id: row.id.substring(0, 8) + '...',
                created_at: row.created_at?.toISOString() || 'NULL',
                updated_at: row.updated_at?.toISOString() || 'NULL'
            })));
        } else {
            console.log('ℹ️  No rows in product_stock_locations table yet');
        }

        console.log('\n✅ Migration 032 verification complete!');
        console.log('   The created_at column is now available for FIFO stock ordering.');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyMigration();
