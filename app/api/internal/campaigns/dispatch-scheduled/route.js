import { NextResponse } from 'next/server';
import { MarketingAgentService } from '@/lib/services/MarketingAgentService';

export const dynamic = 'force-dynamic';

/**
 * Process due scheduled outreach campaigns (queue + email dispatch).
 * Protect with CRON_SECRET or INTERNAL_CRON_SECRET header.
 *
 * POST /api/internal/campaigns/dispatch-scheduled
 */
export async function POST(request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.INTERNAL_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = request.headers.get('x-cron-secret')?.trim() || bearer;

  if (headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = body?.limit;
    const result = await MarketingAgentService.processDueScheduledCampaigns({ limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[dispatch-scheduled]', error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
