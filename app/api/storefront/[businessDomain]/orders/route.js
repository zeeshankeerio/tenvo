import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateOrderNumber } from '@/lib/utils/order';
import { sendOrderConfirmationEmail } from '@/lib/email/resend';
import { resolveBusinessFromStorefrontDomain } from '@/lib/tenancy/businessAccess';

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
  const { businessDomain } = params;
  const business = await resolveBusinessFromStorefrontDomain(businessDomain);

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
  } = body;

  if (!customer?.email || !customer?.firstName || !customer?.phone) {
    return NextResponse.json(
      { success: false, error: 'Customer information is required' },
      { status: 400 }
    );
  }

  if (!shippingAddress?.address || !shippingAddress?.city) {
    return NextResponse.json(
      { success: false, error: 'Shipping address is required' },
      { status: 400 }
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Order must contain at least one item' },
      { status: 400 }
    );
  }

  const shippingRaw = Number(shipping);
  const shippingAmount =
    Number.isFinite(shippingRaw) && shippingRaw >= 0
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

      if (item.variantId) {
        await client.query(
          `SELECT 1 FROM product_variants pv
           WHERE pv.id = $1::uuid AND pv.business_id = $2::uuid AND pv.product_id = $3::uuid
           FOR UPDATE`,
          [item.variantId, business.id, item.productId]
        );

        const vr = await client.query(
          `SELECT pv.id, pv.product_id, pv.variant_name, pv.variant_sku, pv.price::text, pv.stock::text,
                  p.name as product_name, p.tax_percent::text
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id
           WHERE pv.id = $1::uuid AND pv.business_id = $2::uuid AND p.business_id = $2::uuid
             AND (p.is_deleted = false)`,
          [item.variantId, business.id]
        );

        if (vr.rows.length === 0) {
          throw new Error(`Variant not found for product ${item.productId}`);
        }

        const row = vr.rows[0];
        const unitPrice = roundMoney(parseFloat(row.price || '0'));
        const taxPercent = roundMoney(parseFloat(row.tax_percent || '0'));
        const stock = row.stock != null ? parseFloat(row.stock) : null;

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
        const stock = row.stock != null ? parseFloat(row.stock) : null;

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

    const discountAmount = 0;
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
         WHERE id = $3::uuid`,
        [customerName, customer.phone, customerId]
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

    const shipBlock = formatAddressBlock(shippingAddress);
    const billBlock = billingAddress
      ? formatAddressBlock(billingAddress)
      : shipBlock;

    const currency = business.currency || 'PKR';
    const paymentStatus =
      paymentMethod === 'cod' ? 'pending' : 'awaiting_payment';

    const orderMeta = {
      source: 'storefront',
      clientDeclaredShipping: shipping,
      serverShipping: shippingAmount,
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
        'unfulfilled',
        notes || null,
        JSON.stringify(orderMeta),
      ]
    );

    const order = orderResult.rows[0];
    const orderId = order.id;

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
      } else {
        const qtyInt = Math.min(2147483647, Math.floor(line.quantity));
        await client.query(
          `UPDATE products 
           SET stock = stock - $1::numeric, 
               sales_count = COALESCE(sales_count, 0) + $2::int, 
               updated_at = NOW()
           WHERE id = $3::uuid AND business_id = $4::uuid`,
          [line.quantity, qtyInt, line.productId, business.id]
        );
      }
    }

    await client.query('COMMIT');

    void sendOrderConfirmationEmail({
      to: customer.email,
      order: {
        orderNumber,
        items: resolvedLines.map((line, idx) => ({
          name: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          variantName: line.variantName,
          ...items[idx],
        })),
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

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        orderNumber: order.order_number,
        total: parseFloat(String(order.total_amount)),
        status: order.status,
        paymentStatus: order.payment_status,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Create Order] Error:', error);

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
 * GET /api/storefront/[businessDomain]/orders
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 }
  );
}
