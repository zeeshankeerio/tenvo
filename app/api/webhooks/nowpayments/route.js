import { NextResponse } from 'next/server';
import { verifyIPN, handleIPN } from '@/lib/payments/nowpayments';
import { applyCryptoSubscriptionFromIPN } from '@/lib/billing/cryptoSubscription';

function resolveIpnSecret() {
  const raw =
    process.env.NOWPAYMENTS_IPN_SECRET?.trim() ||
    process.env.NOWPAYMENTS_SECRET?.trim() ||
    process.env.NOWPAYMENTS_SECRATE?.trim() ||
    process.env.NOWPAYMENTS_IPN_SECRECT?.trim();
  return raw || null;
}

/**
 * POST /api/webhooks/nowpayments, NOWPayments IPN callback.
 */
export async function POST(request) {
  try {
    const ipnSecret = resolveIpnSecret();
    const isProduction = process.env.NODE_ENV === 'production';

    if (!ipnSecret) {
      console.error('[NOWPayments IPN] Not configured, set NOWPAYMENTS_IPN_SECRET');
      if (isProduction) {
        return NextResponse.json(
          { error: 'NOWPayments webhook not configured' },
          { status: 503 }
        );
      }
    }

    const raw = await request.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const signature =
      request.headers.get('x-nowpayments-sig') ||
      request.headers.get('X-NOWPAYMENTS-SIG') ||
      '';

    if (ipnSecret) {
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      if (!verifyIPN(payload, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const summary = await handleIPN(payload);
    const applied = await applyCryptoSubscriptionFromIPN({
      orderId: summary.orderId || payload.order_id,
      paymentId: summary.paymentId || payload.payment_id,
      status: summary.status || payload.payment_status,
      amount: summary.amount ?? payload.actually_paid,
    });

    console.log('[NOWPayments IPN]', { summary, applied });

    return NextResponse.json({ received: true, applied });
  } catch (error) {
    console.error('[NOWPayments IPN] Error:', error);
    return NextResponse.json({ error: 'IPN handler failed' }, { status: 500 });
  }
}
