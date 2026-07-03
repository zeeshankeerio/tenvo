import { NextResponse } from 'next/server';
import { MembershipRenewalService } from '@/lib/services/MembershipRenewalService';
import { MembershipService } from '@/lib/services/MembershipService';

/**
 * POST /api/internal/memberships/process-renewals
 * Cron endpoint — generates renewal invoices and expires lapsed memberships.
 * Requires CRON_SECRET header (same pattern as campaigns dispatch).
 */
export async function POST(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET not configured' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== cronSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [renewals, expired, overduePaused] = await Promise.all([
      MembershipRenewalService.processDueRenewals(),
      MembershipService.expireLapsedMemberships(),
      MembershipService.processOverdueRenewalFailures(),
    ]);
    return NextResponse.json({ success: true, renewals, expired, overduePaused });
  } catch (error) {
    console.error('[memberships/process-renewals]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Membership maintenance failed' },
      { status: 500 }
    );
  }
}
