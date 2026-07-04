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

/** Parse hub matrix keys like "M-Royal Blue" into size + color. */
export function parseSizeColorKey(key) {
  const raw = String(key || '').trim();
  const idx = raw.indexOf('-');
  if (idx <= 0) return null;
  const size = raw.slice(0, idx).trim();
  const color = raw.slice(idx + 1).trim();
  if (!size || !color) return null;
  return { size, color };
}

/**
 * Build size/color combos from clothing domain_data when product_variants rows
 * were never materialized (common when merchants use the Size/Color Matrix grid).
 */
export function parseDomainDataVariantCombos(domainData) {
  const dd = domainData && typeof domainData === 'object' ? domainData : {};
  /** @type {{ size: string, color: string, stock: number }[]} */
  const combos = [];
  const seen = new Set();

  const matrix = dd.size_color_matrix;
  if (matrix && typeof matrix === 'object' && !Array.isArray(matrix)) {
    for (const [key, qty] of Object.entries(matrix)) {
      const parsed = parseSizeColorKey(key);
      if (!parsed) continue;
      const stock = Number(qty);
      const sig = `${parsed.size}::${parsed.color}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      combos.push({
        size: parsed.size,
        color: parsed.color,
        stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
      });
    }
  }

  if (typeof dd.sizecolormatrix === 'string' && dd.sizecolormatrix.trim()) {
    for (const entry of dd.sizecolormatrix.split(/[|,]/)) {
      const parsed = parseSizeColorKey(entry.trim());
      if (!parsed) continue;
      const sig = `${parsed.size}::${parsed.color}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      combos.push({ size: parsed.size, color: parsed.color, stock: 0 });
    }
  }

  return combos;
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
      variant.material ||
      variant.variant_name
  );
}

/** @param {{ has_variants?: boolean, variants?: object[] } | null | undefined} product */
export function productHasSelectableVariants(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return false;
  if (variants.length === 1) return variantHasPurchasableAttributes(variants[0]);
  return variants.filter(variantHasPurchasableAttributes).length > 1;
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

/**
 * Materialize product_variants from domain_data size/color matrix when clothing
 * products were saved via the hub grid but never synced to variant rows.
 * @returns {Promise<boolean>} true when new rows were inserted
 */
export async function ensureStorefrontVariantsMaterialized(client, productId, businessId) {
  const existing = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM product_variants pv
     WHERE pv.product_id = $1::uuid
       AND pv.business_id = $2::uuid
       AND COALESCE(pv.is_active, true) = true
       AND COALESCE(pv.is_deleted, false) = false
       AND (
         NULLIF(TRIM(pv.size), '') IS NOT NULL
         OR NULLIF(TRIM(pv.color), '') IS NOT NULL
       )`,
    [productId, businessId]
  );

  if (Number(existing.rows[0]?.count || 0) > 0) {
    return false;
  }

  const productResult = await client.query(
    `SELECT id, sku, name, price, cost_price, mrp, domain_data
     FROM products
     WHERE id = $1::uuid AND business_id = $2::uuid
       AND COALESCE(is_deleted, false) = false`,
    [productId, businessId]
  );
  const product = productResult.rows[0];
  if (!product) return false;

  const combos = parseDomainDataVariantCombos(product.domain_data);
  if (combos.length === 0) return false;

  const basePrice = parseFloat(product.price) || parseFloat(product.mrp) || 0;
  const baseCost = parseFloat(product.cost_price) || 0;
  const baseMrp = parseFloat(product.mrp) || 0;
  const baseSku = String(product.sku || product.name || 'SKU')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 24)
    .toUpperCase() || 'SKU';

  let inserted = 0;
  for (const combo of combos) {
    const sizeCode = combo.size.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const colorCode = combo.color.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const variantSku = `${baseSku}-${sizeCode}-${colorCode}`.slice(0, 120);
    const variantName = `${combo.size} / ${combo.color}`;

    const res = await client.query(
      `INSERT INTO product_variants (
        business_id, product_id, variant_sku, variant_name,
        size, color, price, cost_price, mrp, stock
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (business_id, variant_sku) DO NOTHING
      RETURNING id`,
      [
        businessId,
        productId,
        variantSku,
        variantName,
        combo.size,
        combo.color,
        basePrice,
        baseCost,
        baseMrp,
        combo.stock,
      ]
    );
    if (res.rows[0]) inserted += 1;
  }

  if (inserted > 0) {
    await client.query(
      `UPDATE products SET has_variants = true, updated_at = NOW()
       WHERE id = $1::uuid AND business_id = $2::uuid`,
      [productId, businessId]
    );
  }

  return inserted > 0;
}
