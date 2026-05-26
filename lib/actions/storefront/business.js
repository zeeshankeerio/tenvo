'use server';

import pool from '@/lib/db';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';

/**
 * Get business by domain for storefront
 */
export async function getBusinessByDomain(domain) {
  // Validate domain parameter
  if (!domain || typeof domain !== 'string') {
    console.error('[getBusinessByDomain] Invalid domain parameter:', domain);
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  const client = await pool.connect();
  
  try {
    // Normalize domain: lowercase and try both hyphen and underscore formats
    const normalizedDomain = domain.toLowerCase().trim();
    const altDomain = normalizedDomain.replace(/-/g, '_');
    const altDomain2 = normalizedDomain.replace(/_/g, '-');
    
    console.log(`[getBusinessByDomain] Looking for domain: ${normalizedDomain} (alternatives: ${altDomain}, ${altDomain2})`);
    
    let result;
    
    // Try query with full joins first, fallback to simple query if tables missing
    try {
      // Try multiple domain formats (case-insensitive) with full joins
      result = await client.query(
        `SELECT 
          b.id, b.business_name, b.domain, b.email, b.phone, b.description,
          b.logo_url, b.cover_image_url, b.website, b.category,
          b.address, b.city, b.country, b.postal_code,
          b.is_active, b.is_verified, b.created_at,
          bs.plan_tier, bs.is_storefront_enabled, bs.store_settings,
          p.features as plan_features
        FROM businesses b
        LEFT JOIN business_settings bs ON b.id = bs.business_id
        LEFT JOIN subscription_plans p ON bs.plan_id = p.id
        WHERE LOWER(b.domain) = ANY($1) AND b.is_active = true`,
        [[normalizedDomain, altDomain, altDomain2]]
      );
    } catch (tableError) {
      // If business_settings table doesn't exist, fallback to simple query
      if (tableError.message?.includes('business_settings') || tableError.code === '42P01') {
        console.log(`[getBusinessByDomain] Business settings table missing, using fallback query`);
        result = await client.query(
          `SELECT 
            b.id, b.business_name, b.domain, b.email, b.phone, b.description,
            b.logo_url, b.cover_image_url, b.website, b.category,
            b.address, b.city, b.country, b.postal_code,
            b.is_active, b.is_verified, b.created_at,
            'free' as plan_tier,
            true as is_storefront_enabled,
            null as store_settings,
            null as plan_features
          FROM businesses b
          WHERE LOWER(b.domain) = ANY($1) AND b.is_active = true`,
          [[normalizedDomain, altDomain, altDomain2]]
        );
      } else {
        throw tableError;
      }
    }
    
    // If not found, check if it's a custom domain
    if (result.rows.length === 0) {
      console.log(`[getBusinessByDomain] Not found in businesses table, checking custom domains...`);
      try {
        result = await client.query(
          `SELECT 
            b.id, b.business_name, b.domain, b.email, b.phone, b.description,
            b.logo_url, b.cover_image_url, b.website, b.category,
            b.address, b.city, b.country, b.postal_code,
            b.is_active, b.is_verified, b.created_at,
            bs.plan_tier, bs.is_storefront_enabled, bs.store_settings,
            p.features as plan_features
          FROM business_custom_domains cd
          JOIN businesses b ON cd.business_id = b.id
          LEFT JOIN business_settings bs ON b.id = bs.business_id
          LEFT JOIN subscription_plans p ON bs.plan_id = p.id
          WHERE LOWER(cd.domain) = ANY($1) AND cd.is_active = true AND b.is_active = true`,
          [[normalizedDomain, altDomain, altDomain2]]
        );
      } catch (customDomainError) {
        // If tables don't exist, skip custom domain check
        if (customDomainError.message?.includes('business_custom_domains') || customDomainError.code === '42P01') {
          console.log(`[getBusinessByDomain] Custom domains table missing, skipping custom domain check`);
          result = { rows: [] };
        } else {
          throw customDomainError;
        }
      }
    }
    
    if (result.rows.length === 0) {
      console.log(`[getBusinessByDomain] Business not found for domain: ${domain}`);
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }
    
    const business = result.rows[0];
    console.log(`[getBusinessByDomain] Found business: ${business.business_name} (ID: ${business.id})`);
    
    // Check if storefront is enabled for this business
    // Default to enabled if no settings exist (is_storefront_enabled can be null from LEFT JOIN)
    const isStorefrontEnabled = business.is_storefront_enabled !== false; // Default to true unless explicitly false
    
    if (!isStorefrontEnabled) {
      console.log(`[getBusinessByDomain] Storefront disabled for business: ${business.id}`);
      return actionFailure('STOREFRONT_DISABLED', 'Storefront is not enabled for this business');
    }
    
    console.log(`[getBusinessByDomain] Storefront enabled for business: ${business.id}`);
    
    // Get categories (with fallback if table doesn't exist)
    let categoriesResult = { rows: [] };
    try {
      categoriesResult = await client.query(
        `SELECT id, name, slug, description, image_url, parent_id
        FROM product_categories
        WHERE business_id = $1::uuid AND is_active = true
        ORDER BY sort_order, name`,
        [business.id]
      );
    } catch (categoriesError) {
      // If product_categories table doesn't exist, return empty categories
      if (categoriesError.message?.includes('product_categories') || categoriesError.code === '42P01') {
        console.log(`[getBusinessByDomain] Product categories table missing, returning empty categories`);
        categoriesResult = { rows: [] };
      } else {
        throw categoriesError;
      }
    }
    
    return actionSuccess({
      business: {
        id: business.id,
        business_name: business.business_name,
        domain: business.domain,
        email: business.email,
        phone: business.phone,
        description: business.description,
        logo_url: business.logo_url,
        cover_image_url: business.cover_image_url,
        website: business.website,
        category: business.category,
        address: business.address,
        city: business.city,
        country: business.country,
        postal_code: business.postal_code,
        is_verified: business.is_verified,
        created_at: business.created_at,
      },
      settings: {
        ...(business.store_settings || {}),
        currency: business.store_settings?.currency || 'PKR',
        locale: business.store_settings?.locale || 'en-PK',
      },
      categories: categoriesResult.rows,
      plan: {
        tier: business.plan_tier || 'starter',
        features: business.plan_features || {},
      },
    });
    
  } catch (error) {
    console.error('[getBusinessByDomain] Error:', error);
    return actionFailure('DATABASE_ERROR', error.message);
  } finally {
    client.release();
  }
}

/**
 * Get business public settings
 */
export async function getBusinessPublicSettings(businessId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT settings FROM business_settings WHERE business_id = $1::uuid`,
      [businessId]
    );
    
    if (result.rows.length === 0) {
      return actionSuccess({
        currency: 'PKR',
        locale: 'en-PK',
        storefront: {
          theme: 'default',
          primary_color: '#c49c3b',
        },
      });
    }
    
    const settings = result.rows[0].settings || {};
    
    return actionSuccess({
      currency: settings.currency || 'PKR',
      locale: settings.locale || 'en-PK',
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
    const result = await client.query(
      `SELECT b.is_active, bs.settings
      FROM businesses b
      LEFT JOIN business_settings bs ON b.id = bs.business_id::uuid
      WHERE b.id = $1::uuid`,
      [businessId]
    );
    
    if (result.rows.length === 0) {
      return actionFailure('BUSINESS_NOT_FOUND', 'Business not found');
    }
    
    const { is_active, settings } = result.rows[0];
    const storefrontEnabled = settings?.storefront?.enabled !== false;
    
    return actionSuccess({
      active: is_active && storefrontEnabled,
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
        const itemsResult = await client.query(
          `SELECT 
            oi.id, oi.product_id, oi.product_name, oi.product_sku,
            oi.quantity, oi.unit_price, oi.total_price, oi.tax_amount, oi.metadata,
            p.image_url
          FROM storefront_order_items oi
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = $1::integer`,
          [order.id]
        );
        
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
