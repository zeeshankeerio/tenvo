#!/usr/bin/env node
/**
 * Static wiring checks for code-driven Stripe billing catalog.
 * Run: node scripts/verify-stripe-billing-catalog.mjs
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

const catalog = read('lib/payments/stripeCatalog.js');
const checkout = read('app/api/billing/create-checkout/route.js');
const update = read('app/api/billing/update/route.js');
const stripe = read('lib/payments/stripe.js');
const webhook = read('app/api/webhooks/stripe/route.js');

if (!catalog.includes('price_data')) mark('stripeCatalog builds price_data line items');
if (!catalog.includes('resolveBillingCatalogItem')) mark('resolveBillingCatalogItem export');
if (!catalog.includes('ensureStripePriceForCatalogItem')) mark('dynamic price lookup_key helper');
if (!catalog.includes('domainPackageKey')) mark('domain package in catalog');

if (!checkout.includes('resolveBillableSku')) mark('create-checkout uses unified billingSku');
if (!checkout.includes('buildCheckoutLineItemFromCatalog')) mark('create-checkout uses price_data');
if (checkout.includes('getPriceIdForPlan')) mark('create-checkout should not use getPriceIdForPlan');

if (!update.includes('resolveBillableSku')) mark('billing update uses unified billingSku');
if (!update.includes('ensureStripePriceForCatalogItem')) mark('billing update uses dynamic prices');
if (update.includes('getPriceIdForPlan')) mark('billing update should not use getPriceIdForPlan');

if (!stripe.includes('lineItem')) mark('createCheckoutSession accepts lineItem');
if (!stripe.includes('STRIPE_AUTOMATIC_TAX')) mark('optional automatic_tax env gate');

if (!webhook.includes('getBillingActivationPayload')) mark('webhook applies domain package activation');
if (!webhook.includes('domainPackageKey')) mark('webhook reads domainPackageKey metadata');

if (failed) {
  console.error('verify-stripe-billing-catalog: failures above');
  process.exit(1);
}
console.log('verify-stripe-billing-catalog: OK');
