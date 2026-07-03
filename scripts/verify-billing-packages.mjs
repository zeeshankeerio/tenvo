#!/usr/bin/env node
/**
 * Runtime checks: every domain package resolves through the unified billing SKU
 * (Stripe price_data catalog + activation payload) in PKR and USD.
 * Run: node scripts/verify-billing-packages.mjs
 */
import {
  verifyAllDomainPackagesBillable,
  listDomainPackageBillableSkus,
  resolveBillableSku,
} from '../lib/payments/billingSku.js';

const PAID_PLAN_TIERS = ['starter', 'business', 'professional'];

let failed = false;
const mark = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

const pkgCheck = verifyAllDomainPackagesBillable();
if (!pkgCheck.ok) {
  for (const err of pkgCheck.errors) mark(err);
}

const skus = listDomainPackageBillableSkus({ currency: 'pkr' });
if (skus.length < 5) {
  mark(`expected at least 5 billable domain packages, got ${skus.length}`);
}

for (const sku of skus) {
  if (!sku.pricePkr || sku.pricePkr <= 0) mark(`${sku.key}: invalid PKR price`);
  if (!sku.lookupKey?.startsWith('tenvo_pkg_')) mark(`${sku.key}: missing lookup key`);
  if (sku.billingKind !== 'domain_package') mark(`${sku.key}: wrong billing kind`);
}

for (const tier of PAID_PLAN_TIERS) {
  const pkr = resolveBillableSku({ planTier: tier, currency: 'pkr' });
  const usd = resolveBillableSku({ planTier: tier, currency: 'usd' });
  if (!pkr) mark(`plan ${tier}: PKR SKU failed`);
  if (!usd) mark(`plan ${tier}: USD SKU failed`);
  if (pkr?.catalog?.kind !== 'plan') mark(`plan ${tier}: expected plan billing kind`);
}

if (failed) {
  console.error('verify-billing-packages: failures above');
  process.exit(1);
}

console.log(`verify-billing-packages: OK (${skus.length} packages, ${PAID_PLAN_TIERS.length} plan tiers)`);
