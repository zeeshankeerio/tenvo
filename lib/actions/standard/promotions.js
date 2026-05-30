'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';

async function checkAuth(businessId, permission = 'crm.manage_promotions', feature = 'promotions_crm') {
  const { session } = await withGuard(businessId, { permission, feature });
  return session;
}

/** Merge flat form fields + optional existing metadata into one JSON object for DB. */
function buildPromotionMetadata(data) {
  const base =
    data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? { ...data.metadata }
      : {};
  const n = (v) => (v === '' || v === undefined || v === null ? null : v);
  const ni = (v) => {
    const x = parseInt(String(v), 10);
    return Number.isFinite(x) ? x : null;
  };
  const nf = (v) => {
    const x = parseFloat(String(v));
    return Number.isFinite(x) ? x : null;
  };

  return {
    ...base,
    buy_qty: ni(data.buy_qty ?? base.buy_qty),
    get_qty: ni(data.get_qty ?? base.get_qty),
    get_discount: nf(data.get_discount ?? base.get_discount) ?? 100,
    bundle_price: nf(data.bundle_price ?? base.bundle_price),
    per_customer_limit: ni(data.per_customer_limit ?? base.per_customer_limit),
    applicable_products: data.applicable_products ?? base.applicable_products ?? 'all',
    category_filter: n(data.category_filter ?? base.category_filter),
    bundle_items: Array.isArray(data.bundle_items) ? data.bundle_items : base.bundle_items ?? null,
  };
}

/** Map DB row to the shape PromotionEngine expects (snake + form aliases). */
function mapPromotionRow(row) {
  if (!row) return row;
  let meta = {};
  if (row.metadata != null) {
    meta = typeof row.metadata === 'string' ? safeJsonParse(row.metadata) : row.metadata;
    if (!meta || typeof meta !== 'object') meta = {};
  }

  const minOrder = row.min_order_amount != null ? Number(row.min_order_amount) : 0;

  return {
    ...row,
    start_date: row.starts_at,
    end_date: row.ends_at,
    min_order: minOrder,
    buy_qty: meta.buy_qty ?? '',
    get_qty: meta.get_qty ?? '',
    get_discount: meta.get_discount ?? 100,
    bundle_price: meta.bundle_price ?? '',
    applicable_products: meta.applicable_products ?? 'all',
    category_filter: meta.category_filter ?? '',
    per_customer_limit: meta.per_customer_limit ?? '',
    bundle_items: meta.bundle_items ?? [],
  };
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function resolveDates(data) {
  const start = data.start_date ?? data.starts_at ?? null;
  const end = data.end_date ?? data.ends_at ?? null;
  return { start, end };
}

/**
 * Get all promotions for a business
 */
export async function getPromotionsAction(businessId) {
  const client = await pool.connect();
  try {
    // Align with Campaigns tab (view + campaigns plan) so managers who can open the hub can list promos.
    await withGuard(businessId, { permission: 'crm.view_campaigns', feature: 'campaigns' });

    let result;
    try {
      result = await client.query(
        `SELECT p.*,
                COALESCE(
                  (SELECT json_agg(pp.product_id::text)
                   FROM promotion_products pp WHERE pp.promotion_id = p.id),
                  '[]'
                ) as product_ids
         FROM promotions p
         WHERE p.business_id = $1
         ORDER BY p.created_at DESC`,
        [businessId]
      );
    } catch (tableErr) {
      // Table may not exist yet
      if (tableErr.code === '42P01') {
        return actionSuccess({ promotions: [] });
      }
      throw tableErr;
    }

    const promotions = (result.rows || []).map(mapPromotionRow);
    return actionSuccess({ promotions });
  } catch (error) {
    console.error('[getPromotionsAction]', error);
    return actionFailure('FETCH_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Create a promotion (columns aligned with prisma `promotions`; extras in `metadata` jsonb).
 */
export async function createPromotionAction(businessId, data) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, 'crm.manage_promotions', 'promotions_crm');
    await client.query('BEGIN');

    const {
      name,
      description = '',
      type = 'percentage',
      value = 0,
      min_order = 0,
      max_discount = null,
      start_date = null,
      end_date = null,
      usage_limit = null,
      applicable_products = 'all',
      product_ids = [],
      is_active = true,
    } = data;

    const { start, end } = resolveDates(data);
    const metadata = buildPromotionMetadata(data);
    const isPercentage = type === 'percentage' || type === 'threshold';

    const res = await client.query(
      `INSERT INTO promotions (
        id, business_id, name, description, type, value,
        is_percentage, min_order_amount, max_discount,
        starts_at, ends_at, usage_limit, usage_count,
        is_active, is_ai_generated, metadata,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, 0,
        $12, false, $13::jsonb,
        NOW(), NOW()
      ) RETURNING *`,
      [
        businessId,
        name,
        description,
        type,
        parseFloat(value) || 0,
        isPercentage,
        parseFloat(min_order) || 0,
        max_discount != null && max_discount !== '' ? parseFloat(max_discount) : null,
        start || start_date || null,
        end || end_date || null,
        usage_limit != null && usage_limit !== '' ? parseInt(usage_limit, 10) : null,
        is_active,
        JSON.stringify(metadata),
      ]
    );

    const promotion = mapPromotionRow(res.rows[0]);

    // Link specific products if applicable
    if (applicable_products === 'products' && product_ids.length > 0) {
      for (const productId of product_ids) {
        await client.query(
          `INSERT INTO promotion_products (id, promotion_id, product_id, business_id)
           VALUES (gen_random_uuid(), $1, $2, $3)
           ON CONFLICT (promotion_id, product_id) DO NOTHING`,
          [promotion.id, productId, businessId]
        );
      }
    }

    await client.query('COMMIT');
    return actionSuccess({ promotion });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[createPromotionAction]', error);
    return actionFailure('CREATE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Update a promotion
 */
export async function updatePromotionAction(businessId, promotionId, data) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, 'crm.manage_promotions', 'promotions_crm');

    const {
      name,
      description,
      type,
      value,
      min_order,
      max_discount,
      start_date,
      end_date,
      usage_limit,
      applicable_products,
      is_active,
    } = data;

    const { start, end } = resolveDates(data);
    const metadata = buildPromotionMetadata(data);
    const isPercentage = type === 'percentage' || type === 'threshold';

    const res = await client.query(
      `UPDATE promotions SET
        name = $1, description = $2, type = $3, value = $4,
        is_percentage = $5, min_order_amount = $6, max_discount = $7,
        starts_at = $8, ends_at = $9, usage_limit = $10,
        metadata = $11::jsonb, is_active = $12,
        updated_at = NOW()
       WHERE id = $13 AND business_id = $14
       RETURNING *`,
      [
        name,
        description || '',
        type,
        parseFloat(value) || 0,
        isPercentage,
        parseFloat(min_order) || 0,
        max_discount != null && max_discount !== '' ? parseFloat(max_discount) : null,
        start || start_date || null,
        end || end_date || null,
        usage_limit != null && usage_limit !== '' ? parseInt(usage_limit, 10) : null,
        JSON.stringify(metadata),
        is_active !== undefined ? is_active : true,
        promotionId,
        businessId,
      ]
    );

    if (res.rows.length === 0) {
      return actionFailure('NOT_FOUND', 'Promotion not found');
    }

    // Keep promotion_products in sync with applicability
    if (applicable_products === 'products' && Array.isArray(data.product_ids)) {
      await client.query(`DELETE FROM promotion_products WHERE promotion_id = $1`, [promotionId]);
      for (const productId of data.product_ids) {
        await client.query(
          `INSERT INTO promotion_products (id, promotion_id, product_id, business_id)
           VALUES (gen_random_uuid(), $1, $2, $3)
           ON CONFLICT (promotion_id, product_id) DO NOTHING`,
          [promotionId, productId, businessId]
        );
      }
    } else if (applicable_products && applicable_products !== 'products') {
      await client.query(`DELETE FROM promotion_products WHERE promotion_id = $1`, [promotionId]);
    }

    return actionSuccess({ promotion: mapPromotionRow(res.rows[0]) });
  } catch (error) {
    console.error('[updatePromotionAction]', error);
    return actionFailure('UPDATE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Toggle promotion active status
 */
export async function togglePromotionAction(businessId, promotionId, isActive) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, 'crm.manage_promotions', 'promotions_crm');

    await client.query(
      `UPDATE promotions SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3`,
      [isActive, promotionId, businessId]
    );

    return actionSuccess({ message: `Promotion ${isActive ? 'activated' : 'paused'}` });
  } catch (error) {
    console.error('[togglePromotionAction]', error);
    return actionFailure('TOGGLE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Delete a promotion
 */
export async function deletePromotionAction(businessId, promotionId) {
  const client = await pool.connect();
  try {
    await checkAuth(businessId, 'crm.manage_promotions', 'promotions_crm');

    await client.query(`DELETE FROM promotions WHERE id = $1 AND business_id = $2`, [promotionId, businessId]);

    return actionSuccess({ message: 'Promotion deleted' });
  } catch (error) {
    console.error('[deletePromotionAction]', error);
    return actionFailure('DELETE_ERROR', error.message);
  } finally {
    client.release();
  }
}
