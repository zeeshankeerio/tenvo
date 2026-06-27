/**
 * Smoke-test registration provisioning helpers (no DB required).
 * Run: node scripts/verify-registration-flow.mjs
 */
import {
  buildRegistrationSeedPayload,
  buildRegistrationSettingsSnapshot,
  buildRegistrationDomainProfile,
  buildDemoCatalogPayload,
} from '../lib/utils/registrationSeed.js';
import { getDefaultCoaForCountry } from '../lib/config/regionalCoa.js';
import { getDomainKnowledge } from '../lib/domainKnowledge.js';
import { DOMAIN_KNOWLEDGE_KEYS } from '../lib/domainKnowledge.js';
import { resolveDomainKey } from '../lib/config/domainKeyAliases.js';

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const bizId = '00000000-0000-0000-0000-000000000001';

const pkAutoParts = buildRegistrationSeedPayload({
  businessId: bizId,
  domainKey: 'auto-parts',
  countryIso: 'PK',
});
assert(pkAutoParts.items.length >= 25, 'auto-parts registration should seed archive catalog');
assert(pkAutoParts.categories.includes('Filters'), 'auto-parts registration should include Filters category');
assert(
  pkAutoParts.items.every((i) => i.business_id === bizId),
  'auto-parts seed items must be tenant-scoped'
);

const pkRetail = buildRegistrationSeedPayload({
  businessId: bizId,
  domainKey: 'retail-shop',
  countryIso: 'PK',
});
assert(pkRetail.items.length === 0, 'Registration must not seed demo products for retail-shop');

const pkDealership = buildRegistrationSeedPayload({
  businessId: bizId,
  domainKey: 'vehicle-dealership',
  countryIso: 'PK',
});
assert(pkDealership.items.length >= 30, 'vehicle-dealership registration should seed Tenvo Vehicles catalog');
assert(pkDealership.items.every((i) => i.image_url?.startsWith('https://')), 'Dealership seed images should be HTTPS CDN URLs');
assert(pkDealership.categories.includes('All Cars'), 'Dealership seed should include All Cars category');
assert(pkRetail.categories.length > 0, 'PK retail-shop should produce category shells');
assert(pkRetail.domainProfile?.automation, 'Registration should include automation defaults');
assert(pkRetail.domainProfile?.intelligence, 'Registration should include intelligence defaults');

const aePharmacy = buildRegistrationSeedPayload({
  businessId: bizId,
  domainKey: 'pharmacy',
  countryIso: 'AE',
});
assert(aePharmacy.items.length === 0, 'Registration must not seed products for AE pharmacy');
assert(aePharmacy.categories.length > 0, 'AE pharmacy should produce categories');

const demoAuto = buildDemoCatalogPayload({
  businessId: bizId,
  domainKey: 'auto-parts',
  countryIso: 'SG',
});
assert(demoAuto.items.length >= 10, 'Demo catalog auto-parts should have rich products');
assert(demoAuto.items.every((i) => i.image_url), 'Demo catalog items should include images');

const profile = buildRegistrationDomainProfile({ domainKey: 'auto-parts', countryIso: 'SG' });
assert(profile.domainSnapshot.key === 'auto-parts', 'Domain profile key');
assert(profile.automation.reorderEnabled === true, 'Auto-parts reorder automation');

const coaAe = getDefaultCoaForCountry('AE');
assert(
  coaAe.some((a) => a.name.includes('VAT') && !a.name.includes('FBR')),
  'AE COA should use VAT labels'
);

const snap = buildRegistrationSettingsSnapshot('US', null, { domainVertical: 'retail-shop' });
assert(snap.country_iso === 'US', 'Registration snapshot country_iso');
assert(snap.domain_vertical === 'retail-shop', 'Registration snapshot domain_vertical');

const dk = getDomainKnowledge('mobile', { countryIso: 'US' });
assert(dk.countryIso === 'US', 'getDomainKnowledge sets countryIso for US');
assert(Array.isArray(dk.marketFeatures?.popularBrands), 'US mobile should expose market brands');

for (const key of DOMAIN_KNOWLEDGE_KEYS.slice(0, 5)) {
  const payload = buildRegistrationSeedPayload({
    businessId: bizId,
    domainKey: key,
    countryIso: 'PK',
  });
  const canonical = resolveDomainKey(key);
  const expectProducts =
    canonical === 'vehicle-dealership' || canonical === 'auto-parts';
  assert(
    Array.isArray(payload.items) && (expectProducts ? payload.items.length > 0 : payload.items.length === 0),
    expectProducts
      ? `${canonical} should seed starter products on registration`
      : `no products for ${key}`
  );
  assert(Array.isArray(payload.categories), `category array for ${key}`);
}

if (errors.length) {
  for (const e of errors) console.error(`FAIL: ${e}`);
  process.exit(1);
}

console.log('OK: registration flow helpers (empty inventory, domain profile, demo catalog split).');
