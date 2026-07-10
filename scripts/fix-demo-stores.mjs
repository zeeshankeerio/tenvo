#!/usr/bin/env node

/**
 * Fix Demo Stores 404 Issue
 * 
 * Fixes demo stores that return 404 on stock API by:
 * 1. Adding missing business_custom_domains entries
 * 2. Enabling storefront if disabled
 * 3. Activating inactive stores
 * 4. Ensuring auto_approved status
 */

import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';

// Database configuration (matching lib/db.js)
function getPoolSsl() {
  if (!process.env.DATABASE_URL) return false;
  if (process.env.DATABASE_SSL_DISABLE === 'true') return false;

  const url = process.env.DATABASE_URL.toLowerCase();
  const useTls =
    url.includes('sslmode=require') ||
    url.includes('sslmode=verify-full') ||
    url.includes('sslmode=no-verify') ||
    url.includes('.neon.tech') ||
    url.includes('supabase.co') ||
    url.includes('amazonaws.com') ||
    Boolean(process.env.DATABASE_SSL_CA_PATH);

  if (!useTls) return false;

  const caPath = process.env.DATABASE_SSL_CA_PATH;
  if (caPath) {
    try {
      const ca = fs.readFileSync(caPath, 'utf8');
      return { rejectUnauthorized: true, ca };
    } catch (e) {
      console.error('[fix-demo-stores] Failed to read DATABASE_SSL_CA_PATH:', caPath, e);
      throw e;
    }
  }

  const wantStrictVerify =
    process.env.DATABASE_SSL_STRICT === 'true' || url.includes('sslmode=verify-full');

  if (wantStrictVerify) {
    return { rejectUnauthorized: true };
  }

  return { rejectUnauthorized: false };
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy',
    ssl: getPoolSsl(),
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 20000,
    maxUses: 7500,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixDemoStores() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Fixing Demo Stores 404 Issue');
    console.log('═══════════════════════════════════════════════════════\n');
    
    try {
        // 1. Find all demo stores
        console.log('🔍 Step 1: Finding demo stores...\n');
        
        const demoBusinesses = await prisma.businesses.findMany({
            where: {
                OR: [
                    { domain: { startsWith: 'demo-' } },
                    { business_name: { contains: 'Demo' } },
                ]
            },
            select: {
                id: true,
                business_name: true,
                domain: true,
                is_active: true,
                approval_status: true,
            }
        });
        
        if (demoBusinesses.length === 0) {
            console.log('⚠️  No demo stores found in database\n');
            return;
        }
        
        console.log(`✅ Found ${demoBusinesses.length} demo store(s):`);
        demoBusinesses.forEach(b => {
            const status = !b.is_active 
                ? '❌ INACTIVE' 
                : (b.approval_status !== 'approved' && b.approval_status !== 'auto_approved')
                    ? '⏳ PENDING' 
                    : '✅ ACTIVE';
            console.log(`   ${status} ${b.domain} (${b.business_name}) [${b.approval_status}]`);
        });
        console.log('');
        
        // 2. Activate and auto-approve stores
        console.log('🔧 Step 2: Activating stores and ensuring approval...\n');
        
        const reactivated = await prisma.businesses.updateMany({
            where: {
                id: { in: demoBusinesses.map(b => b.id) },
                OR: [
                    { is_active: false },
                    { approval_status: { notIn: ['approved', 'auto_approved'] } }
                ]
            },
            data: {
                is_active: true,
                approval_status: 'auto_approved',
                updated_at: new Date()
            }
        });
        
        if (reactivated.count > 0) {
            console.log(`✅ Activated and approved ${reactivated.count} store(s)`);
        } else {
            console.log(`✅ All stores are already active and approved`);
        }
        console.log('');
        
        // 3. Add missing custom domain entries
        console.log('🔧 Step 3: Adding missing custom domain entries...\n');
        
        let fixedCount = 0;
        
        for (const business of demoBusinesses) {
            // Check if custom domain exists
            const existingResults = await prisma.$queryRaw`
                SELECT id, is_active FROM business_custom_domains 
                WHERE business_id = ${business.id}::uuid AND domain = ${business.domain}
            `;
            const existing = existingResults?.[0];
            
            if (!existing) {
                await prisma.$executeRaw`
                    INSERT INTO business_custom_domains (business_id, domain, is_active, is_primary)
                    VALUES (${business.id}::uuid, ${business.domain}, true, true)
                `;
                console.log(`   ✅ Added custom domain for: ${business.domain}`);
                fixedCount++;
            } else if (!existing.is_active) {
                await prisma.$executeRaw`
                    UPDATE business_custom_domains
                    SET is_active = true, is_primary = true, updated_at = NOW()
                    WHERE id = ${existing.id}
                `;
                console.log(`   ✅ Activated custom domain for: ${business.domain}`);
                fixedCount++;
            }
        }
        
        if (fixedCount === 0) {
            console.log(`   ✅ All custom domains already configured`);
        }
        console.log('');
        
        // 4. Enable storefront
        console.log('🔧 Step 4: Enabling storefronts...\n');
        
        let storefrontFixedCount = 0;
        
        for (const business of demoBusinesses) {
            const settingsResults = await prisma.$queryRaw`
                SELECT id, storefront_settings FROM business_settings 
                WHERE business_id = ${business.id}::uuid
            `;
            const settings = settingsResults?.[0];
            
            if (!settings) {
                // Create settings if missing
                await prisma.$executeRaw`
                    INSERT INTO business_settings (business_id, settings, storefront_settings)
                    VALUES (${business.id}::uuid, '{}'::jsonb, '{"enabled": true}'::jsonb)
                `;
                console.log(`   ✅ Created settings for: ${business.domain}`);
                storefrontFixedCount++;
            } else {
                const storefrontSettings = typeof settings.storefront_settings === 'string'
                    ? JSON.parse(settings.storefront_settings)
                    : settings.storefront_settings || {};
                
                if (storefrontSettings.enabled === false) {
                    await prisma.$executeRaw`
                        UPDATE business_settings
                        SET storefront_settings = jsonb_set(COALESCE(storefront_settings, '{}'::jsonb), '{enabled}', 'true'::jsonb),
                            updated_at = NOW()
                        WHERE business_id = ${business.id}::uuid
                    `;
                    console.log(`   ✅ Enabled storefront for: ${business.domain}`);
                    storefrontFixedCount++;
                }
            }
        }
        
        if (storefrontFixedCount === 0) {
            console.log(`   ✅ All storefronts already enabled`);
        }
        console.log('');
        
        // 5. Verify product counts
        console.log('📊 Step 5: Checking product counts...\n');
        
        for (const business of demoBusinesses) {
            const productCount = await prisma.products.count({
                where: {
                    business_id: business.id,
                    is_deleted: false
                }
            });
            
            const activeCount = await prisma.products.count({
                where: {
                    business_id: business.id,
                    is_deleted: false,
                    is_active: true
                }
            });
            
            console.log(`   ${business.domain}: ${activeCount}/${productCount} active products`);
        }
        console.log('');
        
        // 6. Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('   ✅ Fix Complete!');
        console.log('═══════════════════════════════════════════════════════\n');
        
        console.log('📋 Summary:');
        console.log(`   • Found ${demoBusinesses.length} demo store(s)`);
        console.log(`   • Activated/approved ${reactivated.count} store(s)`);
        console.log(`   • Added/fixed ${fixedCount} custom domain entries`);
        console.log(`   • Fixed ${storefrontFixedCount} storefront settings\n`);
        
        console.log('🔄 Next Steps:');
        console.log('   1. Purge Redis cache:');
        console.log('      redis-cli FLUSHDB');
        console.log('   2. Clear browser cache and refresh demo stores');
        console.log('   3. Test stock API by clicking product variants\n');
        
        console.log('📝 Test URLs:');
        demoBusinesses.forEach(b => {
            console.log(`   • https://tenvo.store/store/${b.domain}`);
        });
        console.log('');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

// Run the fix
fixDemoStores();
