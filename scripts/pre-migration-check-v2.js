#!/usr/bin/env node

/**
 * Pre-Migration Safety Check v2 (Windows Compatible)
 * No Unix commands, works on Windows without psql
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function check() {
  console.log('\n' + '='.repeat(60));
  log('PRE-MIGRATION SAFETY CHECK v2', 'bright');
  log('(Windows Compatible)', 'bright');
  console.log('='.repeat(60) + '\n');

  let allPassed = true;

  // Check 1: Node.js version
  log('Environment Checks:', 'bright');
  try {
    const version = process.version;
    log(`✅ Node.js ${version}`, 'green');
  } catch {
    allPassed = false;
  }

  // Check 2: Bun
  try {
    require('child_process').execSync('bun --version', { stdio: 'ignore' });
    log('✅ Bun is installed', 'green');
  } catch {
    log('⚠️  Bun not found (optional)', 'yellow');
  }

  // Check 3: pg module (more important than psql)
  try {
    require('pg');
    log('✅ pg module installed', 'green');
  } catch {
    log('❌ pg module not found - Run: npm install pg', 'red');
    allPassed = false;
  }

  // Check 4: DATABASE_URL
  log('\nDatabase Configuration:', 'bright');
  if (process.env.DATABASE_URL) {
    log('✅ DATABASE_URL environment variable is set', 'green');
    
    // Validate format
    const url = process.env.DATABASE_URL;
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      log('✅ DATABASE_URL format looks valid', 'green');
    } else {
      log('⚠️  DATABASE_URL format may be invalid (should start with postgresql://)', 'yellow');
    }
    
    // Mask and show
    const masked = url.replace(/:(.*)@/, ':****@');
    log(`   Value: ${masked.substring(0, 50)}...`, 'gray');
  } else {
    log('❌ DATABASE_URL not set', 'red');
    log('\nTo fix:', 'yellow');
    log('  PowerShell: $env:DATABASE_URL="postgresql://..."', 'bright');
    log('  CMD:        set DATABASE_URL=postgresql://...', 'bright');
    allPassed = false;
  }

  // Check 5: Migration file exists (Windows compatible)
  log('\nMigration Files:', 'bright');
  const migrationFile = path.join(__dirname, 'migrations', '002_add_admin_features.sql');
  if (fs.existsSync(migrationFile)) {
    const stats = fs.statSync(migrationFile);
    log(`✅ Migration file exists: ${migrationFile}`, 'green');
    log(`   Size: ${stats.size} bytes`, 'gray');
  } else {
    log(`❌ Migration file not found: ${migrationFile}`, 'red');
    allPassed = false;
  }

  // Check 6: Alternative migration scripts
  log('\nMigration Options:', 'bright');
  const nodeMigration = path.join(__dirname, 'migrate-using-node.js');
  const batchMigration = path.join(__dirname, 'migrate-windows.bat');
  
  if (fs.existsSync(nodeMigration)) {
    log('✅ Node.js migration available (RECOMMENDED)', 'green');
    log('   Run: node scripts\migrate-using-node.js', 'cyan');
  }
  
  if (fs.existsSync(batchMigration)) {
    log('✅ Windows batch migration available', 'green');
    log('   Run: scripts\migrate-windows.bat', 'cyan');
  }

  // Check 7: Backups directory
  log('\nBackup Configuration:', 'bright');
  try {
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }
    log('✅ Backups directory ready', 'green');
  } catch {
    log('❌ Cannot create backups directory', 'red');
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    log('✅ ALL CHECKS PASSED', 'green');
    console.log('='.repeat(60));
    log('\nReady to migrate! Run:', 'bright');
    log('  node scripts\migrate-using-node.js', 'cyan');
  } else {
    log('❌ SOME CHECKS FAILED', 'red');
    console.log('='.repeat(60));
    log('\nFix the issues above, then run this check again.', 'yellow');
    
    if (!process.env.DATABASE_URL) {
      log('\n💡 Need help setting DATABASE_URL?', 'cyan');
      log('   See: docs/guides/WINDOWS_MIGRATION_SETUP.md', 'bright');
    }
    
    process.exit(1);
  }
  console.log('');
}

check();
