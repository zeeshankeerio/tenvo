#!/usr/bin/env node
/**
 * Static wiring checks for offline / manual SaaS billing (owner submit + admin approve).
 * Run: node scripts/verify-manual-billing.mjs
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

const billingActions = read('lib/actions/basic/billing.js');
const manualApply = read('lib/payments/manualSubscriptionPayment.js');
const manualRequests = read('lib/payments/manualPaymentRequests.js');
const platformAdmin = read('lib/actions/admin/platform.js');
const settings = read('components/SettingsManager.jsx');
const ownerPanel = read('components/billing/ManualPaymentRequestPanel.jsx');
const envExample = read('.env.example');
const billingMode = read('lib/config/billingMode.js');
const subscriptionRoute = read('app/api/billing/subscription/route.js');
const createCheckout = read('app/api/billing/create-checkout/route.js');
const stripeJs = read('lib/payments/stripe.js');

if (!billingMode.includes('shouldUseDevInstantBilling')) {
  mark('billingMode exports shouldUseDevInstantBilling');
}
if (!billingMode.includes('isStripeCheckoutEnabled')) {
  mark('billingMode exports isStripeCheckoutEnabled');
}
if (!createCheckout.includes('shouldUseDevInstantBilling')) {
  mark('create-checkout uses shouldUseDevInstantBilling (card + offline coexist)');
}
if (!stripeJs.includes("customer_update: { name: 'auto', address: 'auto' }")) {
  mark('stripe createCheckoutSession must set customer_update when tax_id_collection is enabled');
}
if (!createCheckout.includes('stripe.customers.update')) {
  mark('create-checkout should sync Stripe customer name/email before checkout');
}
if (!subscriptionRoute.includes('stripeCheckoutAvailable')) {
  mark('subscription API exposes stripeCheckoutAvailable');
}

if (!billingActions.includes('submitManualSubscriptionPaymentRequestAction')) {
  mark('owner submit action export');
}
if (!billingActions.includes('getManualSubscriptionPaymentContextAction')) {
  mark('owner context action export');
}
if (!billingActions.includes('resolveBillableSku')) {
  mark('owner actions validate SKU via unified billingSku');
}

if (!manualApply.includes('applyManualSubscriptionPaymentTx')) {
  mark('shared manual apply transaction helper');
}
if (!manualApply.includes('domainPackageKey')) {
  mark('manual apply supports domain packages');
}
if (!manualApply.includes('resolveBillableSku')) {
  mark('manual apply validates via unified billingSku');
}

if (!manualRequests.includes('buildPendingManualPaymentRequest')) {
  mark('pending request builder');
}
if (!manualRequests.includes('getManualPaymentPayeeInstructions')) {
  mark('payee instructions from env');
}
if (!manualRequests.includes('TENVO_MANUAL_PAYMENT_JAZZCASH')) {
  mark('JazzCash env key');
}

if (!platformAdmin.includes('approveManualSubscriptionPaymentRequest')) {
  mark('admin approve action');
}
if (!platformAdmin.includes('rejectManualSubscriptionPaymentRequest')) {
  mark('admin reject action');
}
if (!platformAdmin.includes('applyManualSubscriptionPaymentTx')) {
  mark('admin record uses shared apply helper');
}

if (!settings.includes('DomainPackageBillingCards')) {
  mark('SettingsManager wires DomainPackageBillingCards');
}
if (/billingMode\s*!==\s*['"]manual['"]\s*&&\s*business\?\.id[\s\S]*ManualPaymentRequestPanel/.test(settings)) {
  mark('SettingsManager should not hide offline panel in dev billing mode');
}

if (!ownerPanel.includes('submitManualSubscriptionPaymentRequestAction')) {
  mark('owner panel submits payment request');
}
if (!ownerPanel.includes('preferredDomainPackageKey')) {
  mark('owner panel accepts preselected domain package');
}

if (!envExample.includes('TENVO_MANUAL_PAYMENT_JAZZCASH')) {
  mark('.env.example documents manual payment env vars');
}

const manualEmails = read('lib/email/manualBillingEmails.js');
if (!manualEmails.includes('sendManualPaymentSubmittedToPlatformEmail')) {
  mark('platform notify email on owner submit');
}
if (!billingActions.includes('isPaymentReferenceAlreadyUsed')) {
  mark('duplicate payment reference guard');
}
if (!subscriptionRoute.includes('getManualPaymentRequestState')) {
  mark('subscription API exposes manual payment state');
}

if (failed) {
  console.error('verify-manual-billing: failures above');
  process.exit(1);
}
console.log('verify-manual-billing: OK');
