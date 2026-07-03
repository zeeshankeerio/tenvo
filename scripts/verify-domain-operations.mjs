/**
 * Static wiring checks for domain operations dashboard + storefront analytics.
 * Run: node scripts/verify-domain-operations.mjs
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

const intel = read('lib/dashboard/domainOperationsIntelligence.js');
const subjects = read('lib/dashboard/domainOperationsSubjects.js');
const snapshot = read('lib/actions/dashboard/domainOperationsSnapshot.js');
const analyticsLib = read('lib/storefront/storefrontAnalytics.js');
const analyticsRoute = read('app/api/storefront/[businessDomain]/analytics/route.js');
const beacon = read('components/storefront/StorefrontAnalyticsBeacon.jsx');
const storeLayout = read('app/store/[businessDomain]/layout.jsx');
const ordersRoute = read('app/api/storefront/[businessDomain]/orders/route.js');

if (!intel.includes('getBusinessRegionalPack')) {
  mark('domainOperationsIntelligence must use regional business pack');
}
if (!intel.includes('parts_desk')) {
  mark('domainOperationsIntelligence must define parts_desk mode for auto-parts');
}
if (!intel.includes('showManufacturing')) {
  mark('domainOperationsIntelligence must expose manufacturing operations');
}

if (!subjects.includes('BOOKING_LEAD_SUBJECTS')) {
  mark('domainOperationsSubjects must list booking lead subjects');
}

if (!snapshot.includes('getDomainKnowledgeForBusiness')) {
  mark('domainOperationsSnapshot must use regional domain knowledge');
}
if (!snapshot.includes('fetchBusinessRow')) {
  mark('domainOperationsSnapshot must load business row for country/category');
}
if (!snapshot.includes('pos_transactions')) {
  mark('domainOperationsSnapshot must include POS in active buyers and collections');
}
if (!snapshot.includes('production_orders')) {
  mark('domainOperationsSnapshot must query manufacturing WIP when enabled');
}

if (!analyticsLib.includes('recordStorefrontVisit')) {
  mark('storefrontAnalytics must record visits');
}
if (!analyticsRoute.includes('recordStorefrontVisit')) {
  mark('storefront analytics API route must exist');
}
if (!beacon.includes('sessionStorage')) {
  mark('StorefrontAnalyticsBeacon must dedupe visits per session');
}
if (!storeLayout.includes('StorefrontAnalyticsBeacon')) {
  mark('store layout must mount StorefrontAnalyticsBeacon');
}
if (!ordersRoute.includes('recordStorefrontOrderAnalytics')) {
  mark('storefront checkout must roll up order analytics');
}

const contactRoute = read('app/api/storefront/[businessDomain]/contact/route.js');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260618_storefront_operations_hub/migration.sql');
const contactAction = read('lib/actions/dashboard/storefrontContactMessages.js');
const panel = read('components/dashboard/easy/DomainOperationsPanel.tsx');
const pkg = read('package.json');

if (!pkg.includes('verify:domain-operations')) {
  mark('package.json must define verify:domain-operations script');
}
if (!pkg.includes('verify:storefront-operations-db')) {
  mark('package.json must define verify:storefront-operations-db script');
}
if (!schema.includes('model storefront_contact_messages')) {
  mark('prisma schema must define storefront_contact_messages');
}
if (!migration.includes('storefront_contact_messages')) {
  mark('20260618_storefront_operations_hub migration must create contact messages table');
}
if (!migration.includes('visitors')) {
  mark('20260618_storefront_operations_hub migration must add storefront_analytics.visitors');
}
if (!contactAction.includes('updateStorefrontContactStatusAction')) {
  mark('storefrontContactMessages action must update contact status');
}
if (!panel.includes('updateStorefrontContactStatusAction')) {
  mark('DomainOperationsPanel must wire mark-handled for contact queue');
}
if (!analyticsLib.includes('uuid_generate_v4()')) {
  mark('storefrontAnalytics upsert must supply analytics row id');
}
if (!contactRoute.includes('STOREFRONT_CONTACT_SUBJECTS')) {
  mark('contact route must use STOREFRONT_CONTACT_SUBJECTS (pharmacy/booking alignment)');
}
if (!subjects.includes('STOREFRONT_CONTACT_SUBJECTS')) {
  mark('domainOperationsSubjects must export STOREFRONT_CONTACT_SUBJECTS');
}
if (!subjects.includes("'prescription'")) {
  mark('domainOperationsSubjects must include prescription subject');
}
if (!snapshot.includes('SELECT id, customer_name, subject, status, created_at')) {
  mark('domainOperationsSnapshot contact queue must omit email/message body from hub payload');
}
if (!snapshot.includes('payload.memberships')) {
  mark('domainOperationsSnapshot must include membership KPIs for membership verticals');
}
if (!snapshot.includes('overdueRenewals')) {
  mark('domainOperationsSnapshot must include overdue membership renewals KPI');
}
if (!intel.includes('showMembership')) {
  mark('domainOperationsIntelligence must expose membership operations mode');
}

if (failed) {
  console.error('\nDomain operations verification failed.');
  process.exit(1);
}

console.log('Domain operations verification passed.');
