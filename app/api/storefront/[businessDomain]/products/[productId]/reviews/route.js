import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';

/**
 * GET  /api/storefront/[businessDomain]/products/[productId]/reviews
 * POST /api/storefront/[businessDomain]/products/[productId]/reviews
 */

async function assertProductInStore(businessId, productId, client) {
  const res = await client.query(
    `SELECT id FROM products
     WHERE id = $1::uuid AND business_id = $2::uuid
       AND is_active = true AND COALESCE(is_deleted, false) = false`,
    [productId, businessId]
  );
  return res.rows.length > 0;
}

export async function GET(request, { params }) {
  const { businessDomain, productId } = await params;
  const business = await resolveStorefrontBusiness(businessDomain);

  if (!business) {
    return NextResponse.json({ reviews: [], total: 0, page: 1, hasMore: false }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  const client = await pool.connect();
  try {
    const belongs = await assertProductInStore(business.id, productId, client);
    if (!belongs) {
      return NextResponse.json({ reviews: [], total: 0, page, hasMore: false }, { status: 404 });
    }

    let rows = [];
    let total = 0;
    try {
      const countRes = await client.query(
        `SELECT COUNT(*) FROM product_reviews pr
         JOIN products p ON p.id = pr.product_id
         WHERE pr.product_id = $1::uuid AND p.business_id = $2::uuid AND pr.is_approved = true`,
        [productId, business.id]
      );
      total = parseInt(countRes.rows[0].count);

      const res = await client.query(
        `SELECT pr.id, pr.reviewer_name, pr.rating, pr.title, pr.body, pr.helpful_count, pr.created_at
         FROM product_reviews pr
         JOIN products p ON p.id = pr.product_id
         WHERE pr.product_id = $1::uuid AND p.business_id = $2::uuid AND pr.is_approved = true
         ORDER BY pr.helpful_count DESC, pr.created_at DESC
         LIMIT $3 OFFSET $4`,
        [productId, business.id, limit, offset]
      );
      rows = res.rows;
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }

    return NextResponse.json({ reviews: rows, total, page, hasMore: total > page * limit });
  } catch (error) {
    console.error('[reviews GET]', error);
    return NextResponse.json({ reviews: [], total: 0 });
  } finally {
    client.release();
  }
}

export async function POST(request, { params }) {
  const { businessDomain, productId } = await params;
  const business = await resolveStorefrontBusiness(businessDomain);

  if (!business) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { reviewerName, reviewerEmail, rating, title, body: reviewBody } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }
  if (!reviewerName?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const belongs = await assertProductInStore(business.id, productId, client);
    if (!belongs) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    try {
      await client.query(
        `INSERT INTO product_reviews
           (product_id, business_id, reviewer_name, reviewer_email, rating, title, body, is_approved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
        [productId, business.id, reviewerName.trim(), reviewerEmail?.trim() || null, rating, title?.trim() || null, reviewBody?.trim() || null]
      );
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }

    return NextResponse.json({ success: true, message: 'Review submitted for moderation' });
  } catch (error) {
    console.error('[reviews POST]', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  } finally {
    client.release();
  }
}
