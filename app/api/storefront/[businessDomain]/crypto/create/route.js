import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import pool from '@/lib/db';
import { createPayment, isNowPaymentsConfigured } from '@/lib/payments/nowpayments';
import { isStorefrontPaymentProviderReady } from '@/lib/storefront/storefrontPaymentEligibility';
import {
  buildStorefrontCryptoOrderId,
  registerStorefrontCryptoPayment,
} from '@/lib/storefront/cryptoOrderFulfillment';

export const dynamic = 'force-dynamic';

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://www.tenvo.store';
}

/**
 * POST /api/storefront/[businessDomain]/crypto/create
 * Body: { orderNumber, cryptoCurrency? }
 */
export async function POST(request, { params }) {
  try {
    if (!isNowPaymentsConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Crypto payments not configured', code: 'NOWPAYMENTS_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const { businessDomain } = await params;
    const business = await resolveStorefrontBusiness(businessDomain);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const gateClient = await pool.connect();
    let cryptoEnabled = false;
    try {
      cryptoEnabled = await isStorefrontPaymentProviderReady(gateClient, business.id, 'crypto');
    } finally {
      gateClient.release();
    }
    if (!cryptoEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cryptocurrency payments are not enabled for this store. Please use Cash on Delivery.',
          code: 'CRYPTO_NOT_ENABLED',
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderNumber, cryptoCurrency = 'usdt' } = body;
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'orderNumber is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let order;
    try {
      const res = await client.query(
        `SELECT id, order_number, total_amount, currency, customer_email, customer_name,
                payment_status, metadata
         FROM storefront_orders
         WHERE business_id = $1::uuid AND order_number = $2
         LIMIT 1`,
        [business.id, orderNumber]
      );
      order = res.rows[0];
    } finally {
      client.release();
    }

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { success: false, error: 'Order is already paid', code: 'ALREADY_PAID' },
        { status: 409 }
      );
    }

    const meta =
      order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    if (meta.payment_method && meta.payment_method !== 'crypto') {
      return NextResponse.json(
        { success: false, error: 'Order was not created for crypto payment' },
        { status: 400 }
      );
    }

    const existingCrypto = meta.crypto?.payment_id;
    if (existingCrypto && meta.crypto?.status !== 'failed') {
      return NextResponse.json({
        success: true,
        reused: true,
        paymentId: meta.crypto.payment_id,
        payAddress: meta.crypto.pay_address,
        payAmount: meta.crypto.pay_amount,
        payCurrency: meta.crypto.pay_currency,
        orderId: buildStorefrontCryptoOrderId(business.id, order.order_number),
      });
    }

    const baseUrl = appBaseUrl();
    const total = parseFloat(String(order.total_amount || '0'));
    const fiatCurrency = String(order.currency || business.currency || 'USD').toLowerCase();
    const npOrderId = buildStorefrontCryptoOrderId(business.id, order.order_number);
    const ipnCallbackUrl =
      process.env.NOWPAYMENTS_IPN_CALLBACK_URL?.trim() || `${baseUrl}/api/webhooks/nowpayments`;

    const created = await createPayment({
      priceAmount: total,
      priceCurrency: fiatCurrency === 'pkr' ? 'pkr' : fiatCurrency === 'usd' ? 'usd' : 'usd',
      payCurrency: String(cryptoCurrency).toLowerCase(),
      orderId: npOrderId,
      orderDescription: `${business.business_name || 'Tenvo Store'} order ${order.order_number}`,
      customerEmail: order.customer_email || undefined,
      customerName: order.customer_name || undefined,
      callbackUrl: ipnCallbackUrl,
      successUrl: `${baseUrl}/store/${businessDomain}/checkout?crypto=success&order=${encodeURIComponent(order.order_number)}`,
      cancelUrl: `${baseUrl}/store/${businessDomain}/checkout?crypto=cancelled&order=${encodeURIComponent(order.order_number)}`,
    });

    if (created?.skipped) {
      return NextResponse.json(
        { success: false, error: 'Crypto payments not configured' },
        { status: 503 }
      );
    }

    await registerStorefrontCryptoPayment({
      businessId: business.id,
      orderNumber: order.order_number,
      paymentId: created.paymentId,
      payCurrency: created.payCurrency,
      payAmount: created.payAmount,
      payAddress: created.payAddress,
    });

    return NextResponse.json({
      success: true,
      paymentId: created.paymentId,
      paymentStatus: created.paymentStatus,
      payAddress: created.payAddress,
      payAmount: created.payAmount,
      payCurrency: created.payCurrency,
      priceAmount: created.priceAmount,
      priceCurrency: created.priceCurrency,
      expirationEstimateDate: created.expirationEstimateDate,
      orderId: npOrderId,
    });
  } catch (error) {
    console.error('[Storefront crypto create]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create crypto payment' },
      { status: 500 }
    );
  }
}
