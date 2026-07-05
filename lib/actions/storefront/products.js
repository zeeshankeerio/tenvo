'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import {
  storefrontCatalogTag,
  serializeStorefrontFilters,
  STOREFRONT_CATALOG_REVALIDATE_SEC,
} from '@/lib/storefront/storefrontCacheTags';
import { cacheStorefrontRead } from '@/lib/storefront/storefrontCachedRead';
import { buildAutoPartsSpecifications } from '@/lib/storefront/partsFinder';
import { buildClothingSpecifications } from '@/lib/storefront/luxuryFashion';
import { enrichStorefrontProductStock, resolveStorefrontStockStatus } from '@/lib/storefront/storefrontDisplayStock';
import {
  parseStockNumber,
  querySellableLocationQty,
  querySellableLocationQtyBatch,
  queryVariantStockSumBatch,
  resolveSellableStockQty,
} from '@/lib/storefront/storefrontOrderStock';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';
import { isStorefrontProductUuid, resolveStorefrontProductId } from '@/lib/utils/storefrontProductRef';
import {
  loadStorefrontProductVariants,
  queryStorefrontVariantRequirement,
  ensureStorefrontVariantsMaterialized,
  parseDomainDataVariantCombos,
} from '@/lib/storefront/storefrontProductVariants';

/** @returns {import('@/lib/actions/_shared/result').ActionResult | null} */
function rejectInvalidStorefrontBusinessId(businessId) {
  if (!businessId || !isStorefrontProductUuid(String(businessId))) {
    return actionFailure('INVALID_INPUT', 'Valid business ID is required');
  }
  return null;
}

/** Prefer default variant when column exists; else earliest variant */
const DISPLAY_VARIANT_JOIN = `
      LEFT JOIN LATERAL (
        SELECT pv2.price, pv2.stock
        FROM product_variants pv2
        WHERE pv2.product_id = p.id
          AND COALESCE(pv2.is_deleted, false) = false
          AND COALESCE(pv2.is_active, true) = true
        ORDER BY COALESCE(pv2.is_default, false) DESC, pv2.created_at ASC NULLS LAST, pv2.id ASC
        LIMIT 1
      ) pv ON true`;

const DISPLAY_VARIANT_JOIN_NO_DEFAULT = `
      LEFT JOIN LATERAL (
        SELECT pv2.price, pv2.stock
        FROM product_variants pv2
        WHERE pv2.product_id = p.id
          AND COALESCE(pv2.is_deleted, false) = false
          AND COALESCE(pv2.is_active, true) = true
        ORDER BY pv2.created_at ASC NULLS LAST, pv2.id ASC
        LIMIT 1
      ) pv ON true`;

/**
 * @param {boolean} compat, omit predicates/sorts that need storefront-only product columns
 *   (compare_price, is_featured, is_new) and use mrp vs price for "on sale".
 */
function buildProductListWhere(businessId, filters, { compat = false } = {}) {
  const {
    category,
    search,
    searchMode,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    featured,
    isNew,
    brand,
    model,
    year,
    engine,
    engineNo,
    vehicleClass,
    vehicleType,
    body,
    fuel,
    condition,
    fabric,
    sourcing,
    size,
    fitnessShopCatalog,
  } = filters;

  let whereConditions = ['p.business_id = $1::uuid', 'p.is_active = true'];
  let params = [businessId];
  let paramIndex = 2;

  if (category) {
    const catParam = String(category).trim();
    whereConditions.push(`(
      c.slug = $${paramIndex}
      OR c.name = $${paramIndex}
      OR lower(regexp_replace(trim(coalesce(p.category, '')), '[^a-zA-Z0-9]+', '-', 'g')) = lower($${paramIndex})
      OR trim(coalesce(p.category, '')) = $${paramIndex}
    )`);
    params.push(catParam);
    paramIndex++;
  }

  if (search) {
    const term = String(search).trim();
    const mode = String(searchMode || '').trim().toLowerCase();

    if (mode === 'partnumber') {
      whereConditions.push(`(
        p.sku ILIKE $${paramIndex}
        OR p.barcode ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'partnumber', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'oemnumber', '') ILIKE $${paramIndex}
        OR p.name ILIKE $${paramIndex}
      )`);
      params.push(`%${term}%`);
      paramIndex++;
    } else if (mode === 'partsize') {
      whereConditions.push(`(
        p.name ILIKE $${paramIndex}
        OR p.description ILIKE $${paramIndex}
        OR trim(coalesce(p.category, '')) ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'vehiclecompatibility', '') ILIKE $${paramIndex}
      )`);
      params.push(`%${term}%`);
      paramIndex++;
    } else if (mode === 'plate') {
      whereConditions.push(`(
        coalesce(p.domain_data->>'fitmentplates', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'vehicleregistration', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'plateno', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'vehiclecompatibility', '') ILIKE $${paramIndex}
        OR p.name ILIKE $${paramIndex}
      )`);
      params.push(`%${term}%`);
      paramIndex++;
    } else if (mode === 'vin') {
      whereConditions.push(`(
        coalesce(p.domain_data->>'fitmentvin', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'chassisnumber', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'vinnumber', '') ILIKE $${paramIndex}
        OR coalesce(p.domain_data->>'vehiclecompatibility', '') ILIKE $${paramIndex}
        OR p.sku ILIKE $${paramIndex}
      )`);
      params.push(`%${term}%`);
      paramIndex++;
    } else {
      whereConditions.push(`(
        p.name ILIKE $${paramIndex}
        OR p.description ILIKE $${paramIndex}
        OR p.sku ILIKE $${paramIndex}
        OR p.barcode ILIKE $${paramIndex}
        OR COALESCE(p.domain_data::text, '') ILIKE $${paramIndex}
      )`);
      params.push(`%${term}%`);
      paramIndex++;
    }
  }

  const useVariantPrices = !compat;
  if (minPrice !== undefined && minPrice !== null) {
    whereConditions.push(
      useVariantPrices
        ? `COALESCE(pv.price, p.price) >= $${paramIndex}`
        : `COALESCE(NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) >= $${paramIndex}`
    );
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined && maxPrice !== null) {
    whereConditions.push(
      useVariantPrices
        ? `COALESCE(pv.price, p.price) <= $${paramIndex}`
        : `COALESCE(NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) <= $${paramIndex}`
    );
    params.push(maxPrice);
    paramIndex++;
  }

  if (inStock === true) {
    whereConditions.push(
      useVariantPrices
        ? `(COALESCE(pv.stock, p.stock) IS NULL OR COALESCE(pv.stock, p.stock) > 0)`
        : `(p.stock IS NULL OR p.stock > 0)`
    );
  }

  if (onSale) {
    if (compat) {
      whereConditions.push(
        `(p.mrp IS NOT NULL AND p.mrp > COALESCE(NULLIF(p.price, 0), 0))`
      );
    } else {
      whereConditions.push(
        `p.compare_price IS NOT NULL AND p.compare_price > p.price`
      );
    }
  }

  if (featured === 'only' && !compat) {
    whereConditions.push(`p.is_featured = true`);
  }

  if (isNew && !compat) {
    whereConditions.push(`p.is_new = true`);
  }

  if (brand) {
    const brandVal = String(brand).trim();
    whereConditions.push(`(
      lower(coalesce(p.domain_data->>'vehiclemake', '')) = lower($${paramIndex})
      OR lower(coalesce(p.domain_data->>'make', '')) = lower($${paramIndex})
      OR lower(coalesce(p.brand, '')) = lower($${paramIndex})
      OR coalesce(p.domain_data->>'vehiclecompatibility', '') ILIKE $${paramIndex + 1}
      OR p.name ILIKE $${paramIndex + 1}
    )`);
    params.push(brandVal, `%${brandVal}%`);
    paramIndex += 2;
  }

  if (model) {
    const modelVal = String(model).trim();
    whereConditions.push(`(
      lower(coalesce(p.domain_data->>'vehiclemodel', '')) = lower($${paramIndex})
      OR coalesce(p.domain_data->>'vehiclecompatibility', '') ILIKE $${paramIndex + 1}
      OR p.name ILIKE $${paramIndex + 1}
      OR p.description ILIKE $${paramIndex + 1}
    )`);
    params.push(modelVal, `%${modelVal}%`);
    paramIndex += 2;
  }

  if (year) {
    const yearVal = String(year).trim();
    whereConditions.push(`(
      coalesce(p.domain_data->>'modelyear', '') ILIKE $${paramIndex}
      OR coalesce(p.domain_data->>'vehiclecompatibility', '') ILIKE $${paramIndex}
      OR p.description ILIKE $${paramIndex}
    )`);
    params.push(`%${yearVal}%`);
    paramIndex++;
  }

  if (engine) {
    const engineVal = String(engine).trim();
    whereConditions.push(`(
      coalesce(p.domain_data->>'enginetype', '') ILIKE $${paramIndex}
      OR coalesce(p.domain_data->>'engine', '') ILIKE $${paramIndex}
      OR p.description ILIKE $${paramIndex}
    )`);
    params.push(`%${engineVal}%`);
    paramIndex++;
  }

  if (engineNo) {
    const engineNoVal = String(engineNo).trim();
    whereConditions.push(`(
      coalesce(p.domain_data->>'engineno', '') ILIKE $${paramIndex}
      OR coalesce(p.domain_data->>'enginecode', '') ILIKE $${paramIndex}
    )`);
    params.push(`%${engineNoVal}%`);
    paramIndex++;
  }

  if (vehicleClass) {
    whereConditions.push(`lower(coalesce(p.domain_data->>'vehicleclass', '')) = lower($${paramIndex})`);
    params.push(String(vehicleClass).trim());
    paramIndex++;
  }

  if (vehicleType) {
    whereConditions.push(`(
      lower(coalesce(p.domain_data->>'vehicletype', '')) = lower($${paramIndex})
      OR coalesce(p.domain_data->>'vehicletype', '') = ''
    )`);
    params.push(String(vehicleType).trim());
    paramIndex++;
  }

  if (body) {
    whereConditions.push(`lower(coalesce(p.domain_data->>'bodytype', '')) = lower($${paramIndex})`);
    params.push(String(body).trim());
    paramIndex++;
  }

  if (fuel) {
    whereConditions.push(`lower(coalesce(p.domain_data->>'fueltype', '')) = lower($${paramIndex})`);
    params.push(String(fuel).trim());
    paramIndex++;
  }

  if (condition) {
    const cond = String(condition).trim().toLowerCase();
    if (cond === 'pre-owned' || cond === 'preowned' || cond === 'used') {
      whereConditions.push(`lower(coalesce(p.domain_data->>'condition', '')) IN ('pre-owned', 'preowned', 'used')`);
    } else if (cond === 'new') {
      whereConditions.push(`(
        lower(coalesce(p.domain_data->>'condition', '')) IN ('new', '')
        OR p.domain_data->>'condition' IS NULL
      )`);
    } else {
      whereConditions.push(`lower(coalesce(p.domain_data->>'condition', '')) = lower($${paramIndex})`);
      params.push(cond);
      paramIndex++;
    }
  }

  if (fabric) {
    const fabricVal = String(fabric).trim();
    whereConditions.push(`(
      lower(coalesce(p.domain_data->>'fabrictype', '')) = lower($${paramIndex})
      OR lower(coalesce(p.domain_data->>'fabric', '')) = lower($${paramIndex})
    )`);
    params.push(fabricVal);
    paramIndex++;
  }

  if (sourcing) {
    const sourcingVal = String(sourcing).trim();
    whereConditions.push(`lower(coalesce(p.domain_data->>'sourcing', '')) = lower($${paramIndex})`);
    params.push(sourcingVal);
    paramIndex++;
  }

  if (size) {
    const sizeVal = String(size).trim();
    whereConditions.push(`(
      coalesce(p.domain_data->>'sizecolormatrix', '') ILIKE $${paramIndex}
      OR coalesce(p.domain_data->>'size', '') ILIKE $${paramIndex}
      OR EXISTS (
        SELECT 1 FROM product_variants pv_sz
        WHERE pv_sz.product_id = p.id
          AND pv_sz.business_id = p.business_id
          AND COALESCE(pv_sz.is_deleted, false) = false
          AND COALESCE(pv_sz.is_active, true) = true
          AND pv_sz.size ILIKE $${paramIndex}
      )
    )`);
    params.push(`%${sizeVal}%`);
    paramIndex++;
  }

  if (fitnessShopCatalog) {
    whereConditions.push(`(
      lower(trim(coalesce(c.name, p.category, ''))) NOT IN ('memberships', 'personal training', 'classes')
      AND coalesce(p.domain_data->>'bookable', '') NOT IN ('true', '1', 'yes')
      AND NOT (
        lower(coalesce(p.name, '')) ~* '(gents gym|ladies section|gym pass|membership pass|personal training session|group class pack|class pack|training session)'
      )
    )`);
  }

  return { whereClause: whereConditions.join(' AND '), params, paramIndex };
}

function orderByClause(sort, { compat = false } = {}) {
  if (compat) {
    const sortOptions = {
      featured: 'p.created_at DESC',
      newest: 'p.created_at DESC',
      'price-asc':
        'COALESCE(NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) ASC NULLS LAST',
      'price-desc':
        'COALESCE(NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) DESC NULLS LAST',
      'name-asc': 'p.name ASC',
      popularity: 'p.created_at DESC',
      rating: 'p.created_at DESC',
    };
    return sortOptions[sort] || sortOptions.featured;
  }

  const sortOptions = {
    featured:
      'p.is_featured DESC, p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST, p.created_at DESC',
    newest: 'p.created_at DESC',
    'price-asc':
      'COALESCE(pv.price, NULLIF(p.mrp, 0), NULLIF(p.price, 0)) ASC NULLS LAST',
    'price-desc':
      'COALESCE(pv.price, NULLIF(p.mrp, 0), NULLIF(p.price, 0)) DESC NULLS LAST',
    'name-asc': 'p.name ASC',
    popularity:
      'p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST, p.created_at DESC',
    rating: 'p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST',
  };
  return sortOptions[sort] || sortOptions.featured;
}

/**
 * Uncached product list fetch on an existing pool client (shared-connection safe).
 */
export async function fetchStorefrontProductsOnClient(client, businessId, filters = {}) {
  try {
    const { sort = 'featured', page = 1, limit = 24 } = filters;

    const attempts = [
      { join: DISPLAY_VARIANT_JOIN, compat: false },
      { join: DISPLAY_VARIANT_JOIN_NO_DEFAULT, compat: false },
      { join: DISPLAY_VARIANT_JOIN_NO_DEFAULT, compat: true },
    ];

    let countResult;
    let resolvedJoin = DISPLAY_VARIANT_JOIN_NO_DEFAULT;
    let resolvedWhere = 'p.business_id = $1::uuid AND p.is_active = true';
    let resolvedParams = [businessId];
    let resolvedOrderBy = orderByClause(sort, { compat: true });
    let lastErr;

    for (const att of attempts) {
      const built = buildProductListWhere(businessId, filters, { compat: att.compat });
      const orderBy = orderByClause(sort, { compat: att.compat });
      const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      ${att.join}
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${built.whereClause}
    `;
      try {
        countResult = await client.query(countSql, built.params);
        resolvedJoin = att.join;
        resolvedWhere = built.whereClause;
        resolvedParams = built.params;
        resolvedOrderBy = orderBy;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (e.code !== '42703') throw e;
      }
    }

    if (!countResult) {
      console.error('[getProducts] Count failed after schema retries:', lastErr?.message);
      throw lastErr || new Error('COUNT_FAILED');
    }

    const total = parseInt(countResult.rows[0].total, 10);
    const offset = (page - 1) * limit;
    const limIdx = resolvedParams.length + 1;
    const listParams = [...resolvedParams, limit, offset];

    const fullQuery = `
      SELECT 
        p.id, p.name, p.sku, p.description,
        p.price, p.mrp, p.cost_price, p.stock, p.image_url, p.is_active,
        p.created_at, p.updated_at,
        p.slug, p.compare_price, p.is_featured, p.is_new,
        p.brand, p.category,
        p.sales_count, p.stock_status, p.images, p.has_variants,
        p.rating, p.review_count, p.enable_reviews,
        p.domain_data,
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        COALESCE(pv.price, NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) as display_price,
        COALESCE(pv.stock, p.stock) as display_stock
      FROM products p
      ${resolvedJoin}
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${resolvedWhere}
      ORDER BY ${resolvedOrderBy}
      LIMIT $${limIdx} OFFSET $${limIdx + 1}
    `;

    const fallbackQuery = `
      SELECT 
        p.id, p.name, p.sku, p.description,
        p.price, p.mrp, NULL as cost_price, p.stock, p.image_url, p.is_active,
        p.created_at, p.updated_at,
        NULL as slug, NULL as compare_price,
        false as is_featured, false as is_new,
        0 as sales_count,
        CASE WHEN p.stock IS NULL THEN 'in_stock'
             WHEN p.stock <= 0   THEN 'out_of_stock'
             WHEN p.stock <= 5   THEN 'low_stock'
             ELSE 'in_stock' END as stock_status,
        '[]'::jsonb as images, false as has_variants,
        NULL as rating, 0 as review_count, true as enable_reviews,
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        COALESCE(NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) as display_price,
        p.stock as display_stock
      FROM products p
      ${resolvedJoin}
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${resolvedWhere}
      ORDER BY p.created_at DESC
      LIMIT $${limIdx} OFFSET $${limIdx + 1}
    `;

    let result;
    try {
      result = await client.query(fullQuery, listParams);
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;

      const msg = String(colErr.message || '');
      const tryNoDefaultList = `
      SELECT 
        p.id, p.name, p.sku, p.description,
        p.price, p.mrp, p.cost_price, p.stock, p.image_url, p.is_active,
        p.created_at, p.updated_at,
        p.slug, p.compare_price, p.is_featured, p.is_new,
        p.brand, p.category,
        p.sales_count, p.stock_status, p.images, p.has_variants,
        p.rating, p.review_count, p.enable_reviews,
        p.domain_data,
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        COALESCE(pv.price, NULLIF(p.price, 0), NULLIF(p.mrp, 0), 0) as display_price,
        COALESCE(pv.stock, p.stock) as display_stock
      FROM products p
      ${DISPLAY_VARIANT_JOIN_NO_DEFAULT}
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${resolvedWhere}
      ORDER BY ${resolvedOrderBy}
      LIMIT $${limIdx} OFFSET $${limIdx + 1}
    `;

      if (resolvedJoin === DISPLAY_VARIANT_JOIN && msg.includes('is_default')) {
        try {
          result = await client.query(tryNoDefaultList, listParams);
        } catch (e2) {
          if (e2.code === '42703') {
            console.warn(
              '[getProducts] Storefront columns missing, using fallback SELECT. Apply prisma migrations for full storefront columns.'
            );
            result = await client.query(fallbackQuery, listParams);
          } else {
            throw e2;
          }
        }
      } else {
        console.warn(
          '[getProducts] Storefront columns missing, using fallback SELECT. Apply prisma migrations for full storefront columns.'
        );
        result = await client.query(fallbackQuery, listParams);
      }
    }
    
    // Format products with hub-aligned display stock (warehouse rows + variants)
    const productIds = result.rows.map((row) => row.id);
    const locationQtyByProduct = await querySellableLocationQtyBatch(client, businessId, productIds);
    const variantProductIds = result.rows.filter((row) => row.has_variants).map((row) => row.id);
    const variantStockByProduct = await queryVariantStockSumBatch(client, businessId, variantProductIds);

    const products = result.rows.map((row) => {
      const domainData = row.domain_data || {};
      const domainVariantCombos = parseDomainDataVariantCombos(domainData);
      const base = {
        id: row.id,
        name: row.name,
        slug: row.slug || (row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + row.id.slice(0, 8)),
        sku: row.sku,
        description: row.description,
        price: parseFloat(row.display_price || row.price || row.mrp || 0),
        compare_price: row.compare_price ? parseFloat(row.compare_price)
          : (row.mrp && row.price && Number(row.mrp) > Number(row.price) && Number(row.price) > 0 ? parseFloat(row.mrp) : null),
        stock: row.display_stock !== undefined ? row.display_stock : row.stock,
        image_url: row.image_url,
        images: row.images || [],
        is_active: row.is_active,
        is_featured: row.is_featured,
        is_new: row.is_new,
        brand: row.brand,
        category: row.category,
        enable_reviews: row.enable_reviews,
        rating: row.rating,
        review_count: row.review_count,
        sales_count: row.sales_count,
        category_id: row.category_id,
        category_name: row.category_name,
        category_slug: row.category_slug,
        has_variants: Boolean(row.has_variants) || domainVariantCombos.length > 1,
        created_at: row.created_at,
        domain_data: domainData,
      };
      const variantSum = row.has_variants ? variantStockByProduct.get(row.id) : null;
      return enrichStorefrontProductStock(base, {
        locationQty: locationQtyByProduct.get(row.id) ?? null,
        variants: variantSum != null ? [{ stock: variantSum }] : null,
      });
    });
    
    return actionSuccess(serializeDecimalsDeep({
      products,
      total,
      page,
      limit,
      hasMore: total > (page * limit),
    }));
    
  } catch (error) {
    console.error('[getProducts] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  }
}

async function fetchStorefrontProductsUncached(businessId, filters = {}) {
  const client = await pool.connect();
  try {
    return await fetchStorefrontProductsOnClient(client, businessId, filters);
  } finally {
    client.release();
  }
}

/**
 * Get products for storefront with filters (cross-request cache + tag invalidation).
 */
export async function getProducts(businessId, filters = {}) {
  const invalid = rejectInvalidStorefrontBusinessId(businessId);
  if (invalid) return invalid;

  const filtersKey = serializeStorefrontFilters(filters);

  return cacheStorefrontRead(
    () => fetchStorefrontProductsUncached(businessId, filters),
    ['storefront-products', String(businessId), filtersKey],
    {
      tags: [storefrontCatalogTag(businessId), 'storefront-catalog'],
      revalidate: STOREFRONT_CATALOG_REVALIDATE_SEC,
    }
  );
}

/**
 * Uncached PDP fetch (used by cached getProductBySlug wrapper).
 */
async function fetchStorefrontProductBySlugUncached(businessId, slug) {
  const client = await pool.connect();
  
  try {
    // slug may be either a real slug or a UUID (pre-migration fallback)
    const isUuid = /^[0-9a-f-]{36}$/i.test(slug);

    // Try full query first (post-migration: has slug column)
    let productResult;
    try {
      const q = isUuid
        ? `SELECT p.*, c.name as category_name, c.slug as category_slug, c.description as category_description
           FROM products p
           LEFT JOIN product_categories c ON p.category_id = c.id
           WHERE p.business_id = $1::uuid AND p.id = $2::uuid AND p.is_active = true`
        : `SELECT p.*, c.name as category_name, c.slug as category_slug, c.description as category_description
           FROM products p
           LEFT JOIN product_categories c ON p.category_id = c.id
           WHERE p.business_id = $1::uuid AND p.slug = $2 AND p.is_active = true`;
      productResult = await client.query(q, [businessId, slug]);

      // If slug lookup returned nothing, also try matching by UUID suffix (pre-migration slugs end in -<8chars of id>)
      if (productResult.rows.length === 0 && !isUuid) {
        const suffix = slug.split('-').pop();
        if (suffix && suffix.length === 8) {
          const fallback = await client.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug, c.description as category_description
             FROM products p
             LEFT JOIN product_categories c ON p.category_id = c.id
             WHERE p.business_id = $1::uuid AND p.id::text LIKE $2 AND p.is_active = true
             LIMIT 1`,
            [businessId, suffix + '%']
          );
          if (fallback.rows.length > 0) productResult = fallback;
        }
      }
    } catch (colErr) {
      if (colErr.code === '42703') {
        // slug column missing, fall back to id lookup if slug looks like prefixed uuid
        const suffix = slug.split('-').pop();
        const q2 = `SELECT p.id, p.name, p.sku, p.description, p.price, p.stock, p.image_url, p.is_active,
                      p.category_id, p.created_at, p.updated_at, p.domain_data,
                      NULL as slug, NULL as compare_price, false as is_featured, false as is_new,
                      0 as sales_count, NULL as stock_status, '[]'::jsonb as images, false as has_variants,
                      NULL as rating, 0 as review_count, true as enable_reviews,
                      c.name as category_name, c.slug as category_slug, c.description as category_description
                    FROM products p
                    LEFT JOIN product_categories c ON p.category_id = c.id
                    WHERE p.business_id = $1::uuid
                      AND (p.id = $2::uuid OR p.id::text LIKE $3)
                      AND p.is_active = true
                    LIMIT 1`;
        productResult = await client.query(q2, [businessId, isUuid ? slug : '00000000-0000-0000-0000-000000000000', `%${suffix}%`]);
      } else {
        throw colErr;
      }
    }

    if (productResult.rows.length === 0) {
      return actionFailure('PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    const product = productResult.rows[0];
    
    await ensureStorefrontVariantsMaterialized(client, product.id, businessId);

    // Always load variants — has_variants can be stale if variants were added outside VariantService.
    const variants = await loadStorefrontProductVariants(client, product.id, businessId);
    if (variants.length > 0) {
      product.has_variants = true;
    }
    
    // Get specifications, table may not exist in all deployments
    let specsResult = { rows: [] };
    try {
      specsResult = await client.query(
        `SELECT 
          ps.id, ps.attribute_name, ps.attribute_value,
          ps.display_order
        FROM product_specifications ps
        WHERE ps.product_id = $1
        ORDER BY ps.display_order, ps.attribute_name`,
        [product.id]
      );
    } catch (specErr) {
      // 42P01 = table does not exist, 42703 = column does not exist, both are safe to ignore
      if (specErr.code !== '42P01' && specErr.code !== '42703') throw specErr;
    }
    
    // Get related products
    let relatedResult;
    try {
      relatedResult = await client.query(
        `SELECT p.id, p.name, p.slug, p.price, p.mrp, p.compare_price, p.image_url, p.rating
        FROM products p
        WHERE p.business_id = $1::uuid 
          AND p.category_id = $2
          AND p.id != $3::uuid
          AND p.is_active = true
        ORDER BY p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST
        LIMIT 8`,
        [businessId, product.category_id, product.id]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      relatedResult = await client.query(
        `SELECT p.id, p.name, p.price, p.mrp, p.image_url,
          NULL as slug, NULL as compare_price, NULL as rating
        FROM products p
        WHERE p.business_id = $1::uuid 
          AND p.category_id = $2
          AND p.id != $3::uuid
          AND p.is_active = true
        LIMIT 8`,
        [businessId, product.category_id, product.id]
      );
    }
    
    // Compute display price: variant price → mrp (if > price) → price
    const rawPrice = parseFloat(product.price || 0);
    const rawMrp = parseFloat(product.mrp || 0);
    const displayPrice = rawPrice > 0 ? rawPrice : (rawMrp > 0 ? rawMrp : 0);
    // mrp is the original list price; when mrp > selling price it becomes the strikethrough compare_price
    const displayCompare = product.compare_price
      ? parseFloat(product.compare_price)
      : (rawMrp > rawPrice && rawMrp > 0 && rawPrice > 0 ? rawMrp : null);

    // Extract extra storefront data from domain_data JSON blob if present
    const domainData = product.domain_data || {};
    const tags = domainData.tags || [];
    const extraSpecs = domainData.specifications || domainData.specs || [];
    const tableSpecs = Object.fromEntries(
      specsResult.rows.map((r) => [r.attribute_name, r.attribute_value])
    );
    const partsSpecs = buildAutoPartsSpecifications(domainData);
    const clothingSpecs = buildClothingSpecifications(domainData);
    const specifications = { ...clothingSpecs, ...partsSpecs, ...tableSpecs, ...extraSpecs };

    const { cost_price: _costPrice, ...publicProductFields } = product;
    const normalizedVariants = variants.map((v) => ({
      ...v,
      price: parseFloat(v.price),
      stock_status: resolveStorefrontStockStatus(
        v.stock === null || v.stock === undefined ? null : Number(v.stock)
      ),
    }));

    const locationQty = await querySellableLocationQty(client, product.id, businessId);

    const enrichedProduct = enrichStorefrontProductStock(
      {
        ...publicProductFields,
        slug: product.slug || (product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + product.id.slice(0, 8)),
        price: displayPrice,
        mrp: rawMrp,
        compare_price: displayCompare,
        rating: product.rating ? parseFloat(product.rating) : null,
        tags,
        specifications,
        domain_data: domainData,
        variants: normalizedVariants,
        has_variants: normalizedVariants.length > 0 || Boolean(product.has_variants),
      },
      { locationQty, variants: normalizedVariants }
    );

    return actionSuccess(serializeDecimalsDeep({
      product: enrichedProduct,
      variants: normalizedVariants,
      specifications: [...specsResult.rows, ...Object.entries(partsSpecs).map(([attribute_name, attribute_value]) => ({ attribute_name, attribute_value })), ...extraSpecs],
      related_products: relatedResult.rows.map(p => {
        const rp = parseFloat(p.price || 0);
        const rm = parseFloat(p.mrp || 0);
        return {
          ...p,
          slug: p.slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id.slice(0, 8)),
          price: rp > 0 ? rp : (rm > 0 ? rm : 0),
          compare_price: p.compare_price ? parseFloat(p.compare_price)
            : (rm > rp && rm > 0 && rp > 0 ? rm : null),  // mrp=original, price=selling
        };
      }),
    }));
    
  } catch (error) {
    console.error('[getProductBySlug] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get single product by slug (cross-request cache + tag invalidation).
 */
export async function getProductBySlug(businessId, slug) {
  const invalid = rejectInvalidStorefrontBusinessId(businessId);
  if (invalid) return invalid;
  if (!slug) {
    return actionFailure('INVALID_INPUT', 'Product slug is required');
  }

  return cacheStorefrontRead(
    () => fetchStorefrontProductBySlugUncached(businessId, slug),
    ['storefront-product-slug', String(businessId), String(slug)],
    {
      tags: [storefrontCatalogTag(businessId), 'storefront-catalog'],
      revalidate: STOREFRONT_CATALOG_REVALIDATE_SEC,
    }
  );
}

/**
 * Uncached category list (used by cached getCategories wrapper).
 */
export async function fetchStorefrontCategoriesOnClient(client, businessId) {
  try {
    const result = await client.query(
      `SELECT 
        c.id, c.name, c.slug, c.description, 
        c.image_url, c.parent_id,
        COUNT(p.id)::int as product_count
      FROM product_categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.business_id = $1::uuid AND c.is_active = true
      GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.parent_id, c.sort_order
      ORDER BY c.sort_order, c.name`,
      [businessId]
    );

    if (result.rows.length > 0) {
      return actionSuccess({
        categories: result.rows,
      });
    }

    // Fallback: inventory-only businesses (seeded products with string `category`, no category rows)
    const inv = await client.query(
      `SELECT
        ('inv-' || md5(trim(p.category))) as id,
        trim(p.category) as name,
        lower(regexp_replace(trim(p.category), '[^a-zA-Z0-9]+', '-', 'g')) as slug,
        NULL::text as description,
        NULL::text as image_url,
        NULL::uuid as parent_id,
        COUNT(*)::int as product_count
      FROM products p
      WHERE p.business_id = $1::uuid
        AND p.is_active = true
        AND coalesce(trim(p.category), '') <> ''
      GROUP BY trim(p.category)
      ORDER BY COUNT(*) DESC, trim(p.category) ASC`,
      [businessId]
    );

    return actionSuccess({
      categories: inv.rows,
    });
  } catch (error) {
    console.error('[getCategories] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  }
}

async function fetchStorefrontCategoriesUncached(businessId) {
  const client = await pool.connect();
  try {
    return await fetchStorefrontCategoriesOnClient(client, businessId);
  } finally {
    client.release();
  }
}

/**
 * Get categories (cross-request cache + tag invalidation).
 */
export async function getCategories(businessId) {
  const invalid = rejectInvalidStorefrontBusinessId(businessId);
  if (invalid) return invalid;

  return cacheStorefrontRead(
    () => fetchStorefrontCategoriesUncached(businessId),
    ['storefront-categories', String(businessId)],
    {
      tags: [storefrontCatalogTag(businessId), 'storefront-catalog'],
      revalidate: STOREFRONT_CATALOG_REVALIDATE_SEC,
    }
  );
}

/**
 * Check product stock (never cached — used by cart/checkout validation).
 */
export async function checkProductStock(productId, variantId, quantity, businessId, existingClient = null) {
  const invalid = rejectInvalidStorefrontBusinessId(businessId);
  if (invalid) return invalid;

  const client = existingClient ?? await pool.connect();
  const shouldRelease = !existingClient;
  
  try {
    const resolvedProductId = await resolveStorefrontProductId(client, productId, businessId);
    if (!resolvedProductId) {
      return actionFailure('PRODUCT_NOT_FOUND', 'Product not found');
    }

    await ensureStorefrontVariantsMaterialized(client, resolvedProductId, businessId);

    let effectiveVariantId = variantId || null;

    if (!effectiveVariantId) {
      const requirement = await queryStorefrontVariantRequirement(
        client,
        resolvedProductId,
        businessId
      );
      if (requirement.required) {
        return actionFailure(
          'VARIANT_REQUIRED',
          'Please select size, color, or other options before adding to cart'
        );
      }
      if (requirement.soleVariantId) {
        effectiveVariantId = requirement.soleVariantId;
      }
    }

    let query, params;
    
    if (effectiveVariantId) {
      query = `SELECT pv.id, pv.stock, NULL as stock_status
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id = $1::uuid AND pv.product_id = $2::uuid
          AND pv.business_id = $3::uuid AND p.business_id = $3::uuid
          AND COALESCE(p.is_deleted, false) = false AND p.is_active = true`;
      params = [effectiveVariantId, resolvedProductId, businessId];
    } else {
      // stock_status may not exist yet, compute it from stock
      query = `
        SELECT id, stock,
          CASE WHEN stock IS NULL THEN 'in_stock'
               WHEN stock <= 0   THEN 'out_of_stock'
               WHEN stock <= 5   THEN 'low_stock'
               ELSE 'in_stock' END as stock_status
        FROM products
        WHERE id = $1::uuid AND business_id = $2::uuid
          AND is_active = true AND COALESCE(is_deleted, false) = false
      `;
      params = [resolvedProductId, businessId];
    }
    
    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return actionFailure('PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    const { stock: rawStock, stock_status: rawStatus } = result.rows[0];

    if (effectiveVariantId) {
      const stock = parseStockNumber(rawStock);
      if (stock === null) {
        return actionSuccess({
          available: true,
          maxQuantity: 999,
          stock: null,
        });
      }
      const available = stock >= quantity;
      return actionSuccess({
        available,
        maxQuantity: stock,
        stock,
        stock_status: rawStatus || resolveStorefrontStockStatus(stock),
      });
    }

    const locationQty = await querySellableLocationQty(client, resolvedProductId, businessId);
    const stock = resolveSellableStockQty({
      headlineStock: rawStock,
      locationQty,
      variants: [],
    });

    if (stock === null || stock === undefined) {
      return actionSuccess({
        available: true,
        maxQuantity: 999,
        stock: null,
      });
    }

    const available = stock >= quantity;

    return actionSuccess({
      available,
      maxQuantity: stock,
      stock,
      stock_status: resolveStorefrontStockStatus(stock),
    });
    
  } catch (error) {
    console.error('[checkProductStock] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    if (shouldRelease) client.release();
  }
}

/**
 * Uncached related products (used by cached getRelatedProducts wrapper).
 */
async function fetchRelatedProductsUncached(businessId, productId, limit = 8) {
  const client = await pool.connect();
  
  try {
    const resolvedProductId = await resolveStorefrontProductId(client, productId, businessId);
    if (!resolvedProductId) {
      return actionSuccess({ products: [] });
    }

    // Get product category first
    const productResult = await client.query(
      `SELECT category_id FROM products WHERE id = $1::uuid AND business_id = $2::uuid`,
      [resolvedProductId, businessId]
    );
    
    if (productResult.rows.length === 0) {
      return actionSuccess({ products: [] });
    }
    
    const { category_id } = productResult.rows[0];
    
    // Get related products from same category
    let relResult;
    try {
      relResult = await client.query(
        `SELECT 
          p.id, p.name, p.slug, p.price, p.mrp, p.compare_price,
          p.image_url, p.rating, p.review_count,
          c.name as category_name
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.business_id = $1::uuid 
          AND p.category_id = $2
          AND p.id != $3::uuid
          AND p.is_active = true
        ORDER BY p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST, p.created_at DESC
        LIMIT $4`,
        [businessId, category_id, resolvedProductId, limit]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      relResult = await client.query(
        `SELECT 
          p.id, p.name, p.price, p.mrp, p.image_url,
          NULL as slug, NULL as compare_price, NULL as rating, 0 as review_count,
          c.name as category_name
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.business_id = $1::uuid 
          AND p.category_id = $2
          AND p.id != $3::uuid
          AND p.is_active = true
        LIMIT $4`,
        [businessId, category_id, resolvedProductId, limit]
      );
    }

    return actionSuccess({
      products: relResult.rows.map(p => {
        const rp = parseFloat(p.price || 0);
        const rm = parseFloat(p.mrp || 0);
        return {
          ...p,
          slug: p.slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id.slice(0, 8)),
          price: rp > 0 ? rp : (rm > 0 ? rm : 0),
          compare_price: p.compare_price ? parseFloat(p.compare_price)
            : (rm > rp && rm > 0 && rp > 0 ? rm : null),  // mrp=original, price=selling
        };
      }),
    });
    
  } catch (error) {
    console.error('[getRelatedProducts] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get related products (cross-request cache + tag invalidation).
 */
export async function getRelatedProducts(businessId, productId, limit = 8) {
  const invalid = rejectInvalidStorefrontBusinessId(businessId);
  if (invalid) return invalid;
  if (!productId) {
    return actionFailure('INVALID_INPUT', 'Product ID is required');
  }

  return cacheStorefrontRead(
    () => fetchRelatedProductsUncached(businessId, productId, limit),
    ['storefront-related', String(businessId), String(productId), String(limit)],
    {
      tags: [storefrontCatalogTag(businessId), 'storefront-catalog'],
      revalidate: STOREFRONT_CATALOG_REVALIDATE_SEC,
    }
  );
}

/**
 * Search products (never cached — live autocomplete).
 */
export async function searchProducts(businessId, query, limit = 20) {
  const invalid = rejectInvalidStorefrontBusinessId(businessId);
  if (invalid) return invalid;
  if (!query || query.length < 2) {
    return actionSuccess({ products: [] });
  }
  
  const client = await pool.connect();
  
  try {
    let searchResult;
    try {
      searchResult = await client.query(
        `SELECT 
          p.id, p.name, p.slug, p.price, p.mrp, p.compare_price,
          p.image_url, p.stock, p.sku,
          c.name as category_name,
          ts_rank(
            to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')),
            plainto_tsquery('english', $2)
          ) as relevance
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.business_id = $1::uuid 
          AND p.is_active = true
          AND (
            p.name ILIKE $3 
            OR p.description ILIKE $3
            OR p.sku ILIKE $3
            OR to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
               @@ plainto_tsquery('english', $2)
          )
        ORDER BY relevance DESC, p.sales_count DESC NULLS LAST
        LIMIT $4`,
        [businessId, query, `%${query}%`, limit]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      searchResult = await client.query(
        `SELECT 
          p.id, p.name, p.price, p.mrp, p.image_url, p.stock, p.sku,
          NULL as slug, NULL as compare_price,
          c.name as category_name
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.business_id = $1::uuid 
          AND p.is_active = true
          AND (p.name ILIKE $2 OR p.description ILIKE $2 OR p.sku ILIKE $2)
        ORDER BY p.created_at DESC
        LIMIT $3`,
        [businessId, `%${query}%`, limit]
      );
    }

    return actionSuccess({
      products: searchResult.rows.map(p => {
        const rp = parseFloat(p.price || 0);
        const rm = parseFloat(p.mrp || 0);
        return {
          ...p,
          slug: p.slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id.slice(0, 8)),
          price: rp > 0 ? rp : (rm > 0 ? rm : 0),
          compare_price: p.compare_price ? parseFloat(p.compare_price)
            : (rm > rp && rm > 0 && rp > 0 ? rm : null),
        };
      }),
    });
    
  } catch (error) {
    console.error('[searchProducts] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
