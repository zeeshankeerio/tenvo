import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import pool from '@/lib/db';
import {
  buildPublicBuyerChatGreeting,
  buildPublicBuyerChatReply,
} from '@/lib/storefront/publicBuyerChat';

function parseSettingsJson(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return {};
}

function clip(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

async function loadPublicStoreProfile(businessId) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        b.business_name, b.email, b.phone, b.description, b.website, b.category,
        b.address, b.city, b.country, b.postal_code,
        bs.settings AS store_settings
       FROM businesses b
       LEFT JOIN business_settings bs ON bs.business_id = b.id
       WHERE b.id = $1::uuid AND COALESCE(b.is_active, true) = true`,
      [businessId]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      business: {
        business_name: row.business_name,
        email: row.email,
        phone: row.phone,
        description: row.description,
        website: row.website,
        category: row.category,
        address: row.address,
        city: row.city,
        country: row.country,
        postal_code: row.postal_code,
      },
      settings: parseSettingsJson(row.store_settings),
    };
  } finally {
    client.release();
  }
}

/**
 * POST /api/storefront/[businessDomain]/chat
 * Public buyer assistant, domain-scoped, no cross-tenant data access.
 */
export async function POST(request, { params }) {
  const { businessDomain } = await params;
  const resolved = await resolveStorefrontBusiness(businessDomain);

  if (!resolved) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (body?.businessId != null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const message = clip(body?.message, 500);
  const wantsGreeting = body?.greeting === true;

  const profile = await loadPublicStoreProfile(resolved.id);
  if (!profile) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const { business, settings } = profile;
  const storeName = business.business_name || 'Store';

  if (wantsGreeting && !message) {
    return NextResponse.json({
      success: true,
      reply: buildPublicBuyerChatGreeting(storeName),
      storeName,
    });
  }

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const reply = buildPublicBuyerChatReply({
    business,
    settings,
    businessDomain: resolved.domain || businessDomain,
    message,
  });

  return NextResponse.json({
    success: true,
    reply,
    storeName,
  });
}
