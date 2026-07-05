/**
 * Mobile Excel / bulk-entry column profile and layout helpers.
 * Keeps data entry focused on high-signal fields below the lg breakpoint.
 */

import { buildInventoryGridColumns } from '@/lib/utils/inventoryGridColumns';
import { resolveInventoryDomainFeatures } from '@/lib/utils/inventoryDomainFeatures';

/** Core fields for every vertical on mobile bulk entry. */
export const EXCEL_MOBILE_ESSENTIAL_KEYS = new Set([
  'name',
  'sku',
  'barcode',
  'category',
  'brand',
  'price',
  'cost_price',
  'stock',
  'min_stock',
  'reorder_point',
  'mrp',
  'max_stock',
]);

/** Minimum touch-friendly column widths (px) on compact viewports. */
export const EXCEL_MOBILE_COLUMN_MIN_WIDTH = {
  name: 160,
  sku: 120,
  barcode: 120,
  category: 120,
  brand: 110,
  price: 100,
  cost_price: 100,
  stock: 88,
  min_stock: 88,
  max_stock: 88,
  mrp: 100,
  reorder_point: 100,
  batch_number: 120,
  batch_quantity: 100,
  default: 96,
};

/**
 * Domain-aware essential keys: base retail fields + tracking + top domain_data columns.
 * @param {string} category
 * @param {object} [options]
 */
export function resolveExcelMobileEssentialKeys(category, options = {}) {
  const keys = new Set(EXCEL_MOBILE_ESSENTIAL_KEYS);
  const features = resolveInventoryDomainFeatures(category, options);

  if (features.batchTrackingEnabled) {
    keys.add('batch_number');
    keys.add('batch_quantity');
  }
  if (features.expiryTrackingEnabled) {
    keys.add('expiry_date');
  }
  if (features.serialTrackingEnabled) {
    keys.add('serial_number');
  }

  const cols = buildInventoryGridColumns(category, { mode: 'excel', ...options });
  let domainCount = 0;
  for (const col of cols) {
    const key = col.accessorKey || col.id;
    if (!key?.startsWith('domain_data.')) continue;
    if (domainCount >= 4) break;
    keys.add(key);
    domainCount += 1;
  }

  return keys;
}

/**
 * Keys to hide on mobile so the grid stays legible; user can re-enable via Columns picker.
 * @param {Array<{ accessorKey?: string, id?: string }>} columns
 * @param {string} [category]
 * @param {object} [options]
 */
export function buildExcelMobileHiddenColumnKeys(columns = [], category = 'retail-shop', options = {}) {
  const essential = resolveExcelMobileEssentialKeys(category, options);
  const hidden = new Set();
  for (const col of columns) {
    const key = col.accessorKey || col.id;
    if (!key || key === 'status_dot') continue;
    if (!essential.has(key)) {
      hidden.add(key);
    }
  }
  return hidden;
}

/**
 * Editable columns for mobile card view (non-readOnly, visible).
 * @param {Array} columns
 * @param {Set<string>} hiddenCols
 */
export function filterExcelMobileEditableColumns(columns = [], hiddenCols = new Set()) {
  return columns.filter((col) => {
    const key = col.accessorKey || col.id;
    if (!key || col.readOnly) return false;
    if (col.id === 'status_dot' || key === '__actions' || key === 'value') return false;
    return !hiddenCols.has(key);
  });
}

/**
 * @param {{ accessorKey?: string, id?: string, width?: number, size?: number }} col
 * @param {boolean} touchOptimized
 */
export function resolveExcelMobileColumnWidth(col, touchOptimized) {
  if (!touchOptimized) return null;
  const key = col.accessorKey || col.id;
  if (!key) return EXCEL_MOBILE_COLUMN_MIN_WIDTH.default;
  return EXCEL_MOBILE_COLUMN_MIN_WIDTH[key] ?? EXCEL_MOBILE_COLUMN_MIN_WIDTH.default;
}
