'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { resolveStorefrontCurrency, resolveStorefrontLocale } from '@/lib/storefront/storefrontRegional';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { requireStorefrontHubAccess } from '@/lib/tenancy/storefrontHubAuth';

function parseSettingsJson(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Get business by domain for storefront (cached — see fetchBusinessByDomain.js).
 */
export async function getBusinessByDomain(domain) {
  return fetchBusinessByDomain(domain);
}

/**
 * Get business public settings
 */
export async function getBusinessPublicSettings(businessId) {
  const client = await pool.connect();
  
  try {
    let result;
    try {
      result = await client.query(
        `SELECT settings, COALESCE(is_storefront_enabled, true) AS is_storefront_enabled
         FROM business_settings WHERE business_id = $1::uuid`,
        [businessId]
      );
    } catch (e) {
      if (e.code === '42703') {
        result = await client.query(
          `SELECT settings FROM business_settings WHERE business_id = $1::uuid`,
          [businessId]
        );
      } else {
        throw e;
      }
    }
    
    if (result.rows.length === 0) {
      return actionSuccess({
        currency: 'PKR',
        locale: 'en-PK',
        is_storefront_enabled: true,
        storefront: {
          theme: 'default',
          primary_color: '#c49c3b',
        },
      });
    }
    
    const row = result.rows[0];
    const settings = parseSettingsJson(row.settings);
    const colOn = row.is_storefront_enabled !== false;
    const jsonOff =
      settings.storefront?.enabled === false || settings.enabled === false;

    return actionSuccess({
      currency: resolveStorefrontCurrency(settings, null),
      locale: resolveStorefrontLocale(settings, null),
      is_storefront_enabled: colOn && !jsonOff,
      storefront: settings.storefront || {},
    });
    
  } catch (error) {
    console.error('[getBusinessPublicSettings] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get business contact information
 */
export async function getBusinessContact(businessId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        business_name, email, phone, 
        address, city, country,
        website, social_links
      FROM businesses
      WHERE id = $1::uuid`,
      [businessId]
    );
    
    if (result.rows.length === 0) {
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }
    
    return actionSuccess(result.rows[0]);
    
  } catch (error) {
    console.error('[getBusinessContact] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Check if business has active storefront
 */
export async function isStorefrontActive(businessId) {
  const client = await pool.connect();
  
  try {
    let result;
    try {
      result = await client.query(
        `SELECT b.is_active,
                COALESCE(bs.is_storefront_enabled, true) AS is_storefront_enabled,
                bs.settings
         FROM businesses b
         LEFT JOIN business_settings bs ON b.id = bs.business_id
         WHERE b.id = $1::uuid`,
        [businessId]
      );
    } catch (e) {
      if (e.code === '42703') {
        result = await client.query(
          `SELECT b.is_active, bs.settings
           FROM businesses b
           LEFT JOIN business_settings bs ON b.id = bs.business_id
           WHERE b.id = $1::uuid`,
          [businessId]
        );
      } else {
        throw e;
      }
    }
    
    if (result.rows.length === 0) {
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }
    
    const row = result.rows[0];
    const { is_active } = row;
    const settings = parseSettingsJson(row.settings);
    const colOn = row.is_storefront_enabled !== false;
    const jsonOff =
      settings.storefront?.enabled === false || settings.enabled === false;
    const storefrontEnabled = colOn && !jsonOff;
    
    return actionSuccess({
      active: Boolean(is_active) && storefrontEnabled,
      is_active,
      storefront_enabled: storefrontEnabled,
    });
    
  } catch (error) {
    console.error('[isStorefrontActive] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get storefront orders for a business
 */
export async function getStorefrontOrders(businessId, options = {}) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();
  
  try {
    const { 
      customerEmail,
      orderNumber,
      status, 
      paymentStatus, 
      limit = 50, 
      offset = 0,
      startDate,
      endDate
    } = options;
    
    let query = `
      SELECT 
        o.id, o.order_number, o.customer_email, o.customer_phone, o.customer_name,
        o.shipping_address, o.billing_address, o.subtotal, o.tax_amount,
        o.shipping_amount, o.discount_amount, o.total_amount, o.currency,
        o.status, o.payment_status, o.fulfillment_status, o.notes, o.metadata,
        o.created_at, o.updated_at
      FROM storefront_orders o
      WHERE o.business_id = $1::uuid
    `;
    
    const params = [businessId];
    let paramCount = 1;
    
    if (customerEmail) {
      paramCount++;
      query += ` AND o.customer_email = $${paramCount}`;
      params.push(customerEmail);
    }

    if (orderNumber) {
      paramCount++;
      query += ` AND o.order_number ILIKE $${paramCount}`;
      params.push(`%${orderNumber}%`);
    }
    
    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }
    
    if (paymentStatus) {
      paramCount++;
      query += ` AND o.payment_status = $${paramCount}`;
      params.push(paymentStatus);
    }
    
    if (startDate) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    
    // Get order items for each order
    const orders = await Promise.all(
      result.rows.map(async (order) => {
        const orderId = parseInt(order.id, 10);
        const itemsSqlFull = `
          SELECT 
            oi.id, oi.product_id, oi.product_name,
            COALESCE(NULLIF(TRIM(oi.product_sku), ''), oi.metadata->>'product_sku', oi.metadata->>'sku') AS product_sku,
            oi.quantity, oi.unit_price, oi.total_price, oi.tax_amount, oi.metadata,
            p.image_url
          FROM storefront_order_items oi
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = $1::integer`;

        const itemsSqlMetadataSku = `
          SELECT 
            oi.id, oi.product_id, oi.product_name,
            COALESCE(oi.metadata->>'product_sku', oi.metadata->>'sku') AS product_sku,
            oi.quantity, oi.unit_price, oi.total_price, oi.tax_amount, oi.metadata,
            p.image_url
          FROM storefront_order_items oi
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = $1::integer`;

        let itemsResult;
        try {
          itemsResult = await client.query(itemsSqlFull, [orderId]);
        } catch (itemErr) {
          if (itemErr.code === '42703' && String(itemErr.message).includes('product_sku')) {
            itemsResult = await client.query(itemsSqlMetadataSku, [orderId]);
          } else {
            throw itemErr;
          }
        }

        return {
          ...order,
          items: itemsResult.rows,
        };
      })
    );
    
    return actionSuccess({ orders });
    
  } catch (error) {
    console.error('[getStorefrontOrders] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get order statistics for a business
 */
export async function getOrderStats(businessId, options = {}) {
  const authCheck = await requireStorefrontHubAccess(businessId);
  if (!authCheck.ok) return authCheck.response;

  const client = await pool.connect();
  
  try {
    const { startDate, endDate } = options;
    
    // Build date filter
    let dateFilter = '';
    const params = [businessId];
    
    if (startDate && endDate) {
      dateFilter = ' AND created_at BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = ' AND created_at >= $2';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = ' AND created_at <= $2';
      params.push(endDate);
    }
    
    // Get total stats
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM storefront_orders
      WHERE business_id = $1::uuid AND status != 'cancelled'${dateFilter}`,
      params
    );
    
    // Get status breakdown
    const statusResult = await client.query(
      `SELECT 
        status, 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM storefront_orders
      WHERE business_id = $1::uuid${dateFilter}
      GROUP BY status`,
      params
    );
    
    // Get daily stats for the last 30 days
    const dailyResult = await client.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM storefront_orders
      WHERE business_id = $1::uuid 
        AND status != 'cancelled'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      [businessId]
    );
    
    return actionSuccess({
      overview: statsResult.rows[0],
      byStatus: statusResult.rows,
      daily: dailyResult.rows,
    });
    
  } catch (error) {
    console.error('[getOrderStats] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}
