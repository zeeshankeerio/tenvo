import { NextResponse } from 'next/server';
import { checkProductStock } from '@/lib/actions/storefront/products';

/**
 * POST /api/storefront/products/[productId]/stock
 * Check stock availability before adding to cart (tenant-scoped).
 * Requires businessId, product must belong to that business.
 */
export async function POST(request, { params }) {
  try {
    const { productId } = await params;
    const body = await request.json().catch(() => ({}));
    const { variantId = null, quantity = 1, businessId = null } = body;

    if (!productId) {
      return NextResponse.json({ message: 'Product ID required' }, { status: 400 });
    }
    if (!businessId) {
      return NextResponse.json({ message: 'Business ID required' }, { status: 400 });
    }

    const stockResult = await checkProductStock(productId, variantId, quantity, businessId);

    if (!stockResult.success) {
      return NextResponse.json(
        { message: stockResult.error?.message || 'Product not found' },
        { status: 404 }
      );
    }

    const { available, maxQuantity, stock } = stockResult;

    if (!available) {
      return NextResponse.json(
        { message: `Only ${maxQuantity} items available`, available: false, maxQuantity },
        { status: 409 }
      );
    }

    const pool = (await import('@/lib/db')).default;
    const client = await pool.connect();
    let product = null;

    try {
      let productRow;
      if (variantId) {
        const res = await client.query(
          `SELECT p.id, p.name, p.business_id, p.slug,
                  COALESCE(pv.price, p.price) as price,
                  COALESCE(pv.image_url, p.image_url) as image_url,
                  pv.attribute_1_value, pv.attribute_2_value
           FROM products p
           JOIN product_variants pv ON pv.id = $1::uuid AND pv.product_id = p.id::uuid
           WHERE p.id = $2::uuid AND p.business_id = $3::uuid AND pv.business_id = $3::uuid
             AND COALESCE(p.is_deleted, false) = false AND p.is_active = true`,
          [variantId, productId, businessId]
        );
        productRow = res.rows[0];
        if (productRow) {
          const variantParts = [productRow.attribute_1_value, productRow.attribute_2_value]
            .filter(Boolean).join(' / ');
          product = {
            ...productRow,
            price: parseFloat(productRow.price),
            variantName: variantParts || null,
          };
        }
      } else {
        const res = await client.query(
          `SELECT id, name, business_id, slug, price, image_url
           FROM products
           WHERE id = $1::uuid AND business_id = $2::uuid
             AND COALESCE(is_deleted, false) = false AND is_active = true`,
          [productId, businessId]
        );
        productRow = res.rows[0];
        if (productRow) {
          product = { ...productRow, price: parseFloat(productRow.price) };
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
