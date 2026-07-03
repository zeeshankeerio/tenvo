/**
 * Storefront product identity — cart and stock APIs expect tenant-scoped UUIDs.
 */
export const STOREFRONT_PRODUCT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 */
export function isStorefrontProductUuid(value) {
  return typeof value === 'string' && STOREFRONT_PRODUCT_UUID_RE.test(value.trim());
}

/**
 * Resolve a product ref (UUID, slug, or SKU) to a canonical products.id for one tenant.
 * @param {import('pg').PoolClient} client
 * @param {string} productRef
 * @param {string} businessId
 * @returns {Promise<string | null>}
 */
export async function resolveStorefrontProductId(client, productRef, businessId) {
  const ref = String(productRef || '').trim();
  if (!ref || !businessId) return null;
  if (isStorefrontProductUuid(ref)) return ref;

  const bySku = await client.query(
    `SELECT id FROM products
     WHERE business_id = $1::uuid AND sku = $2
       AND COALESCE(is_deleted, false) = false AND is_active = true
     LIMIT 1`,
    [businessId, ref]
  );
  if (bySku.rows[0]?.id) return bySku.rows[0].id;

  try {
    const bySlug = await client.query(
      `SELECT id FROM products
       WHERE business_id = $1::uuid AND slug = $2
         AND COALESCE(is_deleted, false) = false AND is_active = true
       LIMIT 1`,
      [businessId, ref]
    );
    if (bySlug.rows[0]?.id) return bySlug.rows[0].id;
  } catch (err) {
    if (err?.code !== '42703') throw err;
  }

  return null;
}
