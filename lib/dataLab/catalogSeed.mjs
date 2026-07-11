import { slugifyCategoryName } from '../utils/registrationSeed.js';
import { extractUnsplashPhotoId } from '../storefront/unsplashUrl.js';

function buildVariantSku(baseSku, parts) {
  const suffix = parts
    .filter(Boolean)
    .map((p) => String(p).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())
    .join('-');
  return `${String(baseSku || 'SKU').replace(/[^A-Za-z0-9]/g, '').slice(0, 24).toUpperCase() || 'SKU'}-${suffix}`.slice(0, 120);
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @returns {Promise<Map<string, string>>}
 */
async function loadCategoryIdMap(client, businessId) {
  const result = await client.query(
    `SELECT id, name, slug
     FROM product_categories
     WHERE business_id = $1::uuid AND COALESCE(is_active, true) = true`,
    [businessId]
  );
  const map = new Map();
  for (const row of result.rows) {
    if (row.name) map.set(String(row.name).trim().toLowerCase(), row.id);
    if (row.slug) map.set(String(row.slug).trim().toLowerCase(), row.id);
  }
  return map;
}

/**
 * @param {Map<string, string>} categoryMap
 * @param {string | null | undefined} categoryLabel
 */
function lookupCategoryId(categoryMap, categoryLabel) {
  const label = String(categoryLabel || '').trim();
  if (!label || !categoryMap?.size) return null;
  return (
    categoryMap.get(label.toLowerCase()) ||
    categoryMap.get(slugifyCategoryName(label).toLowerCase()) ||
    null
  );
}

/**
 * Ensure product_categories rows exist for product.category labels and set products.category_id.
 * Safe to run repeatedly after catalog seeds or schema repairs.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @returns {Promise<{ categoriesUpserted: number, productsLinked: number }>}
 */
export async function syncProductCategoryLinks(client, businessId) {
  const labels = await client.query(
    `SELECT DISTINCT TRIM(category) AS name
     FROM products
     WHERE business_id = $1::uuid
       AND (is_deleted = false OR is_deleted IS NULL)
       AND category IS NOT NULL
       AND TRIM(category) <> ''
     ORDER BY 1`,
    [businessId]
  );

  let categoriesUpserted = 0;
  for (let i = 0; i < labels.rows.length; i++) {
    const name = labels.rows[i].name;
    await client.query(
      `INSERT INTO product_categories (business_id, name, slug, sort_order, is_active)
       VALUES ($1::uuid, $2, $3, $4, true)
       ON CONFLICT (business_id, name) DO UPDATE SET
         slug = COALESCE(product_categories.slug, EXCLUDED.slug),
         is_active = true,
         updated_at = NOW()`,
      [businessId, name, slugifyCategoryName(name), i]
    );
    categoriesUpserted++;
  }

  const linked = await client.query(
    `UPDATE products p
     SET category_id = c.id,
         updated_at = NOW()
     FROM product_categories c
     WHERE p.business_id = $1::uuid
       AND c.business_id = p.business_id
       AND COALESCE(p.is_deleted, false) = false
       AND COALESCE(c.is_active, true) = true
       AND p.category IS NOT NULL
       AND TRIM(p.category) <> ''
       AND LOWER(TRIM(p.category)) = LOWER(c.name)
       AND p.category_id IS DISTINCT FROM c.id
     RETURNING p.id`,
    [businessId]
  );

  return {
    categoriesUpserted,
    productsLinked: linked.rowCount || 0,
  };
}

/**
 * Materialize size/color rows for demo catalog items that ship a variant matrix.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} productId
 * @param {object} item
 * @param {{ refresh?: boolean }} opts
 */
async function syncSeedProductVariants(client, businessId, productId, item, { refresh = false } = {}) {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  if (!variants.length) return;

  const existing = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM product_variants
     WHERE product_id = $1::uuid
       AND business_id = $2::uuid
       AND COALESCE(is_deleted, false) = false`,
    [productId, businessId]
  );
  const variantCount = Number(existing.rows[0]?.count || 0);
  if (variantCount > 0 && !refresh) return;

  const baseSku = item.sku || 'SKU';
  const basePrice = Number(item.price) || 0;
  const baseCost = Number(item.cost_price) || 0;
  const baseMrp = Number(item.mrp ?? item.compare_price) || 0;
  let totalStock = 0;
  let isFirst = true;

  for (const row of variants) {
    const size = row.size || null;
    const color = row.color || null;
    const stock = Number(row.stock) || 0;
    totalStock += stock;
    const variantSku =
      row.variant_sku ||
      row.variantSku ||
      buildVariantSku(baseSku, [size, color, row.pattern, row.material].filter(Boolean));
    const variantName =
      row.variant_name ||
      row.variantName ||
      [size, color].filter(Boolean).join(' / ') ||
      'Variant';

    await client.query(
      `INSERT INTO product_variants (
        business_id, product_id, variant_sku, variant_name,
        size, color, pattern, material,
        price, cost_price, mrp, stock, is_default, is_active
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      ON CONFLICT (business_id, variant_sku) DO UPDATE SET
        variant_name = EXCLUDED.variant_name,
        size = EXCLUDED.size,
        color = EXCLUDED.color,
        pattern = EXCLUDED.pattern,
        material = EXCLUDED.material,
        price = EXCLUDED.price,
        cost_price = EXCLUDED.cost_price,
        mrp = EXCLUDED.mrp,
        stock = EXCLUDED.stock,
        product_id = EXCLUDED.product_id,
        is_active = true,
        is_deleted = false,
        updated_at = NOW()`,
      [
        businessId,
        productId,
        variantSku,
        variantName,
        size,
        color,
        row.pattern || null,
        row.material || null,
        Number(row.price ?? basePrice) || 0,
        Number(row.cost_price ?? row.costPrice ?? baseCost) || 0,
        Number(row.mrp ?? baseMrp) || 0,
        stock,
        isFirst,
      ]
    );
    isFirst = false;
  }

  await client.query(
    `UPDATE products SET has_variants = true, stock = $1, updated_at = NOW()
     WHERE id = $2::uuid AND business_id = $3::uuid`,
    [totalStock, productId, businessId]
  );
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string[]} categoryNames
 */
export async function seedCategories(client, businessId, categoryNames, { refresh = false } = {}) {
  const names = categoryNames
    .map((n) => String(n || '').trim())
    .filter(Boolean);

  if (refresh && names.length) {
    await client.query(
      `UPDATE product_categories SET is_active = false, updated_at = NOW()
       WHERE business_id = $1::uuid AND NOT (name = ANY($2::text[]))`,
      [businessId, names]
    );
  }

  let count = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    await client.query(
      `INSERT INTO product_categories (business_id, name, slug, sort_order, is_active)
       VALUES ($1::uuid, $2, $3, $4, true)
       ON CONFLICT (business_id, name) DO UPDATE SET sort_order = $4, is_active = true, updated_at = NOW()`,
      [businessId, name, slugifyCategoryName(name), i]
    );
    count++;
  }
  return count;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {object[]} items
 * @param {{ refresh?: boolean }} [opts]
 */
export async function seedProducts(client, businessId, items, { refresh = false } = {}) {
  if (refresh) {
    await client.query(
      `UPDATE products SET is_deleted = true, is_active = false, deleted_at = NOW()
       WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)`,
      [businessId]
    );
  }

  let categoryMap = await loadCategoryIdMap(client, businessId);
  const ids = [];
  for (const item of items) {
    const categoryId =
      item.category_id || lookupCategoryId(categoryMap, item.category) || null;
    const exists = await client.query(
      `SELECT id, name, price, cost_price, stock, tax_percent, image_url FROM products
       WHERE business_id = $1::uuid AND name = $2 AND (is_deleted = false OR is_deleted IS NULL) LIMIT 1`,
      [businessId, item.name]
    );
    if (exists.rows[0]) {
      const seedPhotoId = extractUnsplashPhotoId(item.image_url);
      const dbPhotoId = extractUnsplashPhotoId(exists.rows[0].image_url);
      const shouldPatch =
        refresh ||
        (item.image_url && !exists.rows[0].image_url) ||
        (item.image_url && String(item.image_url).includes('images.unsplash.com') && !String(exists.rows[0].image_url || '').includes('ixlib=')) ||
        (seedPhotoId && seedPhotoId !== dbPhotoId) ||
        Boolean(categoryId);
      if (shouldPatch) {
        await client.query(
          `UPDATE products SET
            image_url = COALESCE($3, image_url),
            images = COALESCE($4::jsonb, images),
            compare_price = COALESCE($5::numeric, compare_price),
            slug = COALESCE($6, slug),
            is_featured = COALESCE($7, is_featured),
            is_new = COALESCE($17, is_new),
            description = COALESCE($8, description),
            brand = COALESCE($9, brand),
            sku = COALESCE($10, sku),
            price = COALESCE($11::numeric, price),
            cost_price = COALESCE($12::numeric, cost_price),
            stock = COALESCE($13::numeric, stock),
            category = COALESCE($14, category),
            category_id = COALESCE($18::uuid, category_id),
            unit = COALESCE($15, unit),
            domain_data = COALESCE($16::jsonb, domain_data),
            is_active = true,
            is_deleted = false,
            deleted_at = NULL,
            updated_at = NOW()
           WHERE id = $1::uuid AND business_id = $2::uuid`,
          [
            exists.rows[0].id,
            businessId,
            item.image_url,
            item.images ? JSON.stringify(item.images) : null,
            item.compare_price ?? null,
            item.slug || null,
            item.is_featured ?? null,
            item.description || null,
            item.brand || null,
            item.sku || null,
            item.price ?? null,
            item.cost_price ?? null,
            item.stock ?? null,
            item.category || null,
            item.unit || null,
            item.domain_data ? JSON.stringify(item.domain_data) : null,
            item.is_new ?? null,
            categoryId,
          ]
        );
      }
      await syncSeedProductVariants(client, businessId, exists.rows[0].id, item, { refresh });
      ids.push(exists.rows[0]);
      continue;
    }

    const res = await client.query(
      `INSERT INTO products (
        business_id, name, description, sku, barcode, category, category_id, brand, unit, slug,
        price, compare_price, cost_price, stock, tax_percent, is_active, is_featured, is_new,
        image_url, images, domain_data, min_stock_level, reorder_point
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8, $9, $10,
        $11::numeric, $12::numeric, $13::numeric, $14::numeric, $15::numeric, true, $16, $17,
        $18, $19::jsonb, $20::jsonb, $21::numeric, $22::numeric
      )
      RETURNING id, name, price, cost_price, stock, tax_percent`,
      [
        businessId,
        item.name,
        item.description || null,
        item.sku || `SKU-${slugifyCategoryName(item.name).slice(0, 12)}`,
        item.barcode || null,
        item.category || 'General',
        categoryId,
        item.brand || null,
        item.unit || 'pcs',
        item.slug || slugifyCategoryName(item.name),
        item.price ?? 0,
        item.compare_price ?? null,
        item.cost_price ?? roundMoney((item.price ?? 0) * 0.6),
        Math.max(item.stock ?? 50, 20),
        item.tax_percent ?? 0,
        Boolean(item.is_featured),
        Boolean(item.is_new),
        item.image_url || null,
        JSON.stringify(item.images || (item.image_url ? [{ url: item.image_url, primary: true }] : [])),
        JSON.stringify(item.domain_data || {}),
        item.min_stock_level ?? 5,
        item.reorder_point ?? 10,
      ]
    );
    if (res.rows[0]) {
      await syncSeedProductVariants(client, businessId, res.rows[0].id, item, { refresh });
      ids.push(res.rows[0]);
    }
  }

  // Catch labels present on products but missing from the seed category list
  await syncProductCategoryLinks(client, businessId);
  return ids;
}
