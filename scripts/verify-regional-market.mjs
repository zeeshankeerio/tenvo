/**
 * Verify country-aware brand catalogs cover all 62 verticals for PK, AE, US, CN, SA.
 * Run: bun scripts/verify-regional-market.mjs  (or: bun run verify:regional-market)
 */
import { DOMAIN_KNOWLEDGE_KEYS } from '../lib/domainKnowledge.js';
import {
  getBrandsForMarket,
  getBrandCategoryForDomain,
  SUPPORTED_MARKET_ISO,
} from '../lib/regionalMarket/index.js';

const errors = [];

for (const key of DOMAIN_KNOWLEDGE_KEYS) {
  const category = getBrandCategoryForDomain(key);
  if (!category) errors.push(`Missing brand category for domain "${key}"`);
  for (const iso of SUPPORTED_MARKET_ISO) {
    const brands = getBrandsForMarket(iso, key);
    if (!brands.length) {
      errors.push(`Empty brand catalog for ${iso} / ${key} (${category})`);
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error(`FAIL: ${e}`);
  process.exit(1);
}

console.log(
  `OK: ${DOMAIN_KNOWLEDGE_KEYS.length} domains × ${SUPPORTED_MARKET_ISO.length} markets (PK, AE, US, CN, SA) brand catalogs wired.`
);
