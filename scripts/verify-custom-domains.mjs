#!/usr/bin/env node

/**
 * Verification script for custom domains implementation
 * 
 * Checks:
 * 1. Database table exists
 * 2. Indexes are created
 * 3. Constraints are in place
 * 4. Server actions are importable
 * 5. UI component exists
 * 6. Proxy routing is updated
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let hasErrors = false;

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.warn(`⚠️  ${message}`);
}

console.log('🔍 Verifying Custom Domains Implementation...\n');

// Create pool from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 1. Check database table
console.log('📊 Checking database schema...');
const client = await pool.connect();

try {
  // Check table exists
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'business_custom_domains'
    ) as exists;
  `);

  if (tableCheck.rows[0].exists) {
    logSuccess('business_custom_domains table exists');
  } else {
    logError('business_custom_domains table NOT found');
  }

  // Check columns
  const columnsCheck = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'business_custom_domains'
    ORDER BY ordinal_position;
  `);

  const expectedColumns = [
    'id', 'business_id', 'domain', 'is_active', 'is_primary', 
    'verified_at', 'created_at', 'updated_at'
  ];

  const actualColumns = columnsCheck.rows.map(r => r.column_name);
  const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

  if (missingColumns.length === 0) {
    logSuccess(`All ${expectedColumns.length} columns present`);
  } else {
    logError(`Missing columns: ${missingColumns.join(', ')}`);
  }

  // Check indexes
  const indexesCheck = await client.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'business_custom_domains';
  `);

  const indexes = indexesCheck.rows.map(r => r.indexname);
  const expectedIndexes = [
    'business_custom_domains_pkey',
    'unique_business_custom_domain',
    'idx_custom_domains_domain',
    'idx_custom_domains_business',
    'idx_custom_domains_domain_lower',
    'idx_custom_domains_one_primary'
  ];

  const missingIndexes = expectedIndexes.filter(idx => !indexes.includes(idx));

  if (missingIndexes.length === 0) {
    logSuccess(`All ${expectedIndexes.length} indexes created`);
  } else {
    logWarning(`Missing indexes: ${missingIndexes.join(', ')}`);
  }

  // Check foreign key
  const fkCheck = await client.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'business_custom_domains'
      AND constraint_type = 'FOREIGN KEY';
  `);

  if (fkCheck.rows.length > 0) {
    logSuccess('Foreign key constraint exists');
  } else {
    logError('Foreign key constraint NOT found');
  }

} catch (error) {
  logError(`Database check failed: ${error.message}`);
} finally {
  client.release();
}

// 2. Check server actions file
console.log('\n⚙️  Checking server actions...');
const actionsPath = join(rootDir, 'lib', 'actions', 'storefront', 'customDomains.js');

if (existsSync(actionsPath)) {
  logSuccess('customDomains.js exists');
  
  const actionsContent = readFileSync(actionsPath, 'utf-8');
  const requiredFunctions = [
    'listCustomDomainsAction',
    'addCustomDomainAction',
    'verifyCustomDomainAction',
    'setPrimaryDomainAction',
    'removeCustomDomainAction'
  ];

  requiredFunctions.forEach(fn => {
    if (actionsContent.includes(`export async function ${fn}`)) {
      logSuccess(`  ${fn} ✓`);
    } else {
      logError(`  ${fn} NOT found`);
    }
  });
} else {
  logError('customDomains.js NOT found');
}

// 3. Check UI component
console.log('\n🎨 Checking UI component...');
const componentPath = join(rootDir, 'components', 'storefront', 'CustomDomainManager.jsx');

if (existsSync(componentPath)) {
  logSuccess('CustomDomainManager.jsx exists');
  
  const componentContent = readFileSync(componentPath, 'utf-8');
  if (componentContent.includes('export function CustomDomainManager')) {
    logSuccess('  Component export found ✓');
  } else {
    logError('  Component export NOT found');
  }
} else {
  logError('CustomDomainManager.jsx NOT found');
}

// 4. Check cache layer
console.log('\n💾 Checking cache layer...');
const cachePath = join(rootDir, 'lib', 'cache', 'customDomainCache.ts');

if (existsSync(cachePath)) {
  logSuccess('customDomainCache.ts exists');
  
  const cacheContent = readFileSync(cachePath, 'utf-8');
  if (cacheContent.includes('lookupCustomDomainFromCache')) {
    logSuccess('  lookupCustomDomainFromCache ✓');
  } else {
    logError('  lookupCustomDomainFromCache NOT found');
  }
} else {
  logError('customDomainCache.ts NOT found');
}

// 5. Check proxy routing
console.log('\n🔀 Checking proxy routing...');
const proxyPath = join(rootDir, 'proxy.ts');

if (existsSync(proxyPath)) {
  logSuccess('proxy.ts exists');
  
  const proxyContent = readFileSync(proxyPath, 'utf-8');
  if (proxyContent.includes('lookupCustomDomainFromCache')) {
    logSuccess('  Custom domain routing integrated ✓');
  } else {
    logWarning('  Custom domain routing NOT integrated in proxy.ts');
  }
} else {
  logError('proxy.ts NOT found');
}

// 6. Check Prisma model
console.log('\n📄 Checking Prisma schema...');
const schemaPath = join(rootDir, 'prisma', 'schema.prisma');

if (existsSync(schemaPath)) {
  logSuccess('schema.prisma exists');
  
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  if (schemaContent.includes('model business_custom_domains')) {
    logSuccess('  business_custom_domains model defined ✓');
  } else {
    logError('  business_custom_domains model NOT found');
  }

  if (schemaContent.includes('custom_domains               business_custom_domains[]')) {
    logSuccess('  Relation to businesses model ✓');
  } else {
    logWarning('  Relation to businesses model NOT found');
  }
} else {
  logError('schema.prisma NOT found');
}

// 7. Check StoreSettingsManager integration
console.log('\n🏪 Checking UI integration...');
const settingsPath = join(rootDir, 'components', 'StoreSettingsManager.jsx');

if (existsSync(settingsPath)) {
  logSuccess('StoreSettingsManager.jsx exists');
  
  const settingsContent = readFileSync(settingsPath, 'utf-8');
  if (settingsContent.includes('CustomDomainManager')) {
    logSuccess('  CustomDomainManager imported ✓');
  } else {
    logWarning('  CustomDomainManager NOT imported');
  }

  if (settingsContent.includes('<CustomDomainManager')) {
    logSuccess('  CustomDomainManager rendered ✓');
  } else {
    logWarning('  CustomDomainManager NOT rendered');
  }
} else {
  logError('StoreSettingsManager.jsx NOT found');
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Verification FAILED - Please fix the errors above');
  process.exit(1);
} else {
  console.log('✅ Verification PASSED - Custom domains implementation is complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test locally by adding a domain via UI');
  console.log('   2. Configure /etc/hosts for local testing');
  console.log('   3. Implement real DNS verification (production)');
  console.log('   4. Set up SSL provisioning (Cloudflare for SaaS)');
  console.log('\n📚 Documentation: docs/CUSTOM_DOMAINS_IMPLEMENTATION.md');
}

await pool.end();
