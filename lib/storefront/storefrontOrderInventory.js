import { InventoryService } from '@/lib/services/InventoryService';

/**
 * FIFO-pick available serial numbers for a storefront sale when the product is serial-tracked.
 * Returns [] when the product has no available serials (simple / non-serial inventory).
 *
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<string[]>}
 */
export async function allocateStorefrontSerialNumbers(client, businessId, productId, quantity) {
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty <= 0) return [];

  const availableRes = await client.query(
    `SELECT serial_number
     FROM product_serials
     WHERE business_id = $1::uuid
       AND product_id = $2::uuid
       AND COALESCE(is_deleted, false) = false
       AND LOWER(COALESCE(status, '')) IN ('in_stock', 'available', 'reserved')
     ORDER BY COALESCE(created_at, updated_at) ASC NULLS LAST, id ASC
     LIMIT $3
     FOR UPDATE`,
    [businessId, productId, qty]
  );

  if (availableRes.rows.length === 0) return [];

  if (availableRes.rows.length < qty) {
    throw new Error(
      `Insufficient serial numbers available. Need ${qty}, have ${availableRes.rows.length}.`
    );
  }

  return availableRes.rows.map((row) => row.serial_number);
}

/**
 * Canonical storefront checkout stock decrement inside an open pg transaction.
 * Routes variant lines through InventoryService.removeVariantStock and
 * headline/location lines through removeStock with FIFO sellable locations.
 * Auto-allocates serials when the product has available serial inventory.
 *
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {{ productId: string, quantity: number, isVariant?: boolean, variantId?: string | null }} line
 * @param {{ orderId?: string | number, orderNumber?: string }} orderRef
 */
export async function decrementStorefrontOrderLineStock(client, businessId, line, orderRef = {}) {
  const qty = Number(line.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return;

  const { orderId = null, orderNumber = null } = orderRef;
  const notes = orderNumber ? `Storefront sale - Order ${orderNumber}` : 'Storefront sale';
  const domainData = {
    storefront_order_id: orderId,
    storefront_order_number: orderNumber,
  };

  if (line.isVariant && line.variantId) {
    await InventoryService.removeVariantStock(
      {
        business_id: businessId,
        product_id: line.productId,
        variant_id: line.variantId,
        quantity: qty,
        reference_type: 'storefront_order',
        notes,
        domain_data: domainData,
      },
      null,
      client
    );
    return;
  }

  const serialNumbers = await allocateStorefrontSerialNumbers(
    client,
    businessId,
    line.productId,
    qty
  );

  await InventoryService.removeStock(
    {
      business_id: businessId,
      product_id: line.productId,
      quantity: qty,
      reference_type: 'storefront_order',
      notes,
      fifo_sellable_locations: true,
      skip_accounting: true,
      serial_numbers: serialNumbers,
    },
    null,
    client
  );
}
