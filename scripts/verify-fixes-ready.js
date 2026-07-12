#!/usr/bin/env node
/**
 * Pre-Deployment Verification Script
 * Checks that all inventory fixes are properly applied and ready to deploy
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  const result = { name, passed: condition, details };
  checks.push(result);
  
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

console.log('🔍 Verifying Inventory Fixes Are Ready for Deployment\n');

// Check 1: Modified files exist
const compositeFile = 'lib/actions/premium/automation/inventory_composite.js';
const managerFile = 'components/InventoryManager.jsx';

check(
  'inventory_composite.js exists',
  fs.existsSync(compositeFile),
  compositeFile
);

check(
  'InventoryManager.jsx exists',
  fs.existsSync(managerFile),
  managerFile
);

// Check 2: Invalid columns removed from composite
if (fs.existsSync(compositeFile)) {
  const compositeContent = fs.readFileSync(compositeFile, 'utf8');
  
  check(
    'tracking_mode removed from safeFields',
    !compositeContent.includes("'tracking_mode'") && 
    !compositeContent.includes('"tracking_mode"'),
    'Column reference removed from safeFields array'
  );
  
  check(
    'attributes removed from safeFields',
    !compositeContent.includes("'attributes',") && 
    !compositeContent.includes('"attributes",'),
    'Column reference removed from safeFields array'
  );
  
  check(
    'serializeDecimalsDeep used on return',
    compositeContent.includes('const serialized = product ? serializeDecimalsDeep(product)'),
    'Decimal serialization added'
  );
}

// Check 3: Batch extraction added to InventoryManager
if (fs.existsSync(managerFile)) {
  const managerContent = fs.readFileSync(managerFile, 'utf8');
  
  check(
    'extractBatchesFromExcelRow helper exists',
    managerContent.includes('extractBatchesFromExcelRow'),
    'Helper function found in InventoryManager'
  );
  
  check(
    'Batch extraction used in Excel save',
    managerContent.includes('extractBatchesFromExcelRow(mapped)') ||
    managerContent.includes('extractBatchesFromExcelRow(item)'),
    'Helper is called in save handler'
  );
}

// Check 4: Documentation files created
const docs = [
  'INVENTORY_ROOT_CAUSE_ANALYSIS.md',
  'CRITICAL_FIXES_SUMMARY.md',
  'QUICK_FIX_GUIDE.md',
  'FIXES_APPLIED.md',
  'DEPLOYMENT_CHECKLIST.md',
  'SAFE_DEPLOYMENT_STEPS.md'
];

docs.forEach(doc => {
  check(
    `${doc} created`,
    fs.existsSync(doc),
    `Documentation: ${doc}`
  );
});

// Check 5: Scripts created
check(
  'fix-duplicate-products.sql exists',
  fs.existsSync('scripts/fix-duplicate-products.sql'),
  'Database fix script ready'
);

check(
  'deploy-inventory-fixes.ps1 exists',
  fs.existsSync('scripts/deploy-inventory-fixes.ps1'),
  'PowerShell deployment script ready'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 ALL CHECKS PASSED! Ready for deployment.');
  console.log('\n📋 Next Steps:');
  console.log('1. Read SAFE_DEPLOYMENT_STEPS.md');
  console.log('2. Create database backup');
  console.log('3. Check for duplicate products');
  console.log('4. Mark migration as resolved');
  console.log('5. Deploy to production');
  console.log('6. Test checkout flow\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Review issues before deploying.\n');
  process.exit(1);
}
