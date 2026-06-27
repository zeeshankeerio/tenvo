/**
 * Representative demo businesses — full transactional depth on `primary`.
 * Showcase pack adds client-facing storefronts; use `--all-domains` for every vertical key.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';

export const PRIMARY_DEMO_DOMAIN = 'textile';

/** @typedef {{ key: string, name: string, domain: string, country: string, fullSeed?: boolean, showcase?: boolean }} DemoBusinessSpec */

/** Full hub + operational depth (invoices, POS, storefront orders) */
/** @type {DemoBusinessSpec[]} */
export const DEMO_BUSINESS_PACK = [
  { key: 'textile', name: 'Tenvo Textile Demo', domain: 'demo-textile', country: 'Pakistan', fullSeed: true },
  { key: 'retail-shop', name: 'Tenvo Retail Demo', domain: 'demo-retail', country: 'Pakistan', fullSeed: true },
  { key: 'restaurant', name: 'Tenvo Kitchen', domain: 'demo-restaurant', country: 'Pakistan', fullSeed: true },
  { key: 'pharmacy', name: 'Tenvo Pharmacy', domain: 'demo-pharmacy', country: 'Pakistan', fullSeed: true },
  { key: 'dental-clinic', name: 'Tenvo Dental Demo', domain: 'demo-dental', country: 'Pakistan', fullSeed: true },
  { key: 'supermarket', name: 'Tenvo Supermarket Demo', domain: 'demo-supermarket', country: 'Pakistan', fullSeed: true },
  { key: 'hardware-store', name: 'Tenvo Hardware Demo', domain: 'demo-hardware', country: 'Pakistan', fullSeed: true },
  { key: 'auto-parts', name: 'Tenvo Auto Parts Demo', domain: 'demo-autoparts', country: 'Singapore', fullSeed: true },
  { key: 'vehicle-dealership', name: 'Tenvo Car Dealership', domain: 'demo-showroom', country: 'Pakistan', fullSeed: true },
  { key: 'auto-marketplace', name: 'Tenvo Auto Marketplace', domain: 'demo-sgcarmart', country: 'Singapore', fullSeed: true },
];

/**
 * Additional client-facing storefront demos (catalog + branding; no full operational seed).
 * @type {DemoBusinessSpec[]}
 */
export const DEMO_SHOWCASE_PACK = [
  { key: 'bakery', name: 'Tenvo Bakery Demo', domain: 'demo-bakery', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'boutique', name: 'Tenvo Boutique Demo', domain: 'demo-boutique', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'gems-jewellery', name: 'Tenvo Jewellery Demo', domain: 'demo-jewellery', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'electronics', name: 'Tenvo Electronics Demo', domain: 'demo-electronics', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'mobile', name: 'Tenvo Mobile Shop Demo', domain: 'demo-mobile', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'salon', name: 'Tenvo Salon & Spa Demo', domain: 'demo-salon', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'vet', name: 'Tenvo Veterinary Demo', domain: 'demo-vet', country: 'United Arab Emirates', fullSeed: false, showcase: true },
  { key: 'clinics-healthcare', name: 'Tenvo Clinic Demo', domain: 'demo-clinic', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'furniture', name: 'Tenvo Furniture Store', domain: 'demo-furniture', country: 'Pakistan', fullSeed: true, showcase: true },
  { key: 'mobile-repairing', name: 'Tenvo Mobile Repair Demo', domain: 'demo-mobile-repair', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'computer-hardware', name: 'Tenvo Computer Hardware Demo', domain: 'demo-computers', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'diagnostic-lab', name: 'Tenvo Diagnostic Lab Demo', domain: 'demo-lab', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'ecommerce', name: 'Tenvo E‑Commerce Demo', domain: 'demo-ecommerce', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'fmcg', name: 'Tenvo FMCG Demo', domain: 'demo-fmcg', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'solar-energy', name: 'Tenvo Solar Demo', domain: 'demo-solar', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'bookshop-stationery', name: 'Tenvo Bookshop Demo', domain: 'demo-bookshop', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'leather-footwear', name: 'Tenvo Footwear Demo', domain: 'demo-footwear', country: 'Pakistan', fullSeed: false, showcase: true },
  { key: 'gym-fitness', name: 'Tenvo Fitness Demo', domain: 'demo-fitness', country: 'Pakistan', fullSeed: false, showcase: true },
];

/** Default seed set: full pack + client showcase storefronts */
export const ALL_DEMO_SEEDS = [...DEMO_BUSINESS_PACK, ...DEMO_SHOWCASE_PACK];

/** Hub tabs exercised when `fullSeed` is true */
export const FULL_SEED_COVERAGE = [
  'dashboard',
  'invoices',
  'inventory',
  'customers',
  'vendors',
  'payments',
  'purchases',
  'sales',
  'pos',
  'orders',
  'accounting',
  'reports',
];

/**
 * Resolved vertical keys already covered by explicit demo seeds.
 * @returns {Set<string>}
 */
export function getCoveredDemoDomainKeys() {
  return new Set(ALL_DEMO_SEEDS.map((spec) => resolveDomainKey(spec.key)));
}

/**
 * Public store slug for a vertical when bootstrapping `--all-domains` leftovers.
 * @param {string} domainKey
 */
export function getDemoDomainHandle(domainKey) {
  const resolved = resolveDomainKey(domainKey);
  const fromPack = ALL_DEMO_SEEDS.find((s) => resolveDomainKey(s.key) === resolved);
  if (fromPack) return fromPack.domain;
  const compact = String(domainKey)
    .replace(/-wholesale|-confectionery|-fashion|-goods|-clinic|-healthcare|-stationery/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
  return `demo-${compact || 'store'}`;
}
