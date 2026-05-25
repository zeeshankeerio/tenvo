'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';

/**
 * Get products for storefront with filters
 */
export async function getProducts(businessId, filters = {}) {
  const client = await pool.connect();
  
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      sort = 'featured',
      page = 1,
      limit = 24,
      inStock,
      onSale,
      featured,
      isNew,
    } = filters;
    
    // Build query dynamically
    let whereConditions = ['p.business_id = $1::uuid', 'p.is_active = true'];
    let params = [businessId];
    let paramIndex = 2;
    
    if (category) {
      whereConditions.push(`(c.slug = $${paramIndex} OR c.name = $${paramIndex})`);
      params.push(category);
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
    
    if (minPrice !== undefined) {
      whereConditions.push(`COALESCE(pv.price, p.price) >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex++;
    }
    
    if (maxPrice !== undefined) {
      whereConditions.push(`COALESCE(pv.price, p.price) <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex++;
    }
    
    if (inStock === true) {
      whereConditions.push(`(COALESCE(pv.stock, p.stock) IS NULL OR COALESCE(pv.stock, p.stock) > 0)`);
    }
    
    if (onSale) {
      whereConditions.push(`p.compare_price IS NOT NULL AND p.compare_price > p.price`);
    }

    // 'featured' filter: don't hard-filter — the homepage uses this but most products
    // have is_featured=false. Instead, boost featured products via sort order.
    // Only apply as a hard filter when explicitly filtering from the products page.
    if (featured === 'only') {
      whereConditions.push(`p.is_featured = true`);
    }

    if (isNew) {
      whereConditions.push(`p.is_new = true`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Sort options
    const sortOptions = {
      featured: 'p.is_featured DESC, p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST, p.created_at DESC',
      newest: 'p.created_at DESC',
      'price-asc': 'COALESCE(pv.price, NULLIF(p.mrp, 0), NULLIF(p.price, 0)) ASC NULLS LAST',
      'price-desc': 'COALESCE(pv.price, NULLIF(p.mrp, 0), NULLIF(p.price, 0)) DESC NULLS LAST',
      'name-asc': 'p.name ASC',
      popularity: 'p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST, p.created_at DESC',
      rating: 'p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST',
    };
    
    const orderBy = sortOptions[sort] || sortOptions.featured;
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id::uuid AND pv.is_default = true
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, params).catch(err => {
      console.error('[getProducts] Count query error:', err.message);
      throw err;
    });
    const total = parseInt(countResult.rows[0].total);
    
    // Main query
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    // Full query (requires migration add_storefront_product_columns.sql to have run)
    const fullQuery = `
      SELECT 
        p.id, p.name, p.sku, p.description,
        p.price, p.mrp, p.cost_price, p.stock, p.image_url, p.is_active,
        p.created_at, p.updated_at,
        p.slug, p.compare_price, p.is_featured, p.is_new,
        p.sales_count, p.stock_status, p.images, p.has_variants,
        p.rating, p.review_count, p.enable_reviews,
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        COALESCE(pv.price, NULLIF(p.mrp, 0), NULLIF(p.price, 0), p.price) as display_price,
        COALESCE(pv.stock, p.stock) as display_stock
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id::uuid AND pv.is_default = true
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Fallback query for pre-migration schema (no storefront columns)
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
        COALESCE(NULLIF(p.mrp, 0), NULLIF(p.price, 0), p.price) as display_price,
        p.stock as display_stock
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    let result;
    try {
      result = await client.query(fullQuery, params);
    } catch (colErr) {
      if (colErr.code === '42703') {
        // Column does not exist — migration not yet run, use fallback
        console.warn('[getProducts] Storefront columns missing, using fallback query. Run add_storefront_product_columns.sql migration.');
        result = await client.query(fallbackQuery, params);
      } else {
        throw colErr;
      }
    }
    
    // Format products
    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug || (row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + row.id.slice(0, 8)),
      sku: row.sku,
      description: row.description,
      price: parseFloat(row.display_price || row.mrp || row.price || 0),
      compare_price: row.compare_price ? parseFloat(row.compare_price)
        : (row.mrp && row.price && Number(row.mrp) > Number(row.price) ? parseFloat(row.mrp) : null),
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
      const variantsResult = await client.query(
        `SELECT 
          pv.id, pv.sku, pv.price, pv.stock, pv.stock_status,
          pv.attribute_1_name, pv.attribute_1_value,
          pv.attribute_2_name, pv.attribute_2_value,
          pv.attribute_3_name, pv.attribute_3_value,
          pv.image_url, pv.is_default
        FROM product_variants pv
        WHERE pv.product_id = $1 AND pv.is_active = true
        ORDER BY pv.is_default DESC, pv.created_at`,
        [product.id]
      );
      variants = variantsResult.rows;
    }
    
    // Get specifications
    const specsResult = await client.query(
      `SELECT 
        ps.id, ps.attribute_name, ps.attribute_value,
        ps.display_order
      FROM product_specifications ps
      WHERE ps.product_id = $1
      ORDER BY ps.display_order, ps.attribute_name`,
      [product.id]
    );
    
    // Get related products
    let relatedResult;
    try {
      relatedResult = await client.query(
        `SELECT p.id, p.name, p.slug, p.price, p.compare_price, p.image_url, p.rating
        FROM products p
        WHERE p.business_id = $1::uuid 
          AND p.category_id = $2
          AND p.id != $3::uuid
          AND p.is_active = true
        ORDER BY p.sales_count DESC NULLS LAST
        LIMIT 8`,
        [businessId, product.category_id, product.id]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      relatedResult = await client.query(
        `SELECT p.id, p.name, p.price, p.image_url,
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
    
    return actionSuccess({
      product: {
        ...product,
        slug: product.slug || (product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + product.id.slice(0, 8)),
        price: parseFloat(product.price),
        compare_price: product.compare_price ? parseFloat(product.compare_price) : null,
        cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
        rating: product.rating ? parseFloat(product.rating) : null,
      },
      variants: variants.map(v => ({
        ...v,
        price: parseFloat(v.price),
      })),
      specifications: specsResult.rows,
      related_products: relatedResult.rows.map(p => ({
        ...p,
        slug: p.slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id.slice(0, 8)),
        price: parseFloat(p.price),
        compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      })),
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
        COUNT(p.id) as product_count
      FROM product_categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.business_id = $1::uuid AND c.is_active = true
      GROUP BY c.id
      ORDER BY c.sort_order, c.name`,
      [businessId]
    );
    
    return actionSuccess({
      categories: result.rows,
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
          p.id, p.name, p.slug, p.price, p.compare_price,
          p.image_url, p.rating, p.review_count,
          c.name as category_name
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.business_id = $1::uuid 
          AND p.category_id = $2
          AND p.id != $3::uuid
          AND p.is_active = true
          AND COALESCE(p.stock, 1) > 0
        ORDER BY p.sales_count DESC NULLS LAST, p.rating DESC NULLS LAST
        LIMIT $4`,
        [businessId, category_id, productId, limit]
      );
    } catch (colErr) {
      if (colErr.code !== '42703') throw colErr;
      relResult = await client.query(
        `SELECT 
          p.id, p.name, p.price, p.image_url,
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
      products: relResult.rows.map(p => ({
        ...p,
        slug: p.slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id.slice(0, 8)),
        price: parseFloat(p.price),
        compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      })),
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
          p.id, p.name, p.slug, p.price, p.compare_price,
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
          p.id, p.name, p.price, p.image_url, p.stock, p.sku,
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
      products: searchResult.rows.map(p => ({
        ...p,
        slug: p.slug || (p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + p.id.slice(0, 8)),
        price: parseFloat(p.price),
        compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
      })),
    });
    
  } catch (error) {
    console.error('[searchProducts] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
