#!/usr/bin/env node
/**
 * Storefront merchant alert emails must resolve tenant owners (business_users),
 * not businesses.email alone.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function assertIncludes(relPath, needle, message) {
  const text = read(relPath);
  if (!text.includes(needle)) {
    failures.push(`${relPath}: ${message}`);
  }
}

function assertExcludes(relPath, needle, message) {
  const text = read(relPath);
  if (text.includes(needle)) {
    failures.push(`${relPath}: ${message}`);
  }
}

assertIncludes(
  'lib/notifications/businessNotificationRecipients.js',
  'resolveBusinessMerchantAlertEmails',
  'missing resolveBusinessMerchantAlertEmails helper'
);
assertIncludes(
  'lib/notifications/businessNotificationRecipients.js',
  'business_users bu',
  'must join business_users for tenant-scoped merchant emails'
);

assertIncludes(
  'app/api/storefront/[businessDomain]/orders/route.js',
  'resolveBusinessMerchantAlertEmails',
  'orders route must use tenant owner email resolver'
);
assertExcludes(
  'app/api/storefront/[businessDomain]/orders/route.js',
  'to: business.email',
  'must not send merchant order email directly to businesses.email'
);

assertIncludes(
  'app/api/storefront/[businessDomain]/contact/route.js',
  'resolveBusinessMerchantAlertEmails',
  'contact route must use tenant owner email resolver'
);

assertIncludes(
  'lib/config/platform.js',
  'getRegistrationApprovalNotifyEmails',
  'platform config must expose registration approval inbox helper'
);
assertIncludes(
  'lib/actions/basic/business.js',
  'getRegistrationApprovalNotifyEmails',
  'registration flow must use dedicated approval inbox helper'
);

if (failures.length) {
  console.error('verify:storefront-order-emails FAILED\n');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('verify:storefront-order-emails OK');
