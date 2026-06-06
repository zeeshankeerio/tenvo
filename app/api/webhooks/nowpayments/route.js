import { NextResponse } from 'next/server';
import { verifyIPN, handleIPN } from '@/lib/payments/nowpayments';

/**
 * POST /api/webhooks/nowpayments — NOWPayments IPN callback.
 * Configure the same URL in NOWPayments dashboard (or set NOWPAYMENTS_IPN_CALLBACK_URL on create).
 *
 * Extend this handler to update your database when you persist crypto invoices.
 */
export async function POST(request) {
  try {
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

    if (signature && !verifyIPN(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const summary = await handleIPN(payload);
    console.log('[NOWPayments IPN]', summary);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[NOWPayments IPN] Error:', error);
    return NextResponse.json({ error: 'IPN handler failed' }, { status: 500 });
  }
}
