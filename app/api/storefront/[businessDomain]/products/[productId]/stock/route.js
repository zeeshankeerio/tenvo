import { NextResponse } from 'next/server';
import { checkProductStock } from '@/lib/actions/storefront/products';
import pool from '@/lib/db';
import { resolveStorefrontProductId } from '@/lib/utils/storefrontProductRef';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';

import { isDigitalFulfillment } from '@/lib/storefront/digitalProducts';

/**
 * POST /api/storefront/[businessDomain]/products/[productId]/stock
 * Check stock availability before adding to cart (domain-scoped).
 */
export async function POST(request, { params }) {
  try {
    const { businessDomain, productId } = await params;
    const business = await resolveStorefrontBusiness(businessDomain);

    if (!business?.id) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { variantId = null, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json({ message: 'Product ID required' }, { status: 400 });
    }

    const stockResult = await checkProductStock(productId, variantId, quantity, business.id);

    if (!stockResult.success) {
      const status = stockResult.error?.code === 'VARIANT_REQUIRED' ? 400 : 404;
      return NextResponse.json(
        { message: stockResult.error?.message || 'Product not found', code: stockResult.error?.code },
        { status }
      );
    }

    const { available, maxQuantity, stock } = stockResult;

    if (!available) {
      return NextResponse.json(
        { message: `Only ${maxQuantity} items available`, available: false, maxQuantity },
        { status: 409 }
      );
    }

    const client = await pool.connect();
    let product = null;

    try {
      const resolvedProductId = await resolveStorefrontProductId(client, productId, business.id);
      if (!resolvedProductId) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }

      let productRow;
      if (variantId) {
        const res = await client.query(
          `SELECT p.id, p.name, p.business_id, p.slug, p.tax_percent, p.domain_data,
                  COALESCE(pv.price, p.price) as price,
                  COALESCE(pv.image_url, p.image_url) as image_url,
                  pv.variant_name, pv.size, pv.color, pv.material
           FROM products p
           JOIN product_variants pv ON pv.id = $1::uuid AND pv.product_id = p.id::uuid
           WHERE p.id = $2::uuid AND p.business_id = $3::uuid AND pv.business_id = $3::uuid
             AND COALESCE(p.is_deleted, false) = false AND p.is_active = true`,
          [variantId, resolvedProductId, business.id]
        );
        productRow = res.rows[0];
        if (productRow) {
          const variantParts = [productRow.size, productRow.color, productRow.material]
            .filter(Boolean).join(' / ');
          product = {
            ...productRow,
            price: parseFloat(productRow.price),
            taxPercent: parseFloat(productRow.tax_percent || 0),
            variantName: productRow.variant_name || variantParts || null,
            fulfillmentType: isDigitalFulfillment(productRow.domain_data) ? 'digital' : 'physical',
          };
        }
      } else {
        const res = await client.query(
          `SELECT id, name, business_id, slug, price, image_url, tax_percent, domain_data
           FROM products
           WHERE id = $1::uuid AND business_id = $2::uuid
             AND COALESCE(is_deleted, false) = false AND is_active = true`,
          [resolvedProductId, business.id]
        );
        productRow = res.rows[0];
        if (productRow) {
          product = {
            ...productRow,
            price: parseFloat(productRow.price),
            taxPercent: parseFloat(productRow.tax_percent || 0),
            fulfillmentType: isDigitalFulfillment(productRow.domain_data) ? 'digital' : 'physical',
          };
        }
      }
    } finally {
      client.release();
    }

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      available: true,
      maxQuantity: maxQuantity ?? 999,
      stock,
      product,
    });
  } catch (error) {
    console.error('[stock route]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
