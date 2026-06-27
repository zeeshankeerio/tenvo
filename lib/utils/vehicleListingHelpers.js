/**
 * Helpers for vehicle marketplace / dealership product listings.
 * Aligns hub form category + brand with domain_data used on storefront filters.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';

const VEHICLE_VERTICALS = new Set(['auto-marketplace', 'vehicle-dealership']);

/** @param {string | null | undefined} category */
export function isVehicleListingVertical(category) {
  return VEHICLE_VERTICALS.has(resolveDomainKey(category));
}

/** Product hub categories by storefront condition */
const CONDITION_TO_CATEGORY = {
  new: 'New Cars',
  'pre-owned': 'Pre-Owned',
  preowned: 'Pre-Owned',
  used: 'Used Cars',
  rental: 'Rental Cars',
};

/**
 * @param {string | null | undefined} condition
 * @param {'auto-marketplace' | 'vehicle-dealership'} [vertical]
 */
export function vehicleCategoryFromCondition(condition, vertical = 'auto-marketplace') {
  const c = String(condition || '').toLowerCase();
  if (vertical === 'vehicle-dealership') {
    if (c === 'new') return 'New Cars';
    if (c === 'pre-owned' || c === 'preowned' || c === 'used') return 'Pre-Owned';
    return 'New Cars';
  }
  return CONDITION_TO_CATEGORY[c] || 'Used Cars';
}

/**
 * Suggested inventory categories for vehicle verticals (hub product.category).
 * @param {string | null | undefined} category
 */
export function getVehicleListingCategories(category) {
  const key = resolveDomainKey(category);
  if (key === 'vehicle-dealership') {
    return [
      'All Cars',
      'New Cars',
      'Pre-Owned',
      'Used Cars',
      'Luxury',
      'Imported',
      'Bikes',
      'Auto Store',
      'Car Care',
      'LED & Lightening',
      'Modifications',
      'PPF',
      'Conversions',
      'Window Films',
    ];
  }
  if (key === 'auto-marketplace') {
    return ['New Cars', 'Used Cars', 'Rental Cars', 'Tyres', 'Parts & Accessories'];
  }
  return [];
}

/**
 * Keep products.brand in sync with domain_data.vehiclemake for storefront brand filters.
 * @param {Record<string, unknown>} domainData
 * @param {string} make
 */
export function withSyncedVehicleBrand(domainData, make) {
  const next = { ...(domainData || {}) };
  if (make) {
    next.vehiclemake = make;
  }
  return next;
}
