#!/usr/bin/env node

/**
 * Test Pool Connection
 * Verifies that the pool from lib/db.js can connect and query
 */

import 'dotenv/config';
import pool from '../lib/db.js';

async function testConnection() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Testing Pool Connection');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const client = await pool.connect();
    
    try {
        console.log('✅ Pool connection successful\n');
        
        // Get connection info
        console.log('📊 Connection Info:');
        console.log('   Database:', client.database || 'unknown');
        console.log('   Host:', client.host || 'unknown');
        console.log('   Port:', client.port || 'unknown');
        console.log('   User:', client.user || 'unknown');
        console.log('');
        
        // Test query for demo-boutique
        console.log('🔍 Testing query for demo-boutique...\n');
        
        const result = await client.query(`
            SELECT
                b.id, b.business_name, b.domain, b.is_active,
                COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled
            FROM businesses b
            LEFT JOIN business_settings bs ON b.id = bs.business_id
            WHERE LOWER(b.domain) = $1 AND COALESCE(b.is_active, true) = true
        `, ['demo-boutique']);
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log('✅ Found demo-boutique:');
            console.log('   ID:', row.id);
            console.log('   Name:', row.business_name);
            console.log('   Domain:', row.domain);
            console.log('   Active:', row.is_active);
            console.log('   Storefront Enabled:', row.is_storefront_enabled);
            console.log('');
            
            if (!row.is_storefront_enabled) {
                console.log('⚠️  WARNING: Storefront is DISABLED for demo-boutique');
                console.log('   This will cause 404 errors in API routes\n');
            } else {
                console.log('✅ Storefront is ENABLED - should work!\n');
            }
        } else {
            console.log('❌ demo-boutique NOT FOUND in this database');
            console.log('   This explains the 404 errors!\n');
            
            console.log('🔍 Checking what businesses exist...\n');
            const allBiz = await client.query(`
                SELECT domain, business_name 
                FROM businesses 
                WHERE domain LIKE 'demo-%' 
                LIMIT 5
            `);
            
            if (allBiz.rows.length > 0) {
                console.log('   Found these demo stores:');
                allBiz.rows.forEach(b => {
                    console.log(`   - ${b.domain} (${b.business_name})`);
                });
                console.log('');
                console.log('⚠️  But demo-boutique is NOT in this database!');
                console.log('   You might be connected to a DIFFERENT database than expected.\n');
            } else {
                console.log('   No demo stores found at all in this database.\n');
            }
        }
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('   Test Complete');
        console.log('═══════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

testConnection();
