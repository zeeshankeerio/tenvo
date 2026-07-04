import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateOrderNumber, isStorefrontOrderNumberConflict } from '@/lib/utils/order';
import { sendOrderConfirmationEmail, sendNewOrderMerchantEmail } from '@/lib/email/resend';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import { lookupPublicStorefrontOrders } from '@/lib/storefront/publicOrderLookup';
import {
  parseStockNumber,
  querySellableLocationQty,
  resolveSellableStockQty,
  decrementHeadlineAndLocationsInTx,
  recordStorefrontSaleMovementInTx,
  recordStorefrontVariantSaleMovementInTx,
} from '@/lib/storefront/storefrontOrderStock';
import { recordStorefrontOrderAnalytics } from '@/lib/storefront/storefrontAnalytics';
import {
  incrementStorefrontPromoUsage,
  resolveStorefrontOrderDiscount,
} from '@/lib/storefront/storefrontOrderDiscount';
import { MembershipService } from '@/lib/services/MembershipService';
import { MEMBERSHIP_SOURCE } from '@/lib/memberships/membershipConstants';
import { notifyStorefrontOrder, notifyLowStock } from '@/lib/notifications/notificationHelpers';
import { resolveBusinessMerchantAlertEmails } from '@/lib/notifications/businessNotificationRecipients';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import { queryStorefrontVariantRequirement } from '@/lib/storefront/storefrontProductVariants';
import { areAllLinesDigital, digitalShippingAddress } from '@/lib/storefront/digitalProducts';

/**
 * Storefront checkout decrements stock via direct SQL (bypassing InventoryService),
 * so the InventoryService low-stock notification never runs for online sales. This
 * re-adds that safety net: after commit, re-read each sold product's sellable stock
 * and raise a low-stock notification when it drops to/below its threshold.
 * Best-effort and never throws.
 */
async function checkLowStockAfterSale(client, business, resolvedLines) {
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

      let variantSum = 0;
      if (p.has_variants) {
        const vr = await client.query(
          `SELECT COALESCE(SUM(stock), 0)::float AS s
           FROM product_variants
           WHERE product_id = $1::uuid AND business_id = $2::uuid
             AND COALESCE(is_active, true) = true AND COALESCE(is_deleted, false) = false`,
          [productId, business.id]
        );
        variantSum = parseFloat(vr.rows[0]?.s || 0);
      }
      let locationQty = 0;
      try {
        locationQty = (await querySellableLocationQty(client, productId, business.id)) || 0;
      } catch {
        locationQty = 0;
      }

      const sellable = Math.max(parseFloat(p.stock || 0), variantSum, locationQty);
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

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function formatAddressBlock(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const parts = [
    addr.address,
    addr.city,
    addr.state,
    addr.postalCode || addr.postal_code,
    addr.country,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * POST /api/storefront/[businessDomain]/orders
 * Server-authoritative pricing, row locks, storefront_orders / storefront_order_items.
 */
export async function POST(request, { params }) {
  const { businessDomain } = await params;
  const business = await resolveStorefrontBusiness(businessDomain);

  if (!business) {
    return NextResponse.json(
      { success: false, error: 'Business not found' },
      { status: 404 }
    );
  }

  const body = await request.json();
  const {
    customer,
    shippingAddress,
    billingAddress,
    items,
    shipping,
    paymentMethod,
    notes,
    promoCode,
    memberPricingRequested,
  } = body;

  if (!customer?.email || !customer?.firstName || !customer?.phone) {
    return NextResponse.json(
      { success: false, error: 'Customer information is required' },
      { status: 400 }
    );
  }

  const precheckClient = await pool.connect();
  let digitalOnlyOrder = false;

  try {
    // Pre-check digital fulfillment from product refs (before full pricing txn)
    if (items?.length) {
      const lineRefs = items
        .filter((i) => isStorefrontProductUuid(i?.productId))
        .map((i) => ({ productId: i.productId }));
      if (lineRefs.length === items.length) {
        digitalOnlyOrder = await areAllLinesDigital(precheckClient, business.id, lineRefs);
      }
    }
  } catch (digitalErr) {
    console.warn('[Create Order] digital pre-check skipped:', digitalErr?.message);
  } finally {
    precheckClient.release();
  }

  if (!digitalOnlyOrder && (!shippingAddress?.address || !shippingAddress?.city)) {
    return NextResponse.json(
      { success: false, error: 'Shipping address is required' },
      { status: 400 }
    );
  }

  const effectiveShippingAddress = digitalOnlyOrder
    ? digitalShippingAddress(customer)
    : shippingAddress;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Order must contain at least one item' },
      { status: 400 }
    );
  }

  // Fail fast on non-purchasable refs (e.g. demo/preview catalog rows whose id is a
  // SKU/slug, not a tenant product UUID). Without this, the ::uuid casts below would
  // throw and surface as an opaque 500 instead of a clean, actionable message.
  for (const item of items) {
    if (!isStorefrontProductUuid(item?.productId)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'One or more items are preview-only and can’t be ordered. Please add products from the store catalog and try again.',
        },
        { status: 400 }
      );
    }
    if (
      item?.variantId != null &&
      item.variantId !== '' &&
      !isStorefrontProductUuid(item.variantId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid product option selected.' },
        { status: 400 }
      );
    }
    const itemQty = Number(item?.quantity);
    if (!Number.isFinite(itemQty) || itemQty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity for one or more items.' },
        { status: 400 }
      );
    }
  }

  const shippingRaw = Number(shipping);
  const shippingAmount = digitalOnlyOrder
    ? 0
    : Number.isFinite(shippingRaw) && shippingRaw >= 0
      ? roundMoney(Math.min(shippingRaw, 9_999_999))
      : 0;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resolvedLines = [];

    for (const item of items) {
      if (!item?.productId) {
        throw new Error('Each item must include productId');
      }
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Invalid quantity');
      }

      let effectiveVariantId = item.variantId || null;

      if (!effectiveVariantId) {
        const requirement = await queryStorefrontVariantRequirement(
          client,
          item.productId,
          business.id
        );
        if (requirement.required) {
          throw new Error(
            'Please select size, color, or other options for one or more items'
          );
        }
        if (requirement.soleVariantId) {
          effectiveVariantId = requirement.soleVariantId;
        }
      }

      if (effectiveVariantId) {
        await client.query(
          `SELECT 1 FROM product_variants pv
           WHERE pv.id = $1::uuid AND pv.business_id = $2::uuid AND pv.product_id = $3::uuid
           FOR UPDATE`,
          [effectiveVariantId, business.id, item.productId]
        );

        const vr = await client.query(
          `SELECT pv.id, pv.product_id, pv.variant_name, pv.variant_sku, pv.price::text, pv.stock::text,
                  p.name as product_name, p.tax_percent::text
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id
           WHERE pv.id = $1::uuid AND pv.business_id = $2::uuid AND p.business_id = $2::uuid
             AND (p.is_deleted = false)`,
          [effectiveVariantId, business.id]
        );

        if (vr.rows.length === 0) {
          throw new Error(`Variant not found for product ${item.productId}`);
        }

        const row = vr.rows[0];
        const unitPrice = roundMoney(parseFloat(row.price || '0'));
        const taxPercent = roundMoney(parseFloat(row.tax_percent || '0'));
        const stock = parseStockNumber(row.stock);

        if (stock != null && stock < qty) {
          throw new Error(
            `Insufficient stock for ${row.product_name}. Only ${stock} available.`
          );
        }

        const lineNet = roundMoney(unitPrice * qty);
        const lineTax = roundMoney((lineNet * taxPercent) / 100);
        const lineTotal = roundMoney(lineNet + lineTax);

        resolvedLines.push({
          productId: row.product_id,
          variantId: row.id,
          productName: row.product_name,
          variantName: row.variant_name,
          sku: row.variant_sku,
          quantity: qty,
          unitPrice,
          taxPercent,
          lineNet,
          lineTax,
          lineTotal,
          isVariant: true,
        });
      } else {
        await client.query(
          `SELECT id FROM products p
           WHERE p.id = $1::uuid AND p.business_id = $2::uuid
           FOR UPDATE`,
          [item.productId, business.id]
        );

        const pr = await client.query(
          `SELECT p.id, p.name, p.price::text, p.tax_percent::text, p.stock::text
           FROM products p
           WHERE p.id = $1::uuid AND p.business_id = $2::uuid AND (p.is_deleted = false)`,
          [item.productId, business.id]
        );

        if (pr.rows.length === 0) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const row = pr.rows[0];
        const unitPrice = roundMoney(parseFloat(row.price || '0'));
        const taxPercent = roundMoney(parseFloat(row.tax_percent || '0'));
        const locationQty = await querySellableLocationQty(client, row.id, business.id);
        const stock = resolveSellableStockQty({
          headlineStock: row.stock,
          locationQty,
          variants: [],
        });

        if (stock != null && stock < qty) {
          throw new Error(
            `Insufficient stock for ${row.name}. Only ${stock} available.`
          );
        }

        const lineNet = roundMoney(unitPrice * qty);
        const lineTax = roundMoney((lineNet * taxPercent) / 100);
        const lineTotal = roundMoney(lineNet + lineTax);

        resolvedLines.push({
          productId: row.id,
          variantId: null,
          productName: row.name,
          variantName: null,
          sku: null,
          quantity: qty,
          unitPrice,
          taxPercent,
          lineNet,
          lineTax,
          lineTotal,
          isVariant: false,
        });
      }
    }

    let subtotalNet = 0;
    let taxTotal = 0;
    for (const line of resolvedLines) {
      subtotalNet = roundMoney(subtotalNet + line.lineNet);
      taxTotal = roundMoney(taxTotal + line.lineTax);
    }

    let discountAmount = 0;
    let discountMeta = {};
    let promoUsageRef = null;
    try {
      const discountResult = await resolveStorefrontOrderDiscount(client, business.id, {
        customerEmail: customer.email,
        subtotal: subtotalNet,
        promoCode,
        memberPricingRequested: Boolean(memberPricingRequested),
      });
      discountAmount = discountResult.discountAmount;
      discountMeta = {
        member_discount: discountResult.memberDiscount,
        promo_discount: discountResult.promoDiscount,
        promo_code: discountResult.promoCode,
        member_plan: discountResult.memberPlanName,
        member_percent: discountResult.memberPercent,
      };
      if (discountResult.promoRow?.id && discountResult.promoSource) {
        promoUsageRef = {
          source: discountResult.promoSource,
          id: discountResult.promoRow.id,
        };
      }
    } catch (discountErr) {
      if (
        discountErr?.code === 'INVALID_PROMO' ||
        discountErr?.code === 'MEMBER_PROMO_EMAIL' ||
        discountErr?.code === 'MEMBER_PROMO_FORBIDDEN' ||
        discountErr?.code === 'PROMO_MIN_ORDER'
      ) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: discountErr.message },
          { status: 400 }
        );
      }
      throw discountErr;
    }

    const grandTotal = roundMoney(subtotalNet + taxTotal + shippingAmount - discountAmount);

    const orderNumber = await generateOrderNumber(client, business.id);
    const customerName = `${customer.firstName} ${customer.lastName || ''}`.trim();

    let customerId = null;
    const existingCustomer = await client.query(
      `SELECT id FROM customers 
       WHERE business_id = $1::uuid AND lower(email) = lower($2)`,
      [business.id, customer.email]
    );

    if (existingCustomer.rows.length > 0) {
      customerId = existingCustomer.rows[0].id;
      await client.query(
        `UPDATE customers 
         SET name = $1, phone = $2, updated_at = NOW()
         WHERE id = $3::uuid AND business_id = $4::uuid`,
        [customerName, customer.phone, customerId, business.id]
      );
    } else {
      const newCustomer = await client.query(
        `INSERT INTO customers (
          business_id, name, email, phone, 
          address, city, country, pincode,
          created_at, updated_at
        ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id`,
        [
          business.id,
          customerName,
          customer.email,
          customer.phone,
          shippingAddress.address,
          shippingAddress.city,
          shippingAddress.country || 'PK',
          shippingAddress.postalCode || shippingAddress.postal_code || null,
        ]
      );
      customerId = newCustomer.rows[0].id;
    }

    const shipBlock = formatAddressBlock(effectiveShippingAddress);
    const billBlock = billingAddress
      ? formatAddressBlock(billingAddress)
      : shipBlock;

    const currency = business.currency || 'PKR';
    const paymentStatus =
      paymentMethod === 'cod'
        ? 'pending'
        : paymentMethod === 'crypto'
          ? 'awaiting_payment'
          : 'awaiting_payment';

    const orderMeta = {
      source: 'storefront',
      customer_id: customerId,
      payment_method: paymentMethod || 'cod',
      digital_only: digitalOnlyOrder,
      clientDeclaredShipping: shipping,
      serverShipping: shippingAmount,
      discounts: discountMeta,
    };

    const orderResult = await client.query(
      `INSERT INTO storefront_orders (
        business_id, order_number,
        customer_email, customer_phone, customer_name,
        shipping_address, billing_address,
        subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
        currency, status, payment_status, fulfillment_status, notes, metadata,
        created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7,
        $8::numeric, $9::numeric, $10::numeric, $11::numeric, $12::numeric,
        $13, $14, $15, $16, $17, $18::jsonb, NOW(), NOW()
      )
      RETURNING id, order_number, total_amount, status, payment_status`,
      [
        business.id,
        orderNumber,
        customer.email,
        customer.phone,
        customerName,
        shipBlock,
        billBlock,
        subtotalNet,
        taxTotal,
        shippingAmount,
        discountAmount,
        grandTotal,
        currency,
        'pending',
        paymentStatus,
        digitalOnlyOrder ? 'digital_pending' : 'unfulfilled',
        notes || null,
        JSON.stringify(orderMeta),
      ]
    );

    const order = orderResult.rows[0];
    const orderId = order.id;

    if (promoUsageRef) {
      await incrementStorefrontPromoUsage(client, promoUsageRef.source, promoUsageRef.id);
    }

    for (let i = 0; i < resolvedLines.length; i++) {
      const line = resolvedLines[i];
      const bodyItem = items[i];

      const metaPayload = JSON.stringify({
            variantId: line.variantId,
            variantName: line.variantName,
            sku: line.sku || bodyItem?.sku || null,
            taxPercent: line.taxPercent,
          });
      try {
        await client.query(
          `INSERT INTO storefront_order_items (
          order_id, product_id, product_name, product_sku, variant_id, quantity, unit_price, tax_amount, total_price, metadata
        ) VALUES ($1, $2::uuid, $3, $4, $5::uuid, $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10::jsonb)`,
          [
            orderId,
            line.productId,
            line.productName,
            line.sku || bodyItem?.sku || null,
            line.variantId || null,
            line.quantity,
            line.unitPrice,
            line.lineTax,
            line.lineTotal,
            metaPayload,
          ]
        );
      } catch (insErr) {
        if (insErr.code === '42703') {
          await client.query(
            `INSERT INTO storefront_order_items (
            order_id, product_id, product_name, quantity, unit_price, tax_amount, total_price, metadata
          ) VALUES ($1, $2::uuid, $3, $4::numeric, $5::numeric, $6::numeric, $7::numeric, $8::jsonb)`,
            [
              orderId,
              line.productId,
              line.productName,
              line.quantity,
              line.unitPrice,
              line.lineTax,
              line.lineTotal,
              metaPayload,
            ]
          );
        } else {
          throw insErr;
        }
      }

      if (line.isVariant && line.variantId) {
        await client.query(
          `UPDATE product_variants 
           SET stock = stock - $1::numeric, updated_at = NOW()
           WHERE id = $2::uuid AND business_id = $3::uuid`,
          [line.quantity, line.variantId, business.id]
        );
        // Audit trail for size/color variant sales (clothing/footwear norm) so they
        // appear in stock movement reports; best-effort, never blocks the order.
        await recordStorefrontVariantSaleMovementInTx(
          client,
          business.id,
          line.productId,
          line.variantId,
          line.quantity,
          { orderId, orderNumber }
        );
      } else {
        await decrementHeadlineAndLocationsInTx(
          client,
          business.id,
          line.productId,
          line.quantity
        );
        // Audit trail: record the sale in stock_movements + inventory_ledger so
        // storefront sales appear in valuation/reports (symmetric with cancel restock).
        await recordStorefrontSaleMovementInTx(
          client,
          business.id,
          line.productId,
          line.quantity,
          { orderId, orderNumber }
        );
      }
    }

    try {
      await MembershipService.enrollFromLineItems(
        {
          businessId: business.id,
          customerId,
          source: MEMBERSHIP_SOURCE.STOREFRONT,
          paymentConfirmed: paymentStatus !== 'pending' && paymentStatus !== 'awaiting_payment',
          initialStorefrontOrderId: orderId,
          currency,
          lines: resolvedLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
        client
      );
    } catch (membershipErr) {
      console.warn('[Create Order] membership enrollment skipped:', membershipErr?.message || membershipErr);
    }

    await client.query('COMMIT');

    // Create notification for business (new online order alert)
    try {
      await notifyStorefrontOrder({
        businessId: business.id,
        business,
        orderId,
        orderNumber,
        customerName,
        customerEmail: customer.email,
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

    await checkLowStockAfterSale(client, business, resolvedLines);

    const emailItems = resolvedLines.map((line, idx) => ({
      name: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      variantName: line.variantName,
      ...items[idx],
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
        shippingMethod: body.shippingMethod,
        paymentMethod,
      },
      business: {
        name: business.business_name,
        email: business.email,
      },
    }).catch(console.error);

    // Notify tenant owners/admins by email (scoped to this business_id only)
    void (async () => {
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
          currency: business.currency || undefined,
          customerName,
          customerEmail: customer.email,
        };

        await Promise.all(
          merchantEmails.map((to) =>
            sendNewOrderMerchantEmail({ to, order: orderPayload, business: merchantBusiness })
          )
        );
      } catch (merchantEmailErr) {
        console.error('[Create Order] merchant email failed:', merchantEmailErr);
      }
    })();

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        orderNumber: order.order_number,
        total: parseFloat(String(order.total_amount)),
        status: order.status,
        paymentStatus: order.payment_status,
        subtotal: subtotalNet,
        tax: taxTotal,
        shipping: shippingAmount,
        discount: discountAmount,
        currency,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Create Order] Error:', error);

    if (isStorefrontOrderNumberConflict(error)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Checkout is busy right now. Please wait a moment and try again — your cart is still saved.',
          retryable: true,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create order',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/storefront/[businessDomain]/orders?email=&orderNumber=
 * Public buyer order tracking, email required; optional order number filter.
 */
export async function GET(request, { params }) {
  const { businessDomain } = await params;
  const business = await resolveStorefrontBusiness(businessDomain);

  if (!business) {
    return NextResponse.json(
      { success: false, error: 'Business not found' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim() || '';
  const orderNumber = searchParams.get('orderNumber')?.trim() || '';

  const result = await lookupPublicStorefrontOrders(business.id, {
    customerEmail: email,
    orderNumber: orderNumber || undefined,
    limit: 50,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status || 400 }
    );
  }

  // lookupPublicStorefrontOrders already enriches each order with line items,
  // including product image_url and tax_amount used by the tracking page + receipt.
  return NextResponse.json({ success: true, orders: result.orders });
}
