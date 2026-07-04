/**
 * Storefront clothing / variant helpers — PDP selection, cart, and checkout guardrails.
 */

const VARIANT_SELECT_SQL = `
  SELECT
    pv.id,
    COALESCE(NULLIF(TRIM(pv.variant_sku), ''), NULLIF(TRIM(pv.variant_name), ''), '') AS sku,
    pv.variant_name,
    pv.price,
    pv.stock,
    CASE
      WHEN pv.stock IS NULL THEN 'in_stock'
      WHEN pv.stock <= 0 THEN 'out_of_stock'
      WHEN pv.stock <= 5 THEN 'low_stock'
      ELSE 'in_stock'
    END AS stock_status,
    'Size' AS attribute_1_name,
    pv.size AS attribute_1_value,
    'Color' AS attribute_2_name,
    pv.color AS attribute_2_value,
    'Material' AS attribute_3_name,
    pv.material AS attribute_3_value,
    pv.image_url,
    COALESCE(pv.is_default, false) AS is_default
  FROM product_variants pv
  WHERE pv.product_id = $1::uuid
    AND pv.business_id = $2::uuid
    AND COALESCE(pv.is_active, true) = true
    AND COALESCE(pv.is_deleted, false) = false
  ORDER BY COALESCE(pv.is_default, false) DESC, pv.created_at ASC NULLS LAST`;

const VARIANT_SELECT_SQL_NO_DEFAULT = `
  SELECT
    pv.id,
    COALESCE(NULLIF(TRIM(pv.variant_sku), ''), NULLIF(TRIM(pv.variant_name), ''), '') AS sku,
    pv.variant_name,
    pv.price,
    pv.stock,
    CASE
      WHEN pv.stock IS NULL THEN 'in_stock'
      WHEN pv.stock <= 0 THEN 'out_of_stock'
      WHEN pv.stock <= 5 THEN 'low_stock'
      ELSE 'in_stock'
    END AS stock_status,
    'Size' AS attribute_1_name,
    pv.size AS attribute_1_value,
    'Color' AS attribute_2_name,
    pv.color AS attribute_2_value,
    'Material' AS attribute_3_name,
    pv.material AS attribute_3_value,
    pv.image_url,
    false AS is_default
  FROM product_variants pv
  WHERE pv.product_id = $1::uuid
    AND pv.business_id = $2::uuid
    AND COALESCE(pv.is_active, true) = true
    AND COALESCE(pv.is_deleted, false) = false
  ORDER BY pv.created_at ASC NULLS LAST`;

/** @param {import('pg').PoolClient} client @param {string} productId @param {string} businessId */
export async function loadStorefrontProductVariants(client, productId, businessId) {
  try {
    let result;
    try {
      result = await client.query(VARIANT_SELECT_SQL, [productId, businessId]);
    } catch (err) {
      if (err.code === '42703' && String(err.message).includes('is_default')) {
        result = await client.query(VARIANT_SELECT_SQL_NO_DEFAULT, [productId, businessId]);
      } else {
        throw err;
      }
    }
    return result.rows;
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return [];
    throw err;
  }
}

/** @param {object | null | undefined} variant */
export function variantHasPurchasableAttributes(variant) {
  if (!variant) return false;
  return Boolean(
    variant.attribute_1_value ||
      variant.attribute_2_value ||
      variant.attribute_3_value ||
      variant.size ||
      variant.color ||
      variant.material
  );
}

/** @param {{ has_variants?: boolean, variants?: object[] } | null | undefined} product */
export function productHasSelectableVariants(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return false;
  return variants.some(variantHasPurchasableAttributes);
}

/** @param {{ has_variants?: boolean } | null | undefined} product */
export function catalogProductNeedsVariantPage(product) {
  return Boolean(product?.has_variants);
}

/** @param {{ has_variants?: boolean, variants?: object[] } | null | undefined} product */
export function resolveStorefrontVariantRequirement(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  if (variants.length === 0) {
    return {
      required: Boolean(product?.has_variants),
      defaultVariant: null,
      variantCount: 0,
    };
  }

  const purchasable = variants.filter(variantHasPurchasableAttributes);

  if (purchasable.length <= 1) {
    return {
      required: false,
      defaultVariant: purchasable[0] || variants[0] || null,
      variantCount: variants.length,
    };
  }

  return {
    required: true,
    defaultVariant: null,
    variantCount: variants.length,
  };
}

/** @param {import('pg').PoolClient} client @param {string} productId @param {string} businessId */
export async function queryStorefrontVariantRequirement(client, productId, businessId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM product_variants pv
     WHERE pv.product_id = $1::uuid
       AND pv.business_id = $2::uuid
       AND COALESCE(pv.is_active, true) = true
       AND COALESCE(pv.is_deleted, false) = false
       AND (
         NULLIF(TRIM(pv.size), '') IS NOT NULL
         OR NULLIF(TRIM(pv.color), '') IS NOT NULL
         OR NULLIF(TRIM(pv.material), '') IS NOT NULL
         OR NULLIF(TRIM(pv.variant_name), '') IS NOT NULL
       )`,
    [productId, businessId]
  );

  const count = Number(result.rows[0]?.count || 0);

  if (count <= 1) {
    if (count === 1) {
      const single = await client.query(
        `SELECT id FROM product_variants
         WHERE product_id = $1::uuid AND business_id = $2::uuid
           AND COALESCE(is_active, true) = true
           AND COALESCE(is_deleted, false) = false
         ORDER BY COALESCE(is_default, false) DESC, created_at ASC NULLS LAST
         LIMIT 1`,
        [productId, businessId]
      ).catch(async (err) => {
        if (err.code === '42703' && String(err.message).includes('is_default')) {
          return client.query(
            `SELECT id FROM product_variants
             WHERE product_id = $1::uuid AND business_id = $2::uuid
               AND COALESCE(is_active, true) = true
               AND COALESCE(is_deleted, false) = false
             ORDER BY created_at ASC NULLS LAST
             LIMIT 1`,
            [productId, businessId]
          );
        }
        throw err;
      });

      return {
        required: false,
        variantCount: 1,
        soleVariantId: single.rows[0]?.id || null,
      };
    }

    return { required: false, variantCount: 0, soleVariantId: null };
  }

  return { required: true, variantCount: count, soleVariantId: null };
}
