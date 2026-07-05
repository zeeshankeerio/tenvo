/**
 * Smart defaults for new inventory grid rows (Busy / Excel rapid entry).
 * Inherits category, unit, tax, and domain_data from the previous row or vertical presets.
 */

import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { getDomainDefaults, resolveDomainFieldKey } from '@/lib/utils/domainHelpers';

const ROW_SPECIFIC_DOMAIN_KEYS = new Set([
  'sizecolormatrix',
  'articleno',
  'designno',
  'sku',
  'barcode',
  'imei',
  'serialnumber',
]);

/**
 * @param {string} category
 * @param {string|number} businessId
 * @param {Record<string, unknown>|null} [previousRow]
 * @param {{ countryIso?: string }} [options]
 */
export function buildNewInventoryRow(category, businessId, previousRow = null, options = {}) {
  const { countryIso } = options;
  const knowledge = countryIso
    ? getDomainKnowledge(category, { countryIso })
    : getDomainKnowledge(category);
  const domainDefaults = getDomainDefaults(category, previousRow);
  const templateCategories = knowledge?.setupTemplate?.categories;
  const defaultCategory =
    previousRow?.category ||
    (Array.isArray(templateCategories) && templateCategories[0]) ||
    'General';

  const defaultUnit = previousRow?.unit || knowledge?.units?.[0] || 'pcs';
  const defaultTax =
    previousRow?.tax_percent != null && previousRow.tax_percent !== ''
      ? Number(previousRow.tax_percent)
      : knowledge?.defaultTax ?? 17;

  const domain_data = {};
  for (const field of knowledge?.productFields || []) {
    const key = resolveDomainFieldKey(field, category);
    if (ROW_SPECIFIC_DOMAIN_KEYS.has(key)) continue;
    const inherited =
      previousRow?.domain_data?.[key] ??
      previousRow?.domain_data?.[field];
    domain_data[key] = inherited ?? domainDefaults[key] ?? '';
  }
  if (previousRow?.domain_data && typeof previousRow.domain_data === 'object') {
    Object.entries(previousRow.domain_data).forEach(([key, val]) => {
      if (!ROW_SPECIFIC_DOMAIN_KEYS.has(String(key).toLowerCase()) && domain_data[key] == null) {
        domain_data[key] = val;
      }
    });
  }

  const minStock =
    previousRow?.min_stock ??
    previousRow?.minStock ??
    domainDefaults.minStock ??
    domainDefaults.min_stock ??
    10;

  return {
    _tempId: crypto.randomUUID(),
    name: '',
    sku: '',
    barcode: previousRow?.barcode ? '' : '',
    price: 0,
    stock: 0,
    business_id: businessId,
    category: defaultCategory,
    unit: defaultUnit,
    tax_percent: defaultTax,
    brand: previousRow?.brand || '',
    hsn_code: previousRow?.hsn_code || knowledge?.defaultHSN || null,
    min_stock: minStock,
    reorder_point: previousRow?.reorder_point ?? domainDefaults.reorderPoint ?? minStock,
    domain_data,
    is_active: true,
  };
}

/**
 * Pick the last non-empty row from a product list for inherit-on-add.
 * @param {Array<Record<string, unknown>>} products
 */
export function getLastRowForDefaults(products) {
  if (!Array.isArray(products) || products.length === 0) return null;
  for (let i = products.length - 1; i >= 0; i -= 1) {
    const row = products[i];
    if (row && (row.name || row.sku || row.category || row.brand)) {
      return row;
    }
  }
  return products[products.length - 1] || null;
}
