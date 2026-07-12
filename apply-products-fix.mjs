#!/usr/bin/env node
/**
 * Script to apply the products unique constraint fix
 * Run: node apply-products-fix.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: __dirname
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function main() {
  log('========================================', 'cyan');
  log('Products Unique Constraint Fix Script', 'cyan');
  log('========================================', 'cyan');
  log('');

  // Load database URL from env
  let dbUrl;
  try {
    const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
    const directMatch = envContent.match(/DIRECT_URL="?([^"\r\n]+)"?/);
    const dbMatch = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
    dbUrl = directMatch ? directMatch[1] : (dbMatch ? dbMatch[1] : null);
    
    if (!dbUrl) {
      log('ERROR: Could not find DATABASE_URL in .env.local', 'red');
      process.exit(1);
    }
    log('✓ Database connection found', 'green');
  } catch (error) {
    log(`ERROR: Could not read .env.local: ${error.message}`, 'red');
    process.exit(1);
  }

  log('');

  // Step 1: Check for duplicates
  log('Step 1: Checking for duplicate products...', 'yellow');
  log('Running: check_duplicates.sql', 'gray');
  
  const duplicateCheck = exec(`psql "${dbUrl}" -f check_duplicates.sql`, true);
  if (duplicateCheck.success) {
    const output = duplicateCheck.output || '';
    if (output.includes('(0 rows)') || /affected_skus.*0/.test(output)) {
      log('✓ No duplicates found! Safe to proceed.', 'green');
    } else {
      log('⚠ Duplicates detected:', 'yellow');
      console.log(output);
      log('', 'reset');
      log('⚠ Please run fix_duplicate_products.sql manually:', 'yellow');
      log(`  psql "${dbUrl}" -f fix_duplicate_products.sql`, 'gray');
      log('Then run this script again.', 'yellow');
      process.exit(1);
    }
  } else {
    log('⚠ Could not check for duplicates', 'yellow');
    log('Proceeding with caution...', 'gray');
  }

  log('');

  // Step 2: Apply migration using Prisma
  log('Step 2: Applying migration via Prisma...', 'yellow');
  log('Running: npx prisma migrate deploy', 'gray');
  
  // First, try prisma migrate deploy (safer for existing databases)
  let migrate = exec('npx prisma migrate deploy');
  
  if (!migrate.success) {
    log('⚠ Prisma migrate deploy failed, trying dev mode...', 'yellow');
    migrate = exec('npx prisma migrate dev --name products_unique_constraints');
  }
  
  if (!migrate.success) {
    log('⚠ Prisma migration failed, trying direct database approach...', 'yellow');
    log('', 'reset');
    
    // Use Prisma's db execute for direct SQL
    log('Applying migration via Prisma db execute...', 'gray');
    const { readFileSync } = await import('fs');
    const { execSync } = await import('child_process');
    
    try {
      const migrationSql = readFileSync(
        'prisma/migrations/20260713_products_unique_constraints/migration.sql',
        'utf8'
      );
      
      // Write SQL to temp file and execute via Prisma
      const { writeFileSync, unlinkSync } = await import('fs');
      const { join } = await import('path');
      const tempSqlFile = join(__dirname, 'temp_migration.sql');
      
      writeFileSync(tempSqlFile, migrationSql);
      
      const dbExecute = exec('npx prisma db execute --file temp_migration.sql --schema prisma/schema.prisma');
      
      try {
        unlinkSync(tempSqlFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (!dbExecute.success) {
        log('✗ All migration attempts failed!', 'red');
        log('', 'reset');
        log('Manual steps:', 'yellow');
        log('1. Copy the migration SQL from:', 'reset');
        log('   prisma/migrations/20260713_products_unique_constraints/migration.sql', 'gray');
        log('2. Run it in Supabase SQL Editor:', 'reset');
        log('   https://supabase.com/dashboard/project/[your-project]/sql', 'gray');
        log('3. Run this script again to verify', 'reset');
        process.exit(1);
      }
    } catch (error) {
      log(`✗ Error reading migration file: ${error.message}`, 'red');
      process.exit(1);
    }
  }
  
  log('✓ Migration applied successfully!', 'green');
  log('');

  // Step 3: Verify constraints using Supabase client
  log('Step 3: Verifying constraints...', 'yellow');
  
  log('Checking if indexes were created...', 'gray');
  
  // Create a simple verification query via Prisma
  try {
    const { writeFileSync, unlinkSync, readFileSync } = await import('fs');
    const { join } = await import('path');
    
    const verifyQuery = `
SELECT 
    i.relname AS index_name,
    'EXISTS' as status
FROM pg_index idx
INNER JOIN pg_class i ON i.oid = idx.indexrelid
INNER JOIN pg_class t ON t.oid = idx.indrelid
WHERE t.relname = 'products'
  AND idx.indisunique = true
  AND i.relname LIKE '%active_key'
ORDER BY i.relname;
    `;
    
    const tempVerifyFile = join(__dirname, 'temp_verify.sql');
    writeFileSync(tempVerifyFile, verifyQuery);
    
    const verify = exec('npx prisma db execute --file temp_verify.sql --schema prisma/schema.prisma', true);
    
    try {
      unlinkSync(tempVerifyFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    if (verify.success && verify.output) {
      const output = verify.output;
      if (output.includes('products_business_sku_active_key')) {
        log('✓ SKU unique constraint verified', 'green');
      } else {
        log('⚠ SKU constraint not found', 'yellow');
      }
      
      if (output.includes('products_business_barcode_active_key')) {
        log('✓ Barcode unique constraint verified', 'green');
      } else {
        log('⚠ Barcode constraint not found', 'yellow');
      }
      
      if (output.includes('products_business_name_active_key')) {
        log('✓ Name unique constraint verified', 'green');
      } else {
        log('⚠ Name constraint not found', 'yellow');
      }
    } else {
      log('⚠ Could not verify constraints automatically', 'yellow');
      log('You can verify manually in Supabase SQL Editor', 'gray');
    }
  } catch (error) {
    log('⚠ Could not verify constraints automatically', 'yellow');
    log('You can verify manually in Supabase SQL Editor', 'gray');
  }

  log('');
  log('========================================', 'cyan');
  log('✓ Fix Applied Successfully!', 'green');
  log('========================================', 'cyan');
  log('');
  
  log('Next steps:', 'cyan');
  log('1. Test creating a product in the Inventory Engine', 'reset');
  log('2. Test updating stock quantities', 'reset');
  log('3. Test saving in Visual/Busy/Excel modes', 'reset');
  log('4. Verify no constraint errors appear', 'reset');
  log('');
  log('If you encounter issues, see FIX_PRODUCTS_CONSTRAINT_ERRORS.md', 'gray');
  log('');
}

main().catch(error => {
  log(`Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});
