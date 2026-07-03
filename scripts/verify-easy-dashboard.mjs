/**
 * Static wiring checks for Easy mode dashboard (tabbed one-pager + domain intelligence).
 * Run: node scripts/verify-easy-dashboard.mjs
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

const domainDashboard = read('app/business/[category]/components/tabs/DomainDashboard.tsx');
const easyDashboard = read('components/dashboard/easy/EasyBusinessDashboard.tsx');
const easyIntel = read('lib/dashboard/easyDomainIntelligence.js');
const opsIntel = read('lib/dashboard/domainOperationsIntelligence.js');
const opsSnapshot = read('lib/actions/dashboard/domainOperationsSnapshot.js');
const opsPanel = read('components/dashboard/easy/DomainOperationsPanel.tsx');
const easyHelpers = read('lib/dashboard/easyDashboardHelpers.js');
const industryInsights = read('app/business/[category]/components/islands/IndustryInsights.client.tsx');

if (!domainDashboard.includes('isEasyMode')) {
  mark('DomainDashboard must branch on isEasyMode');
}
if (!domainDashboard.includes('EasyBusinessDashboard')) {
  mark('DomainDashboard must render EasyBusinessDashboard in easy mode');
}
if (!domainDashboard.includes('resolveProductStock')) {
  mark('DomainDashboard must use resolveProductStock for inventory KPIs');
}

if (!easyDashboard.includes('TabsList')) {
  mark('EasyBusinessDashboard must use shadcn Tabs for one-page layout');
}
if (!easyDashboard.includes('resolveEasyTabForAction')) {
  mark('EasyBusinessDashboard must route insights via resolveEasyTabForAction');
}
if (!easyDashboard.includes('buildDomainStockSignals')) {
  mark('EasyBusinessDashboard must show domain stock signals on Stock tab');
}
if (!easyDashboard.includes('buildProductSparkHeights')) {
  mark('EasyBusinessDashboard must use real product sparklines from invoices');
}
if (easyDashboard.includes('sparkHeights={[40, 55, 35, 70]}')) {
  mark('EasyBusinessDashboard must not use hardcoded product sparklines');
}

if (!easyIntel.includes('VERTICAL_PLAYBOOKS')) {
  mark('easyDomainIntelligence must define vertical playbooks');
}
if (!easyDashboard.includes('DomainOperationsPanel')) {
  mark('EasyBusinessDashboard must render DomainOperationsPanel on Operations tab');
}
if (!easyDashboard.includes('value="operations"')) {
  mark('EasyBusinessDashboard must define Operations tab');
}

if (!opsIntel.includes('resolveOperationsProfile')) {
  mark('domainOperationsIntelligence must expose resolveOperationsProfile');
}
if (!opsIntel.includes('parts_desk')) {
  mark('domainOperationsIntelligence must define parts_desk mode');
}
if (!opsSnapshot.includes('getDomainOperationsSnapshotAction')) {
  mark('domainOperationsSnapshot action must exist');
}
if (!opsSnapshot.includes('storefront_contact_messages')) {
  mark('domainOperationsSnapshot must aggregate storefront contact queue');
}
if (!opsPanel.includes('buildOperationsKpiTiles')) {
  mark('DomainOperationsPanel must use buildOperationsKpiTiles');
}

if (!easyIntel.includes('operations')) {
  mark('easyDomainIntelligence must support operations tab badges/guidance');
}

if (!easyHelpers.includes('resolveProductStock')) {
  mark('easyDashboardHelpers must resolve display stock');
}
if (!easyHelpers.includes('buildProductSparkHeights')) {
  mark('easyDashboardHelpers must build product sparklines from invoice lines');
}

if (!industryInsights.includes("variant?: 'default' | 'compact'")) {
  mark('IndustryInsights must support compact variant for Easy mode');
}

const pkg = read('package.json');
if (!pkg.includes('verify:easy-dashboard')) {
  mark('package.json must define verify:easy-dashboard script');
}

if (failed) {
  console.error('\nEasy dashboard verification failed.');
  process.exit(1);
}

console.log('Easy dashboard verification passed.');
