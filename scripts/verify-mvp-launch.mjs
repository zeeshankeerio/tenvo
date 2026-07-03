/**
 * Static wiring checks for first-market MVP launch readiness.
 * Run: node scripts/verify-mvp-launch.mjs
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

// --- Registration OTP must fail loudly in production when email is not configured ---
const otpSender = read('lib/auth/sendAuthOtpEmail.jsx');
if (!otpSender.includes("process.env.NODE_ENV === 'production'")) {
  mark('sendAuthOtpEmail.jsx must reject skipped email delivery in production');
}
if (!otpSender.includes('throw new Error')) {
  mark('sendAuthOtpEmail.jsx must throw when OTP email cannot be sent');
}

// --- Stripe webhook must not silently accept events when unconfigured ---
const stripeWebhook = read('app/api/webhooks/stripe/route.js');
const unconfiguredBlock = stripeWebhook.slice(
  stripeWebhook.indexOf('if (!stripe || !webhookSecret)'),
  stripeWebhook.indexOf('const payload = await request.text()')
);
if (!unconfiguredBlock.includes('503')) {
  mark('Stripe webhook must return 503 when STRIPE_* env is missing');
}
if (unconfiguredBlock.includes('{ received: true }')) {
  mark('Stripe webhook must not return received:true when unconfigured');
}

// --- Easy Mode sidebar must expose Finance Hub + Tax/GST ---
const sidebar = read('components/layout/Sidebar.jsx');
const easyStart = sidebar.indexOf('const EASY_NAV_SECTIONS');
const easyEnd = sidebar.indexOf('];', easyStart) + 2;
const easyBlock = sidebar.slice(easyStart, easyEnd);
if (!easyBlock.includes("key: 'finance'")) {
  mark('Easy Mode MONEY section must include Finance Hub (finance tab)');
}
if (!easyBlock.includes("key: 'gst'")) {
  mark('Easy Mode MONEY section must include Tax / GST (gst tab)');
}

// --- Auth confirmed safety fallback should resume onboarding ---
const authConfirmed = read('app/auth/confirmed/page.js');
if (authConfirmed.includes("router.push('/')") && !authConfirmed.includes('/register?step=3')) {
  mark('auth/confirmed safety timeout should redirect to /register?step=3, not home');
}

// --- Production env checklist documented ---
const envExample = read('.env.example');
if (!envExample.includes('PRODUCTION LAUNCH CHECKLIST')) {
  mark('.env.example must document production launch checklist');
}
if (!envExample.includes('NEXT_PUBLIC_DEV_FULL_FEATURES=false')) {
  mark('.env.example must mention NEXT_PUBLIC_DEV_FULL_FEATURES=false for production');
}

// --- Hub customer form must use shared mobile tokens (avoid undefined labelClass crash) ---
const customerForm = read('components/CustomerForm.jsx');
if (customerForm.includes('className={labelClass}') && !customerForm.includes('const labelClass')) {
  mark('CustomerForm must not reference undefined labelClass');
}
if (customerForm.includes('className={inputClass}') && !customerForm.includes('const inputClass')) {
  mark('CustomerForm must not reference undefined inputClass');
}
if (!customerForm.includes('MOBILE_LABEL_CLASS') || !customerForm.includes('MOBILE_INPUT_CLASS')) {
  mark('CustomerForm must import and use MOBILE_LABEL_CLASS / MOBILE_INPUT_CLASS');
}
if (!customerForm.includes('DomainFieldRenderer')) {
  mark('CustomerForm must render domain tab via DomainFieldRenderer');
}
if (!customerForm.includes('getDomainCustomerFields')) {
  mark('CustomerForm must load domain customer fields from domainHelpers');
}

// --- package script registered ---
const pkg = read('package.json');
if (!pkg.includes('verify:mvp-launch')) {
  mark('package.json must define verify:mvp-launch script');
}

if (failed) {
  console.error('\nMVP launch verification failed.');
  process.exit(1);
}

console.log('OK: MVP launch static checks passed.');
