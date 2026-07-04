import { checkProductStock } from '@/lib/actions/storefront/products';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import pool from '@/lib/db';
import { classifyOrderLineFulfillment } from '@/lib/storefront/digitalProducts';

/**
 * Validate cart lines before checkout using the same stock rules as order creation.
 * @param {string} businessId
 * @param {Array<{ productId: string, variantId?: string | null, quantity: number, name?: string }>} items
 */
export async function validateCheckoutCartLines(businessId, items) {
  if (!businessId) {
    return { ok: false, status: 400, error: 'Store not ready' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, error: 'Your cart is empty' };
  }

  const lineRefs = items
    .filter((i) => isStorefrontProductUuid(i?.productId))
    .map((i) => ({ productId: i.productId }));

  let digitalOnly = false;

  if (lineRefs.length === items.length) {
    const client = await pool.connect();
    try {
      const mix = await classifyOrderLineFulfillment(client, businessId, lineRefs);
      if (mix.mixed) {
        return {
          ok: false,
          status: 400,
          error:
            'Your cart mixes digital and physical products. Please checkout digital and physical items separately.',
        };
      }
      digitalOnly = mix.allDigital;
    } catch (mixErr) {
      console.warn('[validateCheckoutCartLines] fulfillment mix check skipped:', mixErr?.message);
    } finally {
      client.release();
    }
  }

  const issues = [];

  for (const item of items) {
    if (!isStorefrontProductUuid(item?.productId)) {
      issues.push({
        productId: item?.productId,
        message: 'One or more items are preview-only and cannot be ordered.',
      });
      continue;
    }

    if (
      item?.variantId != null &&
      item.variantId !== '' &&
      !isStorefrontProductUuid(item.variantId)
    ) {
      issues.push({
        productId: item.productId,
        message: 'Invalid product option selected.',
      });
      continue;
    }

    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      issues.push({
        productId: item.productId,
        message: 'Invalid quantity for one or more items.',
      });
      continue;
    }

    const stockResult = await checkProductStock(
      item.productId,
      item.variantId || null,
      qty,
      businessId
    );

    if (!stockResult.success) {
      const code = stockResult.error?.code;
      if (code === 'VARIANT_REQUIRED') {
        issues.push({
          productId: item.productId,
          name: item.name,
          message: 'Please select size, color, or other options for one or more items.',
        });
      } else {
        issues.push({
          productId: item.productId,
          name: item.name,
          message: stockResult.error?.message || 'Product no longer available',
          removed: true,
        });
      }
      continue;
    }

    if (!stockResult.available) {
      const maxQty = stockResult.maxQuantity ?? 0;
      issues.push({
        productId: item.productId,
        variantId: item.variantId || null,
        name: item.name,
        message:
          maxQty > 0
            ? `Only ${maxQty} available for ${item.name || 'an item'}.`
            : `${item.name || 'An item'} is out of stock.`,
        maxQuantity: maxQty,
        adjustQuantity: maxQty > 0 ? maxQty : 0,
      });
    }
  }

  if (issues.length > 0) {
    const first = issues[0];
    return {
      ok: false,
      status: 409,
      error: first.message,
      issues,
    };
  }

  return { ok: true, digitalOnly };
}
