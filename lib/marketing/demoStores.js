/**
 * Curated public demo storefronts for sales / marketing pages.
 * Source of truth: `lib/dataLab/domains.mjs` (re-seed with `bun run data-lab:seed`).
 */
import { ALL_DEMO_SEEDS, DEMO_BUSINESS_PACK } from '../dataLab/domains.mjs';

const FULL_DOMAINS = new Set(DEMO_BUSINESS_PACK.map((s) => s.domain));

/**
 * @typedef {{ key: string; name: string; domain: string; country: string; href: string; tier: 'full' | 'showcase' }} ClientDemoStore
 */

/** @type {ClientDemoStore[]} */
export const CLIENT_DEMO_STORES = ALL_DEMO_SEEDS.map((spec) => ({
  key: spec.key,
  name: spec.name.replace(/^Tenvo\s+/, '').replace(/\s+Demo$/, ''),
  domain: spec.domain,
  country: spec.country,
  href: `/store/${spec.domain}`,
  tier: FULL_DOMAINS.has(spec.domain) ? 'full' : 'showcase',
}));

/** Featured subset for compact UI (one per major vertical family) */
export const FEATURED_DEMO_STORES = CLIENT_DEMO_STORES.filter((s) =>
  [
    'demo-boutique',
    'demo-jewellery',
    'demo-restaurant',
    'demo-pharmacy',
    'demo-supermarket',
    'demo-hardware',
    'demo-bakery',
    'demo-electronics',
    'demo-mobile',
    'demo-salon',
    'demo-furniture',
    'demo-autoparts',
    'demo-showroom',
    'demo-sgcarmart',
  ].includes(s.domain)
);
