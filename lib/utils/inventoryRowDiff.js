/**
 * Field-level diff for inventory grid rows (Excel bulk save).
 * Avoids JSON.stringify pitfalls with key order, Decimals, and Dates.
 */

const DIFF_SCALAR_KEYS = [
  'name',
  'sku',
  'barcode',
  'category',
  'brand',
  'unit',
  'description',
  'price',
  'cost_price',
  'mrp',
  'stock',
  'tax_percent',
  'min_stock',
  'max_stock',
  'reorder_point',
  'reorder_quantity',
  'hsn_code',
  'sac_code',
  'location',
  'image_url',
  'is_active',
  'batch_number',
  'batch_quantity',
  'expiry_date',
  'manufacturing_date',
  'serial_number',
];

function normalizeForDiff(value) {
  if (value === undefined) return null;
  if (value === null || value === '') return null;
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    const n = value.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      const sorted =
        value && !Array.isArray(value)
          ? Object.keys(value)
              .sort()
              .reduce((acc, k) => {
                acc[k] = value[k];
                return acc;
              }, {})
          : value;
      return JSON.stringify(sorted);
    } catch {
      return String(value);
    }
  }
  return String(value).trim();
}

function relationDiffers(a, b) {
  return normalizeForDiff(a) !== normalizeForDiff(b);
}

/** True when `item` differs from `original` on persisted fields. */
export function inventoryRowsDiffer(original, item) {
  if (!original) return true;

  for (const key of DIFF_SCALAR_KEYS) {
    if (relationDiffers(original[key], item[key])) return true;
  }

  if (relationDiffers(original.domain_data, item.domain_data)) return true;
  if (relationDiffers(original.batches, item.batches)) return true;
  if (relationDiffers(original.serial_numbers, item.serial_numbers)) return true;
  if (relationDiffers(original.serialNumbers, item.serialNumbers)) return true;

  return false;
}
