/**
 * Resolve inventory feature flags and knowledge for a tenant vertical.
 * Prefer live domainKnowledge from hub (country-aware) over bare category helpers.
 */

import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import {
  isBatchTrackingEnabled,
  isSerialTrackingEnabled,
  isExpiryTrackingEnabled,
  isManufacturingEnabled,
  isSizeColorMatrixEnabled,
  resolveDomainFieldKey,
  readDomainFieldValue,
  normalizeKey,
} from '@/lib/utils/domainHelpers';

/**
 * @param {string} category
 * @param {{ domainKnowledge?: object, business?: object, countryIso?: string }} [ctx]
 */
export function resolveInventoryDomainFeatures(category, ctx = {}) {
  const { domainKnowledge: passed, business, countryIso } = ctx;

  const knowledge =
    passed?.productFields || passed?.batchTrackingEnabled != null
      ? passed
      : business
        ? getDomainKnowledgeForBusiness(category, business)
        : countryIso
          ? getDomainKnowledge(category, { countryIso })
          : getDomainKnowledge(category);

  return {
    knowledge,
    batchTrackingEnabled: Boolean(
      knowledge?.batchTrackingEnabled ?? isBatchTrackingEnabled(category)
    ),
    serialTrackingEnabled: Boolean(
      knowledge?.serialTrackingEnabled ?? isSerialTrackingEnabled(category)
    ),
    expiryTrackingEnabled: Boolean(
      knowledge?.expiryTrackingEnabled ?? isExpiryTrackingEnabled(category)
    ),
    manufacturingEnabled: Boolean(
      knowledge?.manufacturingEnabled ?? isManufacturingEnabled(category)
    ),
    multiLocationEnabled: Boolean(knowledge?.multiLocationEnabled),
    sizeColorMatrixEnabled: Boolean(
      knowledge?.sizeColorMatrixEnabled ?? isSizeColorMatrixEnabled(category)
    ),
    productFields: knowledge?.productFields || [],
    intelligence: knowledge?.intelligence || {},
  };
}

/**
 * Compact domain attribute chips for hub inventory list cards (any vertical).
 * @param {string} category
 * @param {object} product
 * @param {{ domainKnowledge?: object, countryIso?: string, limit?: number }} [ctx]
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export function buildInventoryDomainChips(category, product, ctx = {}) {
  const { limit = 2 } = ctx;
  const features = resolveInventoryDomainFeatures(category, ctx);
  const fields = features.productFields || [];
  const dd = product?.domain_data;
  if (!dd || typeof dd !== 'object' || !fields.length) return [];

  const chips = [];
  const seen = new Set();

  for (const field of fields) {
    if (chips.length >= limit) break;
    const key = resolveDomainFieldKey(field, category);
    if (['name', 'sku', 'barcode', 'price', 'stock', 'category', 'brand', 'images'].includes(key)) {
      continue;
    }
    const val = readDomainFieldValue(dd, key, category);
    if (val == null || val === '') continue;
    const display = String(val).trim();
    if (!display || seen.has(display.toLowerCase())) continue;
    seen.add(display.toLowerCase());
    const label = field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    chips.push({ key, label, value: display });
  }

  if (chips.length < limit && dd) {
    for (const [rawKey, val] of Object.entries(dd)) {
      if (chips.length >= limit) break;
      if (val == null || val === '') continue;
      const key = normalizeKey(rawKey);
      if (
        ['sourcing', 'fabrictype', 'size', 'color', 'vehiclemake', 'vehiclemodel', 'partnumber'].includes(
          key
        )
      ) {
        const display = String(val).trim();
        if (!display || seen.has(display.toLowerCase())) continue;
        seen.add(display.toLowerCase());
        chips.push({
          key,
          label: rawKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: display,
        });
      }
    }
  }

  return chips.slice(0, limit);
}
