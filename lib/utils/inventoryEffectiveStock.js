/**
 * Hub/grid effective on-hand quantity — mirrors ProductService.resolveDisplayStock.
 */
import {
  filterMeaningfulBatches,
  isMeaningfulInventoryBatch,
} from '@/lib/utils/inventoryTrackingHelpers';

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {object | null | undefined} product
 * @returns {number}
 */
export function resolveInventoryEffectiveStock(product) {
  if (!product) return 0;
  const base = toFiniteNumber(product.stock, 0);
  const locs = Array.isArray(product.stock_locations)
    ? product.stock_locations
    : Array.isArray(product.product_stock_locations)
      ? product.product_stock_locations
      : [];
  if (locs.length > 0) {
    return locs.reduce((sum, row) => sum + toFiniteNumber(row?.quantity, 0), 0);
  }

  const batches = Array.isArray(product.batches)
    ? product.batches
    : Array.isArray(product.product_batches)
      ? product.product_batches
      : [];
  const meaningfulBatches = batches.filter(isMeaningfulInventoryBatch);
  const batchSum = meaningfulBatches.reduce((sum, b) => {
    const q = toFiniteNumber(b?.quantity, 0);
    const r = toFiniteNumber(b?.reserved_quantity, 0);
    return sum + Math.max(0, q - r);
  }, 0);

  const vars = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.product_variants)
      ? product.product_variants
      : [];
  const variantSum =
    vars.length > 0 ? vars.reduce((sum, v) => sum + toFiniteNumber(v?.stock, 0), 0) : 0;

  if (meaningfulBatches.length === 0 && variantSum === 0) {
    return base;
  }
  if (meaningfulBatches.length === 1 && variantSum === 0) {
    return batchSum > 0 ? batchSum : base;
  }
  if (meaningfulBatches.length > 0 && variantSum === 0) {
    return Math.max(base, batchSum);
  }
  if (variantSum > 0) {
    return Math.max(base, batchSum, variantSum);
  }
  return base;
}

/**
 * Load stock snapshot inside a composite upsert transaction.
 * @param {import('pg').PoolClient} client
 * @param {string} productId
 * @param {string} businessId
 */
export async function loadProductStockSnapshot(client, productId, businessId) {
  const res = await client.query(
    `
    SELECT
      p.stock,
      COALESCE((
        SELECT json_agg(json_build_object('quantity', psl.quantity, 'state', psl.state))
        FROM product_stock_locations psl
        WHERE psl.product_id = p.id AND psl.business_id = p.business_id
      ), '[]'::json) AS stock_locations,
      COALESCE((
        SELECT json_agg(json_build_object(
          'quantity', pb.quantity,
          'reserved_quantity', pb.reserved_quantity,
          'batch_number', pb.batch_number
        ))
        FROM product_batches pb
        WHERE pb.product_id = p.id
          AND pb.business_id = p.business_id
          AND pb.is_active = true
          AND (pb.is_deleted = false OR pb.is_deleted IS NULL)
      ), '[]'::json) AS batches,
      COALESCE((
        SELECT json_agg(json_build_object('stock', pv.stock))
        FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.business_id = p.business_id
          AND (pv.is_deleted = false OR pv.is_deleted IS NULL)
      ), '[]'::json) AS variants
    FROM products p
    WHERE p.id = $1::uuid AND p.business_id = $2::uuid
    LIMIT 1
    `,
    [productId, businessId]
  );

  const row = res.rows[0];
  if (!row) {
    return { headlineStock: 0, effectiveStock: 0, snapshot: null };
  }

  const snapshot = {
    stock: row.stock,
    stock_locations: row.stock_locations || [],
    batches: row.batches || [],
    variants: row.variants || [],
  };

  return {
    headlineStock: toFiniteNumber(row.stock, 0),
    effectiveStock: resolveInventoryEffectiveStock(snapshot),
    snapshot,
  };
}
