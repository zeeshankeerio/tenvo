import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateOrderNumber, isStorefrontOrderNumberConflict } from '@/lib/utils/order';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import { lookupPublicStorefrontOrders } from '@/lib/storefront/publicOrderLookup';
import { scheduleStorefrontOrderPostCommit } from '@/lib/storefront/storefrontOrderPostCommit';
import { invalidateStorefrontCatalog } from '@/lib/storefront/invalidateStorefrontCatalog';
import {
  parseStockNumber,
  querySellableLocationQty,
  resolveSellableStockQty,
} from '@/lib/storefront/storefrontOrderStock';
import { decrementStorefrontOrderLineStock } from '@/lib/storefront/storefrontOrderInventory';
import {
  incrementStorefrontPromoUsage,
  resolveStorefrontOrderDiscount,
} from '@/lib/storefront/storefrontOrderDiscount';
import { MembershipService } from '@/lib/services/MembershipService';
import { MEMBERSHIP_SOURCE } from '@/lib/memberships/membershipConstants';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import { queryStorefrontVariantRequirement } from '@/lib/storefront/storefrontProductVariants';
import {
  classifyOrderLineFulfillment,
  digitalShippingAddress,
  isDigitalPlaceholderAddress,
} from '@/lib/storefront/digitalProducts';
import {
  buildRestaurantOrderNotes,
  isRestaurantPickupOrder,
  buildRestaurantPickupAddress,
  restaurantOrderModeLabel,
  normalizeRestaurantOrderMode,
  resolveRestaurantShippingCost,
  restaurantOrderModeToShipping,
} from '@/lib/storefront/restaurantMenu';
import { RESTAURANT_ORDER_MODES, isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import {
  coerceStorefrontPaymentMethod,
  loadStorefrontPaymentContext,
  resolveEligibleStorefrontPaymentMethods,
} from '@/lib/storefront/storefrontPaymentEligibility';
import { resolveStorefrontOrderShippingAmount } from '@/lib/storefront/storefrontShipping';
import { resolveCheckoutCartItemRefs } from '@/lib/storefront/validateCheckoutCart';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** Map known checkout validation failures to client-friendly HTTP statuses. */
function mapCheckoutClientError(error) {
  const msg = String(error?.message || '');
  if (!msg) return null;
  if (
    msg.includes('Insufficient stock') ||
    msg.includes('not found') ||
    msg.includes('Variant not found') ||
    msg.includes('preview-only') ||
    msg.includes('no longer available')
  ) {
    return { status: 409, error: msg, retryable: false };
  }
  if (msg.includes('mixes digital and physical')) {
    return { status: 400, error: msg, retryable: false };
  }
  if (
    msg.includes('select size') ||
    msg.includes('Invalid quantity') ||
    msg.includes('productId')
  ) {
    return { status: 400, error: msg };
  }
  return null;
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
    restaurantOrderMode,
    tableNumber,
    orderNotes,
    shippingMethod,
  } = body;

  if (!customer?.email || !customer?.firstName || !customer?.phone) {
    return NextResponse.json(
      { success: false, error: 'Customer information is required' },
      { status: 400 }
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Order must contain at least one item' },
      { status: 400 }
    );
  }

  let effectivePaymentMethod = paymentMethod || 'cod';
  let eligibleMethods = [];
  let checkoutItems;
  let digitalOnlyOrder = false;

  const preflightClient = await pool.connect();
  try {
    try {
      const paymentCtx = await loadStorefrontPaymentContext(preflightClient, business.id);
      eligibleMethods = resolveEligibleStorefrontPaymentMethods(paymentCtx);
      if (eligibleMethods.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No payment methods are available for this store. Please contact the store owner.',
          },
          { status: 400 }
        );
      }
      effectivePaymentMethod = coerceStorefrontPaymentMethod(paymentMethod, eligibleMethods);
      if (String(paymentMethod || '').toLowerCase() !== effectivePaymentMethod) {
        console.warn(
          `[Create Order] Payment method "${paymentMethod}" unavailable for ${business.domain}, using "${effectivePaymentMethod}"`
        );
      }
    } catch (paymentGateErr) {
      console.warn('[Create Order] payment method gate skipped:', paymentGateErr?.message);
      effectivePaymentMethod = 'cod';
    }

    const { resolvedItems, issues } = await resolveCheckoutCartItemRefs(
      preflightClient,
      business.id,
      items
    );
    if (issues.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: issues[0].message,
          issues,
        },
        { status: 409 }
      );
    }
    checkoutItems = resolvedItems;

    if (checkoutItems?.length) {
      const lineRefs = checkoutItems.map((i) => ({ productId: i.productId }));
      if (lineRefs.length === checkoutItems.length) {
        try {
          const mix = await classifyOrderLineFulfillment(preflightClient, business.id, lineRefs);
          if (mix.mixed) {
            return NextResponse.json(
              {
                success: false,
                error:
                  'Your cart mixes digital and physical products. Please checkout digital and physical items separately.',
              },
              { status: 400 }
            );
          }
          digitalOnlyOrder = mix.allDigital;
        } catch (digitalErr) {
          console.warn('[Create Order] digital pre-check skipped:', digitalErr?.message);
        }
      }
    }
  } finally {
    preflightClient.release();
  }

  const paymentMethodCoerced =
    String(paymentMethod || '').trim().toLowerCase() !== String(effectivePaymentMethod || '').toLowerCase();

  const isRestaurant = isRestaurantElevatedStore(business.category);
  const normalizedRestaurantMode =
    isRestaurant && restaurantOrderMode
      ? normalizeRestaurantOrderMode(restaurantOrderMode)
      : null;
  const restaurantPickup = isRestaurant && isRestaurantPickupOrder(normalizedRestaurantMode);

  for (const item of checkoutItems) {
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

  if (
    !digitalOnlyOrder &&
    !restaurantPickup &&
    isDigitalPlaceholderAddress(shippingAddress)
  ) {
    return NextResponse.json(
      { success: false, error: 'A valid shipping address is required for physical orders.' },
      { status: 400 }
    );
  }

  if (!digitalOnlyOrder && !restaurantPickup && (!shippingAddress?.address || !shippingAddress?.city)) {
    return NextResponse.json(
      { success: false, error: 'Shipping address is required' },
      { status: 400 }
    );
  }

  const resolvedNotes =
    notes ||
    (isRestaurant
      ? buildRestaurantOrderNotes({
          orderMode: normalizedRestaurantMode,
          tableNumber,
          orderNotes,
          orderModeLabel: normalizedRestaurantMode
            ? restaurantOrderModeLabel(normalizedRestaurantMode, RESTAURANT_ORDER_MODES)
            : undefined,
        })
      : '');

  const effectiveShippingAddress = digitalOnlyOrder
    ? digitalShippingAddress(customer)
    : restaurantPickup
      ? buildRestaurantPickupAddress(business, normalizedRestaurantMode, tableNumber)
      : shippingAddress;

  const shippingRaw = Number(shipping);
  const clientDeclaredShipping =
    Number.isFinite(shippingRaw) && shippingRaw >= 0 ? roundMoney(Math.min(shippingRaw, 9_999_999)) : 0;
  let shippingAmount = 0;

  const MAX_CHECKOUT_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_CHECKOUT_ATTEMPTS; attempt++) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // GAP-8: Re-resolve cart item refs on retry attempts in case product state/refs changed
      if (attempt > 1) {
        const { resolvedItems, issues } = await resolveCheckoutCartItemRefs(
          client,
          business.id,
          items
        );
        if (issues.length > 0) {
          throw new Error(issues[0].message);
        }
        checkoutItems = resolvedItems;
      }

    const resolvedLines = [];

    for (const item of checkoutItems) {
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

    shippingAmount = resolveStorefrontOrderShippingAmount({
      digitalOnlyOrder,
      isRestaurant,
      restaurantPickup,
      normalizedRestaurantMode,
      subtotal: subtotalNet,
      shippingMethod: shippingMethod || 'standard',
      settings: business.settings || {},
      resolveRestaurantShippingCost,
      restaurantOrderModeToShipping,
    });

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
          effectiveShippingAddress.address,
          effectiveShippingAddress.city,
          effectiveShippingAddress.country || business.country || 'PK',
          effectiveShippingAddress.postalCode || effectiveShippingAddress.postal_code || null,
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
      effectivePaymentMethod === 'cod'
        ? 'pending'
        : effectivePaymentMethod === 'crypto' || effectivePaymentMethod === 'stripe'
          ? 'awaiting_payment'
          : 'awaiting_payment';

    const orderMeta = {
      source: 'storefront',
      customer_id: customerId,
      payment_method: effectivePaymentMethod,
      payment_method_requested: paymentMethod || null,
      payment_method_coerced: paymentMethodCoerced,
      digital_only: digitalOnlyOrder,
      clientDeclaredShipping,
      serverShipping: shippingAmount,
      discounts: discountMeta,
      ...(isRestaurant && normalizedRestaurantMode
        ? {
            restaurant_order_mode: normalizedRestaurantMode,
            restaurant_order_mode_label: restaurantOrderModeLabel(
              normalizedRestaurantMode,
              RESTAURANT_ORDER_MODES
            ),
            table_number: tableNumber?.trim() || null,
            customer_order_notes: orderNotes?.trim() || null,
            shipping_method: shippingMethod || null,
          }
        : {}),
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
        resolvedNotes || null,
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
      const bodyItem = checkoutItems[i];

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

      await decrementStorefrontOrderLineStock(
        client,
        business.id,
        {
          productId: line.productId,
          quantity: line.quantity,
          isVariant: line.isVariant,
          variantId: line.variantId,
        },
        { orderId, orderNumber }
      );
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

    invalidateStorefrontCatalog(business.id);

    await client.query('COMMIT');

    scheduleStorefrontOrderPostCommit({
      business,
      orderId,
      orderNumber,
      customerName,
      customerEmail: customer.email,
      grandTotal,
      resolvedLines,
      checkoutItems,
      customer,
      effectivePaymentMethod,
      shippingMethod: body.shippingMethod,
      subtotalNet,
      shippingAmount,
      taxTotal,
      currency,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        orderNumber: order.order_number,
        total: parseFloat(String(order.total_amount)),
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: effectivePaymentMethod,
        paymentMethodCoerced: paymentMethodCoerced,
        subtotal: subtotalNet,
        tax: taxTotal,
        shipping: shippingAmount,
        discount: discountAmount,
        currency,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback errors */
    }
    console.error('[Create Order] Error:', error);

    if (isStorefrontOrderNumberConflict(error) && attempt < MAX_CHECKOUT_ATTEMPTS) {
      console.warn(
        `[Create Order] order number conflict (attempt ${attempt}/${MAX_CHECKOUT_ATTEMPTS}), retrying…`
      );
      await new Promise((r) => setTimeout(r, 40 * attempt));
      continue;
    }

    if (isStorefrontOrderNumberConflict(error)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Checkout is busy right now. Please wait a moment and try again — your cart is still saved.',
          retryable: false,
        },
        { status: 409 }
      );
    }

    const clientError = mapCheckoutClientError(error);
    if (clientError) {
      return NextResponse.json(
        { success: false, error: clientError.error, retryable: clientError.retryable ?? false },
        { status: clientError.status }
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

  return NextResponse.json(
    {
      success: false,
      error:
        'Checkout is busy right now. Please wait a moment and try again — your cart is still saved.',
      retryable: false,
    },
    { status: 409 }
  );
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
