/**
 * Validates cross-domain audit fixes (no DB required).
 * Run: npx tsx scripts/verify-audit-fixes.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveDomainKey } from '../lib/config/domainKeyAliases.js';
import {
  resolveDomainPackageForVertical,
  buildRegistrationFromDomainPackage,
} from '../lib/config/domainPackages.js';
import {
  shouldSeedRichCatalogOnRegistration,
  PACKAGE_RICH_CATALOG_VERTICALS,
  SUPERMARKET_REGISTRATION_VERTICALS,
} from '../lib/onboarding/registrationRichVerticals.js';
import {
  isFashionEditorialStore,
  FASHION_EDITORIAL_CANONICALS,
  FASHION_EDITORIAL_EXCLUDED,
} from '../lib/storefront/fashionEditorial.js';
import { resolveRegistrationStorefrontDefaults } from '../lib/onboarding/registrationStorefrontDefaults.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

// --- Static wiring ---

const resolveSrc = read('lib/tenancy/resolveStorefrontBusiness.js');
assert(
  resolveSrc.includes('const domainRow = await queryBusinessByDomainSegment(normalizedDomain, client)') &&
    resolveSrc.includes('domainRow?.id === redisCached.id'),
  'Redis cache hit must revalidate domain → tenant mapping via Postgres'
);

const widgetsSrc = read('lib/actions/dashboard/widgets.js');
for (const fn of ['getTodaysSales', 'getCycleCountTasks', 'getTaxCalculations', 'getTeamPerformance']) {
  const idx = widgetsSrc.indexOf(`export async function ${fn}`);
  assert(idx >= 0, `${fn} must exist`);
  const body = widgetsSrc.slice(idx, idx + 400);
  assert(body.includes('withGuard'), `${fn} must call withGuard`);
}

const reorderSrc = read('lib/actions/standard/inventory/reorder.js');
assert(
  reorderSrc.includes('Alert and business context are required'),
  'dismissLowStockAlertAction must require businessId'
);
assert(
  read('lib/services/ReorderAutomationService.js').includes('WHERE id = $1 AND business_id = $2::uuid'),
  'dismissLowStockAlert must scope UPDATE by business_id'
);

const businessSrc = read('lib/actions/basic/business.js');
assert(businessSrc.includes('resolveRegistrationCategoryKey'), 'createBusiness must canonicalize category');
assert(
  businessSrc.includes('domainKey: registrationCategory') &&
    !businessSrc.includes('domainKey: normalizedCategory'),
  'provisionRegistrationSeed must use canonical registrationCategory'
);
assert(
  businessSrc.includes('resolveBusinessDomainPackageKey') &&
    businessSrc.includes('domainPackageKey: resolvedPackageKey'),
  'seedRegistrationInventoryAction must pass domain package key for rich seed gate'
);

const cartSrc = read('app/api/storefront/[businessDomain]/cart/sync/route.js');
assert(cartSrc.includes('status: 503') && cartSrc.includes('synced: false'), 'cart/sync must fail closed on error');

const pkgSrc = read('lib/config/domainPackages.js');
assert(
  pkgSrc.includes('resolveDomainKey(String(verticalKey).trim())') &&
    pkgSrc.includes('resolveDomainKey(v) === canonical'),
  'resolveDomainPackageForVertical must resolve aliases'
);

// --- Behavioral ---

assert(resolveDomainKey('grocery') === 'supermarket', 'grocery alias → supermarket');
assert(SUPERMARKET_REGISTRATION_VERTICALS.has('grocery'), 'grocery in supermarket registration set');

assert(isFashionEditorialStore('boutique-fashion') === true, 'boutique-fashion is editorial');
assert(isFashionEditorialStore('textile-wholesale') === true, 'textile-wholesale is editorial');
assert(isFashionEditorialStore('gems-jewellery') === false, 'gems-jewellery excluded from editorial');
assert(isFashionEditorialStore('textile-mill') === false, 'textile-mill excluded from editorial');
assert(!FASHION_EDITORIAL_CANONICALS.has('gems-jewellery'), 'gems-jewellery not in editorial canonicals');
assert(FASHION_EDITORIAL_EXCLUDED.has('textile-mill'), 'textile-mill in editorial excluded set');

assert(
  shouldSeedRichCatalogOnRegistration('pharmacy', 'US', { domainPackageKey: 'pharmacy-commerce' }),
  'pharmacy-commerce package seeds pharmacy catalog outside PK'
);
assert(
  shouldSeedRichCatalogOnRegistration('furniture', 'US', { domainPackageKey: 'furniture-commerce' }),
  'furniture-commerce package seeds furniture catalog outside PK'
);
assert(
  shouldSeedRichCatalogOnRegistration('garments', 'US', { domainPackageKey: 'clothing-commerce' }),
  'clothing-commerce package seeds garments outside PK'
);
assert(
  !shouldSeedRichCatalogOnRegistration('garments', 'US', {}),
  'garments without PK or package must not rich-seed'
);

const pkgTextile = resolveDomainPackageForVertical('textile');
assert(
  pkgTextile?.key === 'clothing-commerce',
  'textile alias resolves to clothing-commerce package'
);
const pkgApparel = resolveDomainPackageForVertical('apparel');
assert(
  pkgApparel?.key === 'clothing-commerce',
  'apparel alias resolves to clothing-commerce package'
);

const regFromTextileAlias = buildRegistrationFromDomainPackage('clothing-commerce', {
  verticalKey: 'textile',
});
assert(
  regFromTextileAlias.category === 'textile-wholesale',
  'registration package resolves textile alias to textile-wholesale vertical'
);

// Editorial seed only when rich catalog gate passes
const editorialPk = resolveRegistrationStorefrontDefaults({
  domainKey: 'boutique-fashion',
  businessName: 'Test Boutique',
  regional: { countryName: 'Pakistan', countryCode: 'PK', currency: 'PKR', locale: 'en-PK' },
  domainPackageKey: null,
});
assert(
  editorialPk.storefrontExtras?.storefront?.fashion?.showUnstitched !== undefined ||
    editorialPk.storefrontExtras?.storefront?.fashion,
  'PK boutique with rich seed gets fashion editorial defaults'
);

const editorialNonPkNoPkg = resolveRegistrationStorefrontDefaults({
  domainKey: 'boutique-fashion',
  businessName: 'Test Boutique',
  regional: { countryName: 'United States', countryCode: 'US', currency: 'USD', locale: 'en-US' },
  domainPackageKey: null,
});
const fashionSeedNonPk =
  editorialNonPkNoPkg.storefrontExtras?.storefront?.fashion;
assert(!fashionSeedNonPk || Object.keys(fashionSeedNonPk).length === 0, 'non-PK boutique without package skips editorial seed');

const editorialMill = resolveRegistrationStorefrontDefaults({
  domainKey: 'textile-mill',
  businessName: 'Test Mill',
  regional: { countryName: 'Pakistan', countryCode: 'PK', currency: 'PKR', locale: 'en-PK' },
  domainPackageKey: null,
});
const millFashion = editorialMill.storefrontExtras?.storefront?.fashion;
assert(!millFashion || Object.keys(millFashion).length === 0, 'textile-mill must not get editorial seed');

assert(PACKAGE_RICH_CATALOG_VERTICALS.has('pharmacy-commerce'), 'PACKAGE_RICH_CATALOG_VERTICALS includes pharmacy');

const productRefSrc = read('lib/utils/storefrontProductRef.js');
assert(
  productRefSrc.includes('id = $1::uuid AND business_id = $2::uuid') &&
    !productRefSrc.includes('if (isStorefrontProductUuid(ref)) return ref;'),
  'resolveStorefrontProductId must verify UUID ownership before returning'
);

const productsSrc = read('lib/actions/storefront/products.js');
assert(
  productsSrc.includes('rejectInvalidStorefrontBusinessId') &&
    productsSrc.includes('Valid business ID is required'),
  'storefront product actions must validate businessId UUID'
);
assert(
  productsSrc.includes('resolveStorefrontProductId(client, productId, businessId)') &&
    productsSrc.includes('fetchRelatedProductsUncached'),
  'getRelatedProducts must resolve product refs with tenant ownership'
);

const checkoutCartSrc = read('lib/storefront/validateCheckoutCart.js');
assert(
  !checkoutCartSrc.includes('if (isStorefrontProductUuid(ref)) return ref;'),
  'checkout cart resolver must not trust raw client UUIDs'
);

if (failures.length) {
  console.error('verify-audit-fixes FAILED');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log('verify-audit-fixes OK');
