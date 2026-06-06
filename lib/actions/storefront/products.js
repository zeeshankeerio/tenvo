'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';

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
 * @param {boolean} compat — omit predicates/sorts that need storefront-only product columns
 *   (compare_price, is_featured, is_new) and use mrp vs price for "on sale".
 */
function buildProductListWhere(businessId, filters, { compat = false } = {}) {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    featured,
    isNew,
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
    whereConditions.push(`(
        p.name ILIKE $${paramIndex}
        OR p.description ILIKE $${paramIndex}
        OR p.sku ILIKE $${paramIndex}
      )`);
    params.push(`%${search}%`);
    paramIndex++;
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
 * Get products for storefront with filters
 */
export async function getProducts(businessId, filters = {}) {
  const client = await pool.connect();

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
        p.sales_count, p.stock_status, p.images, p.has_variants,
        p.rating, p.review_count, p.enable_reviews,
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
        p.sales_count, p.stock_status, p.images, p.has_variants,
        p.rating, p.review_count, p.enable_reviews,
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
    
    // Format products
    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug || (row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + row.id.slice(0, 8)),
      sku: row.sku,
      description: row.description,
      price: parseFloat(row.display_price || row.price || row.mrp || 0),
      compare_price: row.compare_price ? parseFloat(row.compare_price)
        : (row.mrp && row.price && Number(row.mrp) > Number(row.price) && Number(row.price) > 0 ? parseFloat(row.mrp) : null),
      stock: row.display_stock !== undefined ? row.display_stock : row.stock,
      stock_status: row.stock_status,
      image_url: row.image_url,
      images: row.images || [],
      is_active: row.is_active,
      is_featured: row.is_featured,
      is_new: row.is_new,
      enable_reviews: row.enable_reviews,
      rating: row.rating,
      review_count: row.review_count,
      sales_count: row.sales_count,
      category_id: row.category_id,
      category_name: row.category_name,
      category_slug: row.category_slug,
      has_variants: row.has_variants,
      created_at: row.created_at,
    }));
    
    return actionSuccess({
      products,
      total,
      page,
      limit,
      hasMore: total > (page * limit),
    });
    
  } catch (error) {
    console.error('[getProducts] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get single product by slug
 */
export async function getProductBySlug(businessId, slug) {
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
        // slug column missing — fall back to id lookup if slug looks like prefixed uuid
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
    
    // Get variants if any
    let variants = [];
    if (product.has_variants) {
      try {
        const variantsSql = `
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
            AND COALESCE(pv.is_active, true) = true
            AND COALESCE(pv.is_deleted, false) = false
          ORDER BY COALESCE(pv.is_default, false) DESC, pv.created_at ASC NULLS LAST`;

        const variantsSqlNoDefaultCol = `
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
            AND COALESCE(pv.is_active, true) = true
            AND COALESCE(pv.is_deleted, false) = false
          ORDER BY pv.created_at ASC NULLS LAST`;

        let variantsResult;
        try {
          variantsResult = await client.query(variantsSql, [product.id]);
        } catch (vErr) {
          if (vErr.code === '42703' && String(vErr.message).includes('is_default')) {
            variantsResult = await client.query(variantsSqlNoDefaultCol, [product.id]);
          } else {
            throw vErr;
          }
        }
        variants = variantsResult.rows;
      } catch (varErr) {
        if (varErr.code !== '42P01' && varErr.code !== '42703') throw varErr;
      }
    }
    
    // Get specifications — table may not exist in all deployments
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
      // 42P01 = table does not exist, 42703 = column does not exist — both are safe to ignore
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

    return actionSuccess({
      product: {
        ...product,
        slug: product.slug || (product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + product.id.slice(0, 8)),
        price: displayPrice,
        mrp: rawMrp,
        compare_price: displayCompare,
        cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
        rating: product.rating ? parseFloat(product.rating) : null,
        tags,
        stock_status: product.stock_status ||
          (product.stock === null ? 'in_stock' :
           product.stock <= 0 ? 'out_of_stock' :
           product.stock <= 5 ? 'low_stock' : 'in_stock'),
      },
      variants: variants.map(v => ({
        ...v,
        price: parseFloat(v.price),
      })),
      specifications: [...specsResult.rows, ...extraSpecs],
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
    });
    
  } catch (error) {
    console.error('[getProductBySlug] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get categories
 */
export async function getCategories(businessId) {
  const client = await pool.connect();

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
  } finally {
    client.release();
  }
}

/**
 * Check product stock
 */
export async function checkProductStock(productId, variantId, quantity) {
  const client = await pool.connect();
  
  try {
    let query, params;
    
    if (variantId) {
      query = `SELECT id, stock, NULL as stock_status FROM product_variants WHERE id = $1 AND product_id = $2`;
      params = [variantId, productId];
    } else {
      // stock_status may not exist yet — compute it from stock
      query = `
        SELECT id, stock,
          CASE WHEN stock IS NULL THEN 'in_stock'
               WHEN stock <= 0   THEN 'out_of_stock'
               WHEN stock <= 5   THEN 'low_stock'
               ELSE 'in_stock' END as stock_status
        FROM products
        WHERE id = $1 AND is_active = true
      `;
      params = [productId];
    }
    
    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return actionFailure('PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    const { stock, stock_status } = result.rows[0];
    
    // Check if stock tracking is enabled
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
      stock_status,
    });
    
  } catch (error) {
    console.error('[checkProductStock] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get related products
 */
export async function getRelatedProducts(businessId, productId, limit = 8) {
  const client = await pool.connect();
  
  try {
    // Get product category first
    const productResult = await client.query(
      `SELECT category_id FROM products WHERE id = $1`,
      [productId]
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
        [businessId, category_id, productId, limit]
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
        [businessId, category_id, productId, limit]
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
 * Search products
 */
export async function searchProducts(businessId, query, limit = 20) {
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
