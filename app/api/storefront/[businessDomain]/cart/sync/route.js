import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import {
  isStorefrontProductUuid,
  resolveStorefrontProductId,
} from '@/lib/utils/storefrontProductRef';
import {
  querySellableLocationQtyBatch,
  queryVariantStockSumBatch,
  resolveSellableStockQty,
} from '@/lib/storefront/storefrontOrderStock';

/**
 * POST /api/storefront/[businessDomain]/cart/sync
 * Validates cart items against the resolved store tenant using sellable stock
 * (locations / variants), not headline products.stock alone.
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
      const refToCanonical = new Map();
      for (const item of items) {
        const ref = item?.productId;
        if (!ref || refToCanonical.has(ref)) continue;
        const canonicalId = await resolveStorefrontProductId(client, ref, business.id);
        if (canonicalId) refToCanonical.set(ref, canonicalId);
      }

      const productIds = [...new Set([...refToCanonical.values()])];
      if (!productIds.length) {
        return NextResponse.json({ synced: true, items: [] });
      }

      const res = await client.query(
        `SELECT id::text, name, price, stock, image_url, is_active,
                COALESCE(has_variants, false) AS has_variants
         FROM products
         WHERE id = ANY($1::uuid[]) AND business_id = $2::uuid`,
        [productIds, business.id]
      );

      const stockMap = Object.fromEntries(res.rows.map((r) => [r.id, r]));
      const locationQtyByProduct = await querySellableLocationQtyBatch(
        client,
        business.id,
        productIds
      );
      const variantProductIds = res.rows.filter((r) => r.has_variants).map((r) => r.id);
      const variantStockByProduct = await queryVariantStockSumBatch(
        client,
        business.id,
        variantProductIds
      );

      const variantIds = [
        ...new Set(
          items
            .map((i) => i.variantId)
            .filter((id) => id && isStorefrontProductUuid(id))
        ),
      ];
      let variantStockMap = {};
      if (variantIds.length > 0) {
        const vr = await client.query(
          `SELECT id::text, stock
           FROM product_variants
           WHERE business_id = $1::uuid
             AND id = ANY($2::uuid[])
             AND COALESCE(is_active, true) = true
             AND COALESCE(is_deleted, false) = false`,
          [business.id, variantIds]
        );
        variantStockMap = Object.fromEntries(
          vr.rows.map((r) => [r.id, Number(r.stock ?? 0)])
        );
      }

      const updatedItems = items
        .map((item) => {
          const canonicalId = refToCanonical.get(item.productId);
          const p = canonicalId ? stockMap[canonicalId] : null;
          if (!p || !p.is_active) return { ...item, removed: true };

          let maxQty;
          if (item.variantId && item.variantId in variantStockMap) {
            maxQty = variantStockMap[item.variantId];
          } else {
            const locationQty = locationQtyByProduct.has(canonicalId)
              ? locationQtyByProduct.get(canonicalId)
              : null;
            const variantSum = p.has_variants
              ? (variantStockByProduct.get(canonicalId) ?? 0)
              : null;
            const variants = variantSum != null ? [{ stock: variantSum }] : [];
            maxQty = resolveSellableStockQty({
              headlineStock: p.stock,
              locationQty,
              variants,
            });
            if (maxQty == null) maxQty = 999;
          }

          const qty = Math.min(Number(item.quantity) || 0, maxQty);

          return {
            ...item,
            productId: canonicalId,
            quantity: qty,
            maxQuantity: maxQty,
            price: parseFloat(p.price),
            name: p.name,
            image: p.image_url,
            outOfStock: maxQty <= 0,
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
