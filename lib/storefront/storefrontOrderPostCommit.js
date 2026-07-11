import pool from '@/lib/db';
import { sendOrderConfirmationEmail, sendNewOrderMerchantEmail } from '@/lib/email/resend';
import { invalidateStorefrontCatalog } from '@/lib/storefront/invalidateStorefrontCatalog';
import { recordStorefrontOrderAnalytics } from '@/lib/storefront/storefrontAnalytics';
import { notifyStorefrontOrder, notifyLowStock } from '@/lib/notifications/notificationHelpers';
import { resolveBusinessMerchantAlertEmails } from '@/lib/notifications/businessNotificationRecipients';
import {
  querySellableLocationQty,
  resolveSellableStockQty,
} from '@/lib/storefront/storefrontOrderStock';

/**
 * Re-check sellable stock after an online sale and raise low-stock notifications.
 * Best-effort; never throws.
 * @param {import('pg').PoolClient} client
 * @param {object} business
 * @param {Array<{ productId: string }>} resolvedLines
 */
export async function checkLowStockAfterStorefrontSale(client, business, resolvedLines) {
  const productIds = [...new Set(resolvedLines.map((l) => l.productId).filter(Boolean))];
  for (const productId of productIds) {
    try {
      const pr = await client.query(
        `SELECT name, stock::float AS stock, has_variants,
                reorder_point::float AS reorder_point,
                min_stock::float AS min_stock,
                min_stock_level::float AS min_stock_level
         FROM products WHERE id = $1::uuid AND business_id = $2::uuid`,
        [productId, business.id]
      );
      const p = pr.rows[0];
      if (!p) continue;

      let variants = [];
      if (p.has_variants) {
        const vr = await client.query(
          `SELECT COALESCE(SUM(stock), 0)::float AS s
           FROM product_variants
           WHERE product_id = $1::uuid AND business_id = $2::uuid
             AND COALESCE(is_active, true) = true AND COALESCE(is_deleted, false) = false`,
          [productId, business.id]
        );
        variants = [{ stock: parseFloat(vr.rows[0]?.s || 0) }];
      }

      let locationQty = null;
      try {
        locationQty = await querySellableLocationQty(client, productId, business.id);
      } catch {
        locationQty = null;
      }

      const sellable = resolveSellableStockQty({
        headlineStock: p.stock,
        locationQty,
        variants,
      });
      if (sellable == null) continue;

      const threshold =
        Number(p.reorder_point) > 0
          ? Number(p.reorder_point)
          : Number(p.min_stock_level) > 0
            ? Number(p.min_stock_level)
            : Number(p.min_stock) > 0
              ? Number(p.min_stock)
              : 5;

      if (sellable <= threshold) {
        await notifyLowStock({
          businessId: business.id,
          business: {
            id: business.id,
            domain: business.domain,
            business_name: business.business_name,
          },
          productId,
          productName: p.name,
          currentStock: sellable,
          minStock: threshold,
          client,
        });
      }
    } catch (err) {
      console.warn('[Create Order] low-stock check skipped:', err?.message || err);
    }
  }
}

/**
 * Side effects after a successful storefront checkout COMMIT.
 * Runs on a separate pool connection so the HTTP response is not blocked.
 * @param {object} params
 */
async function runStorefrontOrderPostCommit(params) {
  const {
    business,
    orderId,
    orderNumber,
    customerName,
    customerEmail,
    grandTotal,
    resolvedLines,
    checkoutItems,
    customer,
    effectivePaymentMethod,
    shippingMethod,
    subtotalNet,
    shippingAmount,
    taxTotal,
    currency,
  } = params;

  invalidateStorefrontCatalog(business.id);

  const client = await pool.connect();
  try {
    try {
      await notifyStorefrontOrder({
        businessId: business.id,
        business,
        orderId,
        orderNumber,
        customerName,
        customerEmail,
        totalAmount: grandTotal,
        itemCount: resolvedLines.length,
        client,
      });
    } catch (notifyErr) {
      console.warn('[Create Order] notification skipped:', notifyErr?.message || notifyErr);
    }

    try {
      await recordStorefrontOrderAnalytics(client, business.id, grandTotal);
    } catch (analyticsErr) {
      console.warn('[Create Order] analytics rollup skipped:', analyticsErr?.message || analyticsErr);
    }

    await checkLowStockAfterStorefrontSale(client, business, resolvedLines);
  } finally {
    client.release();
  }

  const emailItems = resolvedLines.map((line, idx) => ({
    name: line.productName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    variantName: line.variantName,
    ...checkoutItems[idx],
  }));

  void sendOrderConfirmationEmail({
    to: customer.email,
    order: {
      orderNumber,
      items: emailItems,
      subtotal: subtotalNet,
      shipping: shippingAmount,
      tax: taxTotal,
      total: grandTotal,
      shippingMethod,
      paymentMethod: effectivePaymentMethod,
    },
    business: {
      name: business.business_name,
      email: business.email,
    },
  }).catch(console.error);

  try {
    const merchantEmails = await resolveBusinessMerchantAlertEmails(business.id, {
      fallbackBusinessEmail: business.email,
    });
    if (merchantEmails.length === 0) return;

    const merchantBusiness = {
      name: business.business_name,
      email: merchantEmails[0],
    };
    const orderPayload = {
      orderNumber,
      items: emailItems,
      total: grandTotal,
      currency: currency || undefined,
      customerName,
      customerEmail,
    };

    await Promise.all(
      merchantEmails.map((to) =>
        sendNewOrderMerchantEmail({ to, order: orderPayload, business: merchantBusiness })
      )
    );
  } catch (merchantEmailErr) {
    console.error('[Create Order] merchant email failed:', merchantEmailErr);
  }
}

/**
 * Fire-and-forget post-commit work (notifications, analytics, emails).
 * @param {object} params
 */
export function scheduleStorefrontOrderPostCommit(params) {
  void runStorefrontOrderPostCommit(params).catch((err) => {
    console.error('[Create Order] post-commit failed:', err?.message || err);
  });
}
