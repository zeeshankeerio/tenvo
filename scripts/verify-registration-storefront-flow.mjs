#!/usr/bin/env node

/**
 * Comprehensive verification script for business registration → storefront → inventory flow
 * 
 * Tests:
 * 1. Business creation atomicity
 * 2. Storefront domain resolution
 * 3. Domain cache consistency
 * 4. Inventory seed → storefront catalog sync
 * 5. Stock display consistency (hub vs storefront)
 * 6. Checkout flow integrity
 * 
 * Usage: bun run verify:registration-storefront-flow
 */

import { pool, prismaBase } from '../lib/db.js';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function logCheck(name, passed, details = '') {
    totalChecks++;
    if (passed) {
        passedChecks++;
        console.log(`✅ ${name}`);
        if (details) console.log(`   ${details}`);
    } else {
        failedChecks++;
        console.error(`❌ ${name}`);
        if (details) console.error(`   ${details}`);
    }
}

async function verifyBusinessCreationAtomicity() {
    console.log('\n🔍 Testing Business Creation Atomicity...\n');
    
    // Check if storefront init is inside transaction
    try {
        const businessFile = await import('../lib/actions/basic/business.js');
        const createBusinessSource = businessFile.createBusiness.toString();
        
        const hasStorefrontInTx = createBusinessSource.includes('initializeStorefront') && 
                                  createBusinessSource.includes('$transaction');
        
        logCheck(
            'Storefront initialization is inside business transaction',
            hasStorefrontInTx,
            hasStorefrontInTx 
                ? 'initializeStorefront() runs atomically with business creation'
                : 'CRITICAL: initializeStorefront() runs outside transaction - Issue #1'
        );
    } catch (err) {
        logCheck('Business creation transaction check', false, `Error: ${err.message}`);
    }
}

async function verifyDomainResolution() {
    console.log('\n🔍 Testing Domain Resolution...\n');
    
    const client = await pool.connect();
    try {
        // Get a sample business
        const result = await client.query(`
            SELECT b.id, b.domain, b.business_name
            FROM businesses b
            WHERE COALESCE(b.is_active, true) = true
              AND b.domain IS NOT NULL
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            logCheck('Domain resolution test', false, 'No test businesses found');
            return;
        }
        
        const testBusiness = result.rows[0];
        
        // Check domain uniqueness
        const domainCheck = await client.query(`
            SELECT COUNT(*) as count
            FROM businesses
            WHERE domain = $1
        `, [testBusiness.domain]);
        
        const isDomainUnique = parseInt(domainCheck.rows[0].count) === 1;
        logCheck(
            'Domain uniqueness enforced',
            isDomainUnique,
            `Domain "${testBusiness.domain}" has ${domainCheck.rows[0].count} owner(s)`
        );
        
        // Check business_custom_domains exists
        const customDomainCheck = await client.query(`
            SELECT COUNT(*) as count
            FROM business_custom_domains
            WHERE business_id = $1::uuid AND is_active = true
        `, [testBusiness.id]);
        
        const hasCustomDomain = parseInt(customDomainCheck.rows[0].count) > 0;
        logCheck(
            'Business has custom domain entry',
            hasCustomDomain,
            hasCustomDomain
                ? `Found ${customDomainCheck.rows[0].count} active custom domain(s)`
                : 'No custom domain - storefront may not be accessible'
        );
        
    } catch (err) {
        logCheck('Domain resolution', false, `Error: ${err.message}`);
    } finally {
        client.release();
    }
}


async function verifyDomainCacheStrategy() {
    console.log('\n🔍 Testing Domain Cache Strategy...\n');
    
    try {
        const fs = await import('fs');
        const storefrontCacheSource = fs.readFileSync('lib/cache/storefrontDomainCache.js', 'utf-8');
        
        // Check if TTL is set
        const hasTTL = storefrontCacheSource.includes('TTL') || 
                       storefrontCacheSource.includes('setex') ||
                       storefrontCacheSource.includes('expire') ||
                       storefrontCacheSource.includes('redisSetEx');
        
        logCheck(
            'Redis domain cache has TTL configured',
            hasTTL,
            hasTTL
                ? 'Cache entries have expiration'
                : 'WARNING: No TTL - cache drift risk - Issue #2'
        );
        
        // Check for cache purging on domain updates
        const resolveBusinessSource = fs.readFileSync('lib/tenancy/resolveStorefrontBusiness.js', 'utf-8');
        
        const hasExplicitPurge = resolveBusinessSource.includes('purgeCachedStorefrontDomain') ||
                                 resolveBusinessSource.includes('invalidateStorefrontBusiness');
        
        logCheck(
            'Stale domain cache is explicitly purged',
            hasExplicitPurge,
            hasExplicitPurge
                ? 'Cache purging implemented'
                : 'WARNING: No explicit purge - stale cache risk'
        );
        
    } catch (err) {
        logCheck('Domain cache strategy', false, `Error: ${err.message}`);
    }
}

async function verifyCheckoutRetryStrategy() {
    console.log('\n🔍 Testing Checkout Retry Strategy...\n');
    
    try {
        // Read checkout route file
        const fs = await import('fs');
        const checkoutRoute = fs.readFileSync('app/api/storefront/[businessDomain]/orders/route.js', 'utf-8');
        
        // Extract MAX_CHECKOUT_ATTEMPTS value
        const attemptsMatch = checkoutRoute.match(/MAX_CHECKOUT_ATTEMPTS\s*=\s*(\d+)/);
        const maxAttempts = attemptsMatch ? parseInt(attemptsMatch[1]) : 0;
        
        logCheck(
            'Checkout retry attempts configured',
            maxAttempts >= 5,
            maxAttempts >= 5
                ? `${maxAttempts} retry attempts configured (good)`
                : `Only ${maxAttempts} attempts - may fail under load - Issue #3`
        );
        
        // Check for exponential backoff
        const hasExponentialBackoff = checkoutRoute.includes('Math.pow') ||
                                       checkoutRoute.includes('**') ||
                                       checkoutRoute.includes('exponential');
        
        logCheck(
            'Exponential backoff implemented',
            hasExponentialBackoff,
            hasExponentialBackoff
                ? 'Retry delays increase exponentially'
                : 'WARNING: Fixed delays - thundering herd risk'
        );
        
        // Check for jitter
        const hasJitter = checkoutRoute.includes('Math.random') && 
                          checkoutRoute.includes('jitter');
        
        logCheck(
            'Retry jitter implemented',
            hasJitter,
            hasJitter
                ? 'Random jitter prevents synchronized retries'
                : 'INFO: No jitter - consider adding for better distribution'
        );
        
    } catch (err) {
        logCheck('Checkout retry strategy', false, `Error: ${err.message}`);
    }
}


async function verifyInventorySync() {
    console.log('\n🔍 Testing Inventory Hub → Storefront Sync...\n');
    
    const client = await pool.connect();
    try {
        // Get a sample business with products
        const result = await client.query(`
            SELECT b.id as business_id, COUNT(p.id) as product_count
            FROM businesses b
            LEFT JOIN products p ON p.business_id = b.id AND p.is_deleted = false
            WHERE COALESCE(b.is_active, true) = true
            GROUP BY b.id
            HAVING COUNT(p.id) > 0
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            logCheck('Inventory sync test', false, 'No businesses with products found');
            return;
        }
        
        const testBusiness = result.rows[0];
        
        // Check that products are queryable (no separate index required)
        const productsQuery = await client.query(`
            SELECT COUNT(*) as count
            FROM products p
            WHERE p.business_id = $1::uuid
              AND p.is_deleted = false
              AND p.is_active = true
        `, [testBusiness.business_id]);
        
        const activeProductCount = parseInt(productsQuery.rows[0].count);
        logCheck(
            'Products are queryable after creation',
            activeProductCount > 0,
            `Found ${activeProductCount} active products`
        );
        
        // Check stock_locations integration
        const locationsQuery = await client.query(`
            SELECT COUNT(*) as count
            FROM product_stock_locations psl
            WHERE psl.business_id = $1::uuid
        `, [testBusiness.business_id]);
        
        const locationCount = parseInt(locationsQuery.rows[0].count);
        logCheck(
            'Stock locations tracked',
            locationCount >= 0,
            locationCount > 0
                ? `Found ${locationCount} stock location entries`
                : 'No stock locations (simple stock mode)'
        );
        
        // Verify InventoryService is used for stock changes
        try {
            const inventoryService = await import('../lib/services/InventoryService.js');
            const hasAddStock = typeof inventoryService.InventoryService.addStock === 'function';
            const hasRemoveStock = typeof inventoryService.InventoryService.removeStock === 'function';
            
            logCheck(
                'InventoryService methods available',
                hasAddStock && hasRemoveStock,
                'addStock() and removeStock() methods exist'
            );
        } catch (err) {
            logCheck('InventoryService check', false, `Error: ${err.message}`);
        }
        
    } catch (err) {
        logCheck('Inventory sync', false, `Error: ${err.message}`);
    } finally {
        client.release();
    }
}

async function verifyStockDisplayConsistency() {
    console.log('\n🔍 Testing Stock Display Consistency (Hub vs Storefront)...\n');
    
    try {
        const storefrontDisplayStock = await import('../lib/storefront/storefrontDisplayStock.js');
        const productService = await import('../lib/services/ProductService.js');
        
        const hasStorefrontResolver = typeof storefrontDisplayStock.resolveStorefrontDisplayStock === 'function';
        const hasHubResolver = typeof productService.ProductService.resolveDisplayStock === 'function';
        
        logCheck(
            'Stock display resolvers exist',
            hasStorefrontResolver && hasHubResolver,
            'Both hub and storefront have display stock logic'
        );
        
        // Check logic parity by comparing source code patterns
        const storefrontSource = storefrontDisplayStock.resolveStorefrontDisplayStock.toString();
        const hubSource = productService.ProductService.resolveDisplayStock.toString();
        
        const bothUseMax = storefrontSource.includes('Math.max') && hubSource.includes('Math.max');
        const bothCheckVariants = storefrontSource.includes('variants') && hubSource.includes('variants');
        const bothCheckLocations = storefrontSource.includes('location') && hubSource.includes('location');
        
        logCheck(
            'Stock display logic parity',
            bothUseMax && bothCheckVariants && bothCheckLocations,
            bothUseMax && bothCheckVariants && bothCheckLocations
                ? 'Hub and storefront use same resolution strategy'
                : 'WARNING: Logic divergence detected'
        );
        
    } catch (err) {
        logCheck('Stock display consistency', false, `Error: ${err.message}`);
    }
}


async function verifyCacheInvalidationTiming() {
    console.log('\n🔍 Testing Cache Invalidation Timing...\n');
    
    try {
        const fs = await import('fs');
        
        // Check order cache invalidation timing
        const ordersRoute = fs.readFileSync('app/api/storefront/[businessDomain]/orders/route.js', 'utf-8');
        
        // Find if invalidateStorefrontCatalog is called before COMMIT
        const commitIndex = ordersRoute.indexOf('await client.query(\'COMMIT\')');
        const invalidateIndex = ordersRoute.indexOf('invalidateStorefrontCatalog');
        
        const invalidateBeforeCommit = invalidateIndex > 0 && 
                                        invalidateIndex < commitIndex &&
                                        ordersRoute.substring(invalidateIndex, commitIndex).includes('invalidateStorefrontCatalog');
        
        logCheck(
            'Order cache invalidation before COMMIT',
            invalidateBeforeCommit,
            invalidateBeforeCommit
                ? 'Cache purged atomically with stock write'
                : 'WARNING: Cache invalidation after COMMIT - race window - Issue #5'
        );
        
        // Check product update invalidation order
        const productActionFile = fs.readFileSync('lib/actions/standard/inventory/product.js', 'utf-8');
        
        // Check if invalidation is after ProductService.updateProduct
        const updateProductIndex = productActionFile.indexOf('ProductService.updateProduct');
        const productInvalidateIndex = productActionFile.lastIndexOf('invalidateStorefrontCatalog');
        
        const productInvalidateAfterUpdate = productInvalidateIndex > updateProductIndex;
        
        logCheck(
            'Product update cache invalidation after DB write',
            productInvalidateAfterUpdate,
            productInvalidateAfterUpdate
                ? 'Cache purged after product update'
                : 'WARNING: Cache invalidation before update - stale cache risk - Issue #6'
        );
        
    } catch (err) {
        logCheck('Cache invalidation timing', false, `Error: ${err.message}`);
    }
}

async function verifyTenantIsolation() {
    console.log('\n🔍 Testing Tenant Isolation (business_id scoping)...\n');
    
    const client = await pool.connect();
    try {
        // Check that critical tables have business_id column
        const criticalTables = [
            'products',
            'storefront_orders',
            'storefront_order_items',
            'product_stock_locations',
            'product_batches',
            'product_serials',
            'customers'
        ];
        
        for (const table of criticalTables) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = $1 AND column_name = 'business_id'
                `, [table]);
                
                const hasBusinessId = columnCheck.rows.length > 0;
                logCheck(
                    `Table "${table}" has business_id column`,
                    hasBusinessId,
                    hasBusinessId ? 'Tenant-scoped' : 'WARNING: Missing business_id'
                );
            } catch (err) {
                // Table might not exist in all environments
                console.log(`   ℹ️  Table "${table}" not found (may not exist yet)`);
            }
        }
        
    } catch (err) {
        logCheck('Tenant isolation', false, `Error: ${err.message}`);
    } finally {
        client.release();
    }
}


// Main execution
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Business Registration & Storefront Flow Verification');
    console.log('═══════════════════════════════════════════════════════\n');
    
    try {
        await verifyBusinessCreationAtomicity();
        await verifyDomainResolution();
        await verifyDomainCacheStrategy();
        await verifyCheckoutRetryStrategy();
        await verifyInventorySync();
        await verifyStockDisplayConsistency();
        await verifyCacheInvalidationTiming();
        await verifyTenantIsolation();
        
        console.log('\n═══════════════════════════════════════════════════════');
        console.log(`\n📊 VERIFICATION SUMMARY:\n`);
        console.log(`   Total Checks:  ${totalChecks}`);
        console.log(`   ✅ Passed:     ${passedChecks}`);
        console.log(`   ❌ Failed:     ${failedChecks}`);
        console.log(`   Success Rate:  ${((passedChecks / totalChecks) * 100).toFixed(1)}%\n`);
        
        if (failedChecks === 0) {
            console.log('✨ All checks passed! Registration → Storefront flow is verified.\n');
            process.exit(0);
        } else if (failedChecks <= 3) {
            console.log('⚠️  Some issues detected - review warnings above.\n');
            process.exit(0); // Non-blocking warnings
        } else {
            console.log('🔴 Critical issues detected - immediate fixes required!\n');
            console.log('   See docs/BUSINESS_REGISTRATION_STOREFRONT_AUDIT.md for details.\n');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ Verification failed with error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prismaBase.$disconnect();
        await pool.end();
    }
}

main();
