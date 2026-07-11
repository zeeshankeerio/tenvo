import { resolveStorefrontDisplayStock } from '@/lib/storefront/storefrontDisplayStock';

/**
 * @param {import('pg').PoolClient} client
 * @param {string} productId
 * @param {string} businessId
 * @returns {Promise<number | null>} null when table missing
 */
export async function querySellableLocationQty(client, productId, businessId) {
  try {
    const res = await client.query(
      `SELECT COALESCE(SUM(quantity), 0)::float AS location_qty,
              COUNT(*)::int AS location_count
       FROM product_stock_locations
       WHERE product_id = $1::uuid AND business_id = $2::uuid
         AND COALESCE(state, 'sellable') = 'sellable'`,
      [productId, businessId]
    );
    const locationCount = Number(res.rows[0]?.location_count ?? 0);
    // null = no sellable location rows → callers fall back to headline stock
    if (locationCount === 0) return null;
    return parseFloat(res.rows[0]?.location_qty ?? 0);
  } catch (err) {
    if (err.code === '42P01') return null;
    throw err;
  }
}

/**
 * Batch sellable warehouse sums for product list pages.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string[]} productIds
 * @returns {Promise<Map<string, number>>}
 */
export async function querySellableLocationQtyBatch(client, businessId, productIds) {
  if (!productIds?.length) return new Map();
  try {
    const res = await client.query(
      `SELECT product_id, COALESCE(SUM(quantity), 0)::float AS location_qty
       FROM product_stock_locations
       WHERE business_id = $1::uuid AND product_id = ANY($2::uuid[])
         AND COALESCE(state, 'sellable') = 'sellable'
       GROUP BY product_id`,
      [businessId, productIds]
    );
    return new Map(res.rows.map((row) => [row.product_id, parseFloat(row.location_qty ?? 0)]));
  } catch (err) {
    if (err.code === '42P01') return new Map();
    throw err;
  }
}

/**
 * Batch total active-variant stock per product for catalog list display.
 * Lets variant products (clothing/footwear) show the SUM of all size/color
 * variant stock on cards, not just the default variant's stock.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string[]} productIds
 * @returns {Promise<Map<string, number>>}
 */
export async function queryVariantStockSumBatch(client, businessId, productIds) {
  if (!productIds?.length) return new Map();
  try {
    const res = await client.query(
      `SELECT product_id, COALESCE(SUM(stock), 0)::float AS variant_stock
       FROM product_variants
       WHERE business_id = $1::uuid AND product_id = ANY($2::uuid[])
         AND COALESCE(is_active, true) = true
         AND COALESCE(is_deleted, false) = false
       GROUP BY product_id`,
      [businessId, productIds]
    );
    return new Map(res.rows.map((row) => [row.product_id, parseFloat(row.variant_stock ?? 0)]));
  } catch (err) {
    if (err.code === '42P01') return new Map();
    throw err;
  }
}

/** @param {unknown} val */
export function parseStockNumber(val) {
  if (val == null) return null;
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sellable qty for cart/checkout (aligned with storefront catalog display).
 */
export function resolveSellableStockQty({ headlineStock, locationQty, variants = [] }) {
  return resolveStorefrontDisplayStock({
    stock: parseStockNumber(headlineStock),
    variants: variants.map((v) => ({ stock: parseStockNumber(v?.stock) })),
    locationQty,
  });
}

/**
 * Decrement warehouse rows (FIFO) and headline product stock inside an open transaction.
 * @deprecated Prefer InventoryService.removeStock with fifo_sellable_locations via
 * decrementStorefrontOrderLineStock. Kept for legacy callers / tests only.
 * @param {import('pg').PoolClient} client
 */
export async function decrementHeadlineAndLocationsInTx(client, businessId, productId, quantity) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return;

  let remaining = qty;
  try {
    const locRes = await client.query(
      `SELECT id, quantity::float AS quantity
       FROM product_stock_locations
       WHERE product_id = $1::uuid AND business_id = $2::uuid
         AND COALESCE(state, 'sellable') = 'sellable'
         AND quantity > 0
       ORDER BY COALESCE(created_at, updated_at) ASC NULLS LAST, id ASC`,
      [productId, businessId]
    );

    for (const row of locRes.rows) {
      if (remaining <= 0) break;
      const available = parseFloat(row.quantity);
      const take = Math.min(remaining, available);
      if (take <= 0) continue;
      await client.query(
        `UPDATE product_stock_locations
         SET quantity = quantity - $1::numeric, updated_at = NOW()
         WHERE id = $2::uuid AND business_id = $3::uuid`,
        [take, row.id, businessId]
      );
      remaining -= take;
    }
  } catch (err) {
    if (err.code !== '42P01') throw err;
  }

  const qtyInt = Math.min(2147483647, Math.floor(qty));
  await client.query(
    `UPDATE products
     SET stock = GREATEST(0, COALESCE(stock, 0) - $1::numeric),
         sales_count = COALESCE(sales_count, 0) + $2::int,
         updated_at = NOW()
     WHERE id = $3::uuid AND business_id = $4::uuid`,
    [qty, qtyInt, productId, businessId]
  );
}

/**
 * Record an inventory ledger + stock movement for a storefront sale so the sale is
 * visible in valuation/audit trails (symmetric with the cancel/return restock path).
 *
 * Wrapped in a SAVEPOINT: if the movement/ledger tables are missing or shaped
 * differently, only this savepoint rolls back — the customer order still commits.
 *
 * This path covers headline / location-tracked (non-variant) products. Size/color
 * variant sales are audited separately via recordStorefrontVariantSaleMovementInTx.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} productId
 * @param {number} quantity
 * @param {{ orderId?: number | string, orderNumber?: string }} [ref]
 */
export async function recordStorefrontSaleMovementInTx(
  client,
  businessId,
  productId,
  quantity,
  ref = {}
) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return;

  const { orderId = null, orderNumber = null } = ref;

  await client.query('SAVEPOINT sf_sale_movement');
  try {
    const primaryRes = await client.query(
      `SELECT id FROM warehouse_locations
       WHERE business_id = $1::uuid AND is_primary = TRUE
       LIMIT 1`,
      [businessId]
    );
    let warehouseId = primaryRes.rows[0]?.id || null;
    if (!warehouseId) {
      const anyRes = await client.query(
        `SELECT id FROM warehouse_locations WHERE business_id = $1::uuid LIMIT 1`,
        [businessId]
      );
      warehouseId = anyRes.rows[0]?.id || null;
    }

    const prodRes = await client.query(
      `SELECT stock, cost_price FROM products WHERE id = $1::uuid AND business_id = $2::uuid`,
      [productId, businessId]
    );
    const runningBalance = parseFloat(prodRes.rows[0]?.stock || 0);
    const costPrice = parseFloat(prodRes.rows[0]?.cost_price || 0);

    const note = orderNumber ? `Storefront sale - Order ${orderNumber}` : 'Storefront sale';
    const domainData = JSON.stringify({
      storefront_order_id: orderId,
      storefront_order_number: orderNumber,
    });

    const moveRes = await client.query(
      `INSERT INTO stock_movements (
        business_id, product_id, warehouse_id, movement_type, transaction_type,
        quantity_change, unit_cost, reference_type, reference_id, notes, domain_data, created_at
      ) VALUES ($1, $2, $3, 'out', 'sale', $4, $5, 'storefront_order', null, $6, $7, NOW())
      RETURNING id`,
      [businessId, productId, warehouseId, -qty, costPrice, note, domainData]
    );

    await client.query(
      `INSERT INTO inventory_ledger (
        business_id, warehouse_id, product_id, transaction_type,
        reference_id, reference_type, quantity_change, running_balance,
        unit_cost, total_value, notes, created_at
      ) VALUES ($1, $2, $3, 'sale', $4, 'storefront_order', $5, $6, $7, $8, $9, NOW())`,
      [businessId, warehouseId, productId, moveRes.rows[0].id, -qty, runningBalance, costPrice, -qty * costPrice, note]
    );

    await client.query('RELEASE SAVEPOINT sf_sale_movement');
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT sf_sale_movement');
    console.warn('[storefront sale movement] skipped:', err?.message || err);
  }
}

/**
 * Record a stock movement audit row for a size/color variant storefront sale.
 *
 * Variant stock lives on `product_variants.stock` (a separate dimension from
 * `products.stock` / `product_stock_locations`), so it is not part of the
 * headline inventory_ledger running balance. We still record a `stock_movements`
 * row (which supports `variant_id`, same as VariantService adjustments) so variant
 * sales — the norm for clothing/footwear — appear in movement audit trails.
 *
 * Wrapped in a SAVEPOINT: any failure rolls back only this audit write, never the
 * customer order.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} productId
 * @param {string} variantId
 * @param {number} quantity
 * @param {{ orderId?: number | string, orderNumber?: string }} [ref]
 */
export async function recordStorefrontVariantSaleMovementInTx(
  client,
  businessId,
  productId,
  variantId,
  quantity,
  ref = {}
) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0 || !variantId) return;

  const { orderId = null, orderNumber = null } = ref;

  await client.query('SAVEPOINT sf_variant_sale_movement');
  try {
    const primaryRes = await client.query(
      `SELECT id FROM warehouse_locations
       WHERE business_id = $1::uuid AND is_primary = TRUE
       LIMIT 1`,
      [businessId]
    );
    let warehouseId = primaryRes.rows[0]?.id || null;
    if (!warehouseId) {
      const anyRes = await client.query(
        `SELECT id FROM warehouse_locations WHERE business_id = $1::uuid LIMIT 1`,
        [businessId]
      );
      warehouseId = anyRes.rows[0]?.id || null;
    }

    const vRes = await client.query(
      `SELECT cost_price FROM product_variants WHERE id = $1::uuid AND business_id = $2::uuid`,
      [variantId, businessId]
    );
    const costPrice = parseFloat(vRes.rows[0]?.cost_price || 0);

    const note = orderNumber ? `Storefront sale - Order ${orderNumber}` : 'Storefront sale';
    const domainData = JSON.stringify({
      storefront_order_id: orderId,
      storefront_order_number: orderNumber,
      variant_id: variantId,
    });

    await client.query(
      `INSERT INTO stock_movements (
        business_id, product_id, variant_id, warehouse_id, movement_type, transaction_type,
        quantity_change, unit_cost, reference_type, reference_id, notes, domain_data, created_at
      ) VALUES ($1, $2, $3, $4, 'out', 'sale', $5, $6, 'storefront_order', null, $7, $8, NOW())`,
      [businessId, productId, variantId, warehouseId, -qty, costPrice, note, domainData]
    );

    await client.query('RELEASE SAVEPOINT sf_variant_sale_movement');
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT sf_variant_sale_movement');
    console.warn('[storefront variant sale movement] skipped:', err?.message || err);
  }
}
