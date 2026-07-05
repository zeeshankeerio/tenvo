#!/usr/bin/env node
/**
 * Static wiring checks for domain-specific commercial packages.
 * Run: node scripts/verify-domain-packages.mjs
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

const EXPECTED_PACKAGES = [
  'clothing-commerce',
  'pharmacy-commerce',
  'auto-parts-commerce',
  'vehicle-showroom',
  'furniture-commerce',
  'fitness-commerce',
];

const catalog = read('lib/config/domainPackages.js');
const features = read('lib/config/domainPackageFeatures.js');
const business = read('lib/actions/basic/business.js');
const register = read('app/register/page.js');
const dynamicPage = read('app/solutions/[slug]/page.jsx');
const dynamicLayout = read('app/solutions/[slug]/layout.jsx');
const solutionsContent = read('lib/marketing/domainPackageSolutionsContent.js');
const billingCards = read('components/billing/DomainPackageBillingCards.jsx');
const marketingNav = read('components/marketing/layout/MarketingNav.jsx');
const industryPlansPage = read('app/industry-plans/page.jsx');
const domainPackageNav = read('lib/marketing/domainPackageNav.js');

for (const key of EXPECTED_PACKAGES) {
  if (!catalog.includes(`'${key}'`)) mark(`package key ${key} in domainPackages.js`);
  if (!solutionsContent.includes(`'${key}'`)) mark(`marketing content for ${key}`);
}

if (!features.includes('buildDomainPackageFeatureOverrides')) mark('feature override builder');
if (!features.includes('CLOTHING_COMMERCE_FEATURE_OVERRIDES')) mark('clothing feature overrides');
if (!features.includes('PHARMACY_COMMERCE_FEATURE_OVERRIDES')) mark('pharmacy feature overrides');
if (!features.includes('AUTO_PARTS_COMMERCE_FEATURE_OVERRIDES')) mark('auto parts feature overrides');
if (!features.includes('VEHICLE_SHOWROOM_FEATURE_OVERRIDES')) mark('showroom feature overrides');
if (!features.includes('FURNITURE_COMMERCE_FEATURE_OVERRIDES')) mark('furniture feature overrides');
if (!features.includes('FITNESS_COMMERCE_FEATURE_OVERRIDES')) mark('fitness feature overrides');

if (!catalog.includes('demoStoreDomain')) mark('demoStoreDomain on packages');
if (!solutionsContent.includes("icon: 'Globe'")) mark('solutions content uses serializable icon names');
if (solutionsContent.includes("from 'lucide-react'")) mark('solutions content must not import lucide-react (RSC boundary)');
const solutionsPage = read('components/marketing/solutions/DomainPackageSolutionsPage.jsx');
if (!solutionsPage.includes('getDemoStoreHeroByDomain')) mark('solutions page resolves demo hero at render time');
if (!catalog.includes('getDomainPackageBySlug')) mark('slug resolver');

if (!catalog.includes('buildRegistrationFromDomainPackage')) mark('registration builder');
if (!catalog.includes('getDomainPackageRegisterHref')) mark('register href helper');

if (!business.includes('buildRegistrationFromDomainPackage')) mark('createBusiness imports domain packages');
if (!catalog.includes('resolveDomainPackageForVertical')) mark('resolveDomainPackageForVertical export');
if (!catalog.includes('resolveDomainKey(String(verticalKey).trim())')) {
  mark('resolveDomainPackageForVertical must resolve domain aliases');
}
if (!business.includes('resolveRegistrationCategoryKey')) mark('createBusiness must canonicalize category');

if (!register.includes("params.get('package')")) mark('register reads package query param');

if (!dynamicPage.includes('getDomainPackageBySlug')) mark('dynamic solutions page');
if (!dynamicLayout.includes('generateMetadata')) mark('dynamic solutions layout metadata');

if (!billingCards.includes('listDomainPackageBillableSkus')) mark('billing cards use catalog-resolved prices');

if (!domainPackageNav.includes('listIndustryPlanNavItems')) mark('domain package nav helper');
if (!domainPackageNav.includes("hubPath: '/industry-plans'")) mark('industry plans hub path');
if (!marketingNav.includes('INDUSTRY_PLANS_NAV')) mark('marketing nav industry plans dropdown');
if (!industryPlansPage.includes('IndustryPlansHubPage')) mark('industry plans hub page');
const heroShowcase = read('components/marketing/solutions/DomainPackageHeroShowcase.jsx');
const verticalMeta = read('lib/marketing/domainPackageVerticalMeta.js');
if (!heroShowcase.includes('DomainPackageHeroShowcase')) mark('domain package hero showcase');
if (!heroShowcase.includes("kind === 'vertical'")) mark('hero showcase must render vertical preset slides');
if (!verticalMeta.includes('buildUnifiedPackageSlides')) mark('unified package slides builder');
if (!verticalMeta.includes('enrichVerticalPresetSlides')) mark('vertical preset slide meta');
if (!solutionsPage.includes('DomainPackageHeroShowcase')) mark('solutions page uses hero showcase');
if (!solutionsPage.includes('buildUnifiedPackageSlides')) mark('solutions page uses unified hero slides');
if (solutionsPage.includes('DomainPackageVerticalSlider')) mark('solutions page must not use separate vertical slider');
if (!verticalMeta.includes('export const PACKAGE_CHANNEL_HERO_IMAGES')) mark('channel hero images per package');

// Parity: every catalog package uses the same solutions page contract (static analysis — no @/ imports)
const REQUIRED_CONTENT_KEYS = [
  'heroEyebrow',
  'channelsHeading',
  'channelsLead',
  'modulesHeading',
  'modulesLead',
  'channelPillars',
  'verticalPresets',
  'highlightFeatures',
  'ctaTitle',
];

for (const key of EXPECTED_PACKAGES) {
  const anchor = `'${key}': {`;
  const start = solutionsContent.indexOf(anchor);
  if (start < 0) {
    mark(`${key} solutions content block missing`);
    continue;
  }
  const nextStarts = EXPECTED_PACKAGES.map((k) =>
    k === key ? -1 : solutionsContent.indexOf(`'${k}': {`, start + anchor.length)
  ).filter((i) => i >= 0);
  const end = nextStarts.length ? Math.min(...nextStarts) : solutionsContent.length;
  const block = solutionsContent.slice(start, end);

  for (const field of REQUIRED_CONTENT_KEYS) {
    if (!block.includes(`${field}:`)) mark(`${key} missing content.${field}`);
  }
  const channelBlock = block.match(/channelPillars:\s*\[([\s\S]*?)\],\s*verticalPresets/)?.[1] || '';
  const pillarTitles = (channelBlock.match(/title:\s*'/g) || []).length;
  if (pillarTitles !== 3) mark(`${key} must have exactly 3 channelPillars (found ${pillarTitles})`);

  const presetBlock = block.match(/verticalPresets:\s*\[([\s\S]*?)\],\s*faqTitle/)?.[1] || '';
  const presetKeys = [...presetBlock.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
  if (!presetKeys.length) mark(`${key} must define at least one verticalPresets entry`);
  for (const presetKey of presetKeys) {
    const metaKey = /[-]/.test(presetKey) ? `'${presetKey}':` : `${presetKey}:`;
    if (!verticalMeta.includes(metaKey)) {
      mark(`${key} vertical preset ${presetKey} missing VERTICAL_PRESET_SLIDE_META`);
    }
  }
  const channelHeroRe = new RegExp(`'${key}':\\s*\\[([\\s\\S]*?)\\],`, 'm');
  const channelHeroMatch = verticalMeta.match(channelHeroRe);
  if (!channelHeroMatch) {
    mark(`${key} missing PACKAGE_CHANNEL_HERO_IMAGES entry`);
  } else {
    const heroLines = channelHeroMatch[1]
      .split('\n')
      .filter((line) => /https?:|fashionStockImage|unsplash|AUTO_PARTS|FITNESS_ASSETS/.test(line));
    if (heroLines.length < 3) mark(`${key} must define 3 PACKAGE_CHANNEL_HERO_IMAGES`);
  }
  if (!catalog.includes(`key: '${key}'`) && !catalog.includes(`key:'${key}'`)) {
    const pkgKeyRe = new RegExp(`key:\\s*'${key}'`);
    if (!pkgKeyRe.test(catalog)) mark(`${key} missing from domainPackages catalog`);
  }
  const demoRe = new RegExp(`key:\\s*'${key}'[\\s\\S]*?demoStoreDomain:\\s*'([^']+)'`);
  if (!demoRe.test(catalog)) mark(`${key} must set demoStoreDomain in domainPackages`);
}

// Shared hero UX contract
const HERO_CTA_MARKERS = [
  'Register with this preset',
  'Start with this suite',
  'Use suite default',
  'Book a walkthrough',
  'Registration preset included',
  'Pick your vertical at registration',
  "kind === 'vertical'",
  "kind === 'channel'",
  "kind === 'intro'",
];
for (const marker of HERO_CTA_MARKERS) {
  if (!heroShowcase.includes(marker)) mark(`hero showcase missing "${marker}"`);
}
if (!solutionsPage.includes('DomainPackageHeroShowcase')) mark('solutions page uses hero showcase for all packages');
if (solutionsPage.includes('DomainPackageVerticalSlider')) mark('solutions page must not use separate vertical slider');

if (!read('package.json').includes('verify:billing-packages')) mark('npm script verify:billing-packages');

if (fs.existsSync(path.join(root, 'app/solutions/clothing-commerce/page.jsx'))) {
  mark('legacy clothing-commerce page should be removed in favor of [slug] route');
}

if (failed) {
  console.error('verify-domain-packages: failures above');
  process.exit(1);
}
console.log('verify-domain-packages: OK');
