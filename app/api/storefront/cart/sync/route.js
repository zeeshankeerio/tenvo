import { NextResponse } from 'next/server';

/**
 * POST /api/storefront/cart/sync
 * Lightweight cart sync endpoint, validates items still exist and are in stock.
 * Returns updated stock info so the client can correct stale quantities.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { businessId, items = [] } = body;

    if (!businessId || !items.length) {
      return NextResponse.json({ synced: true, items: [] });
    }

    const pool = (await import('@/lib/db')).default;
    const client = await pool.connect();

    try {
      const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];

      if (!productIds.length) {
        return NextResponse.json({ synced: true, items: [] });
      }

      // Fetch current stock for all cart products in one query
      const res = await client.query(
        `SELECT id::text, name, price, stock, image_url, is_active
         FROM products
         WHERE id = ANY($1::uuid[]) AND business_id = $2::uuid`,
        [productIds, businessId]
      );

      const stockMap = Object.fromEntries(res.rows.map(r => [r.id, r]));

      const updatedItems = items.map(item => {
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
      }).filter(i => !i.removed);

      return NextResponse.json({ synced: true, items: updatedItems });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[cart sync]', error);
    // Non-critical, return success so cart still works offline
    return NextResponse.json({ synced: true, items: [] });
  }
}
