import pool from '@/lib/db';
import { checkProductStock } from '@/lib/actions/storefront/products';
import { isStorefrontProductUuid, resolveStorefrontProductId } from '@/lib/utils/storefrontProductRef';
import { classifyOrderLineFulfillment } from '@/lib/storefront/digitalProducts';
import { queryStorefrontVariantRequirement } from '@/lib/storefront/storefrontProductVariants';

/**
 * Resolve cart line to canonical tenant product UUID (SKU/slug → UUID).
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {string} productRef
 */
async function resolveCheckoutProductId(client, businessId, productRef) {
  const ref = String(productRef || '').trim();
  if (!ref) return null;
  return resolveStorefrontProductId(client, ref, businessId);
}

/**
 * Resolve SKU/slug cart refs to tenant product UUIDs.
 * @param {import('pg').PoolClient} client
 * @param {string} businessId
 * @param {Array<{ productId: string }>} items
 */
export async function resolveCheckoutCartItemRefs(client, businessId, items) {
  const resolvedItems = [];
  const issues = [];

  for (const item of items) {
    const resolvedId = await resolveCheckoutProductId(client, businessId, item?.productId);
    if (!resolvedId) {
      issues.push({
        productId: item?.productId,
        message: 'One or more items are preview-only and cannot be ordered.',
        removed: true,
      });
      continue;
    }
    resolvedItems.push({ ...item, productId: resolvedId });
  }

  return { resolvedItems, issues };
}

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

  const client = await pool.connect();
  let digitalOnly = false;

  try {
    const { resolvedItems, issues } = await resolveCheckoutCartItemRefs(client, businessId, items);

    if (issues.length > 0) {
      const first = issues[0];
      return {
        ok: false,
        status: 409,
        error: first.message,
        issues,
      };
    }

    const lineRefs = resolvedItems.map((i) => ({ productId: i.productId }));

    if (lineRefs.length === items.length) {
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
      }
    }

    const stockIssues = [];

    for (const item of resolvedItems) {
      let effectiveVariantId = item.variantId || null;

      if (
        effectiveVariantId != null &&
        effectiveVariantId !== '' &&
        !isStorefrontProductUuid(effectiveVariantId)
      ) {
        stockIssues.push({
          productId: item.productId,
          variantId: effectiveVariantId,
          message: 'Invalid product option selected.',
        });
        continue;
      }

      if (!effectiveVariantId) {
        const requirement = await queryStorefrontVariantRequirement(
          client,
          item.productId,
          businessId
        );
        if (requirement.required && !requirement.soleVariantId) {
          stockIssues.push({
            productId: item.productId,
            name: item.name,
            message: 'Please select size, color, or other options for one or more items.',
          });
          continue;
        }
        if (requirement.soleVariantId) {
          effectiveVariantId = requirement.soleVariantId;
        }
      }

      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        stockIssues.push({
          productId: item.productId,
          message: 'Invalid quantity for one or more items.',
        });
        continue;
      }

      const stockResult = await checkProductStock(
        item.productId,
        effectiveVariantId,
        qty,
        businessId,
        client
      );

      if (!stockResult.success) {
        const code = stockResult.error?.code;
        if (code === 'VARIANT_REQUIRED') {
          stockIssues.push({
            productId: item.productId,
            name: item.name,
            message: 'Please select size, color, or other options for one or more items.',
          });
        } else {
          stockIssues.push({
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
        stockIssues.push({
          productId: item.productId,
          variantId: effectiveVariantId,
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

    if (stockIssues.length > 0) {
      const first = stockIssues[0];
      return {
        ok: false,
        status: 409,
        error: first.message,
        issues: stockIssues,
      };
    }

    return { ok: true, digitalOnly, resolvedItems };
  } finally {
    client.release();
  }
}
