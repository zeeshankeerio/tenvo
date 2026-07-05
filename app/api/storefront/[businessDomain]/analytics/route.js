import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { recordStorefrontVisit } from '@/lib/storefront/storefrontAnalytics';

/**
 * POST /api/storefront/[businessDomain]/analytics
 * Records one storefront visitor for the current UTC day (session dedupe is client-side).
 */
export async function POST(_request, { params }) {
  const { businessDomain } = await params;

  const bizResult = await fetchBusinessByDomain(businessDomain);
  if (!bizResult.success) {
    return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
  }

  const client = await pool.connect();
  try {
    await recordStorefrontVisit(client, bizResult.business.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('[storefront/analytics] visit record skipped:', error?.message || error);
    return NextResponse.json({ success: true, skipped: true });
  } finally {
    client.release();
  }
}
