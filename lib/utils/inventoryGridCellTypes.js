/** Shared numeric cell detection for BusyGrid + mobile card entry. */

export const INVENTORY_NUMERIC_CELL_KEYS = new Set([
  'stock',
  'price',
  'cost_price',
  'costPrice',
  'mrp',
  'min_stock',
  'minStock',
  'max_stock',
  'maxStock',
  'reorder_point',
  'reorderPoint',
  'reorder_quantity',
  'reorderQuantity',
  'tax_percent',
  'taxPercent',
  'unitcost',
  'batch_quantity',
  'credit_limit',
  'opening_balance',
  'value',
]);

export function isNumericInventoryCell(accessorKey) {
  if (!accessorKey) return false;
  if (INVENTORY_NUMERIC_CELL_KEYS.has(accessorKey)) return true;
  return accessorKey.includes('width') || accessorKey.includes('length');
}
