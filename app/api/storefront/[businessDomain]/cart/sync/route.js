import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';

/**
 * POST /api/storefront/[businessDomain]/cart/sync
 * Validates cart items against the resolved store tenant.
 */
export async function POST(request, { params }) {
  try {
    const { businessDomain } = await params;
    const business = await resolveStorefrontBusiness(businessDomain);

    if (!business?.id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { items = [] } = body;

    if (!items.length) {
      return NextResponse.json({ synced: true, items: [] });
    }

    const pool = (await import('@/lib/db')).default;
    const client = await pool.connect();

    try {
      const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];

      if (!productIds.length) {
        return NextResponse.json({ synced: true, items: [] });
      }

      const res = await client.query(
        `SELECT id::text, name, price, stock, image_url, is_active
         FROM products
         WHERE id = ANY($1::uuid[]) AND business_id = $2::uuid`,
        [productIds, business.id]
      );

      const stockMap = Object.fromEntries(res.rows.map((r) => [r.id, r]));

      const updatedItems = items
        .map((item) => {
          const p = stockMap[item.productId];
          if (!p || !p.is_active) return { ...item, removed: true };

          const maxQty = p.stock ?? 999;
          const qty = Math.min(item.quantity, maxQty);

          return {
            ...item,
            quantity: qty,
            maxQuantity: maxQty,
            price: parseFloat(p.price),
            name: p.name,
            image: p.image_url,
            outOfStock: p.stock !== null && p.stock <= 0,
          };
        })
        .filter((i) => !i.removed);

      return NextResponse.json({ synced: true, items: updatedItems });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[cart sync]', error);
    return NextResponse.json({ error: 'Cart sync failed', synced: false }, { status: 503 });
  }
}
