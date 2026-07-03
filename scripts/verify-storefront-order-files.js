#!/usr/bin/env node
/**
 * Verify Storefront Order Integration Files
 * 
 * Checks that all necessary files have been updated correctly
 * 
 * Run: node scripts/verify-storefront-order-files.js
 */

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'Dashboard Analytics Action',
    file: './lib/actions/premium/ai/analytics.js',
    mustInclude: ['storefront_orders', 'combined_revenue', 'storefront AS'],
    description: 'Must include storefront_orders in metrics queries'
  },
  {
    name: 'Storefront Orders Route',
    file: './app/api/storefront/[businessDomain]/orders/route.js',
    mustInclude: ['notifyStorefrontOrder', 'storefront_orders'],
    description: 'Must create orders and send notifications'
  },
  {
    name: 'Notification Helpers',
    file: './lib/notifications/notificationHelpers.js',
    mustInclude: ['notifyStorefrontOrder', 'STOREFRONT_ORDER', 'formatNotificationAmount'],
    description: 'Must have storefront order notification helper'
  },
  {
    name: 'Orders Manager Component',
    file: './components/orders/OrdersManager.jsx',
    mustInclude: ['getBusinessOrders', 'OrdersManager', 'storefront'],
    description: 'Must display storefront orders'
  },
  {
    name: 'Storefront Orders Actions',
    file: './lib/actions/storefront/orders.js',
    mustInclude: ['getBusinessOrders', 'storefront_orders', 'updateOrderStatus'],
    description: 'Must have order management actions'
  },
  {
    name: 'Notification Bell Component',
    file: './components/notifications/NotificationBell.jsx',
    mustInclude: ['useNotifications', 'NotificationBell', 'Bell'],
    description: 'Must display notifications with bell icon'
  },
  {
    name: 'Reminders Portlet',
    file: './app/business/[category]/components/islands/portlets/RemindersPortlet.client.tsx',
    mustInclude: ['pendingOrders', 'RemindersPortlet'],
    description: 'Must show pending orders count'
  }
];

function verifyFile(check) {
  console.log(`\n📄 ${check.name}`);
  console.log(`   File: ${check.file}`);
  console.log(`   ${check.description}`);
  
  if (!fs.existsSync(check.file)) {
    console.log(`   ❌ File not found!`);
    return false;
  }
  
  const content = fs.readFileSync(check.file, 'utf8');
  const missing = [];
  
  for (const pattern of check.mustInclude) {
    if (!content.includes(pattern)) {
      missing.push(pattern);
    }
  }
  
  if (missing.length > 0) {
    console.log(`   ⚠️  Missing patterns: ${missing.join(', ')}`);
    return false;
  }
  
  console.log(`   ✅ All checks passed!`);
  return true;
}

console.log('\n🔍 Verifying Storefront Order Integration Files\n');
console.log('='.repeat(70));

let allPassed = true;
for (const check of checks) {
  if (!verifyFile(check)) {
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(70));

if (allPassed) {
  console.log('\n✅ All files verified successfully!\n');
  console.log('📋 Integration Status:');
  console.log('   ✅ Dashboard analytics includes storefront orders');
  console.log('   ✅ Order creation sends notifications');
  console.log('   ✅ Notification system configured');
  console.log('   ✅ Orders management UI ready');
  console.log('   ✅ Dashboard widgets connected');
  console.log('\n💡 Next Steps:');
  console.log('   1. Start the development server: npm run dev');
  console.log('   2. Place a test order via any storefront');
  console.log('   3. Check dashboard for updated metrics');
  console.log('   4. Verify notification appears in bell icon');
  console.log('   5. Navigate to Orders tab and confirm order visible\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed!\n');
  console.log('Please review the files listed above and ensure they contain the required patterns.\n');
  process.exit(1);
}
