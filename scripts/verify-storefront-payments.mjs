#!/usr/bin/env node
/**
 * Static wiring checks for storefront payment eligibility + checkout panels.
 * Run: node scripts/verify-storefront-payments.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

let failed = false;
const mark = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const eligibility = read('lib/storefront/storefrontPaymentEligibility.js');
const payments = read('lib/actions/storefront/payments.js');
const orders = read('app/api/storefront/[businessDomain]/orders/route.js');
const checkout = read('app/store/[businessDomain]/checkout/page.jsx');
const cryptoCreate = read('app/api/storefront/[businessDomain]/crypto/create/route.js');
const stripeIntent = read('app/api/storefront/[businessDomain]/stripe/create-intent/route.js');

if (!eligibility.includes('resolveEligibleStorefrontPaymentMethods')) {
  mark('storefrontPaymentEligibility must resolve eligible methods');
}
if (!eligibility.includes('coerceStorefrontPaymentMethod')) {
  mark('storefrontPaymentEligibility must coerce unavailable methods to COD');
}
if (!payments.includes('resolveEligibleStorefrontPaymentMethods')) {
  mark('getAvailablePaymentMethods must use eligibility resolver');
}
if (payments.includes('methods.push({') && payments.includes("provider: 'crypto'")) {
  mark('getAvailablePaymentMethods must not auto-inject crypto without owner enable');
}
if (!orders.includes('coerceStorefrontPaymentMethod')) {
  mark('orders route must coerce payment method server-side');
}
if (!checkout.includes('StripeCheckoutPanel')) {
  mark('checkout must render StripeCheckoutPanel for card payments');
}
if (!cryptoCreate.includes('isStorefrontPaymentProviderReady')) {
  mark('crypto create must verify business enabled crypto');
}
if (!stripeIntent.includes('createStorefrontStripePaymentIntent')) {
  mark('stripe create-intent route must exist');
}

if (failed) {
  process.exit(1);
}
console.log('OK: storefront payment wiring checks passed');
