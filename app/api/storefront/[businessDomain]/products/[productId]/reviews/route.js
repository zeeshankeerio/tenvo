import { NextResponse } from 'next/server';
import { resolveStorefrontBusiness } from '@/lib/tenancy/resolveStorefrontBusiness';
import pool from '@/lib/db';

/**
 * GET /api/storefront/[businessDomain]/products/[productId]/reviews
 * Fetch product reviews with pagination
 */
export async function GET(request, { params }) {
  try {
    const { businessDomain, productId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    // Resolve business from domain
    const business = await resolveStorefrontBusiness(businessDomain);

    if (!business?.id) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const client = await pool.connect();

    try {
      // Check if product exists and belongs to this business
      const productCheck = await client.query(
        `SELECT p.id FROM products p 
         WHERE p.id = $1::uuid 
           AND p.business_id = $2::uuid 
           AND COALESCE(p.is_deleted, false) = false`,
        [productId, business.id]
      );

      if (productCheck.rows.length === 0) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }

      // Fetch reviews with pagination
      const reviewsResult = await client.query(
        `SELECT 
          id,
          product_id,
          reviewer_name,
          reviewer_email,
          rating,
          title,
          body,
          created_at,
          updated_at
         FROM product_reviews
         WHERE product_id = $1::uuid 
           AND business_id = $2::uuid
           AND is_approved = true
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [productId, business.id, limit, offset]
      );

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total
         FROM product_reviews
         WHERE product_id = $1::uuid 
           AND business_id = $2::uuid
           AND is_approved = true`,
        [productId, business.id]
      );

      const total = parseInt(countResult.rows[0]?.total || '0');
      const hasMore = offset + reviewsResult.rows.length < total;

      return NextResponse.json({
        reviews: reviewsResult.rows.map(row => ({
          id: row.id,
          reviewerName: row.reviewer_name,
          reviewerEmail: row.reviewer_email,
          rating: row.rating,
          title: row.title,
          body: row.body,
          isVerified: false,
          createdAt: row.created_at?.toISOString(),
          updatedAt: row.updated_at?.toISOString(),
        })),
        total,
        page,
        limit,
        hasMore,
      });
    } catch (dbError) {
      // Handle case where product_reviews table doesn't exist yet
      if (dbError.code === '42P01') {
        return NextResponse.json({
          reviews: [],
          total: 0,
          page: 1,
          limit: 10,
          hasMore: false,
        });
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[reviews route] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storefront/[businessDomain]/products/[productId]/reviews
 * Submit a new product review
 */
export async function POST(request, { params }) {
  try {
    const { businessDomain, productId } = await params;
    const business = await resolveStorefrontBusiness(businessDomain);

    if (!business?.id) {
      return NextResponse.json({ message: 'Store not found' }, { status: 404 });
    }

    const body = await request.json();
    const { reviewerName, reviewerEmail, rating, title, body: reviewBody } = body;

    // Validate required fields
    if (!reviewerName || !reviewerEmail || !rating || !reviewBody) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if product exists
      const productCheck = await client.query(
        `SELECT p.id FROM products p 
         WHERE p.id = $1::uuid 
           AND p.business_id = $2::uuid 
           AND COALESCE(p.is_deleted, false) = false`,
        [productId, business.id]
      );

      if (productCheck.rows.length === 0) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }

      // Insert review (pending approval)
      const insertResult = await client.query(
        `INSERT INTO product_reviews (
          product_id,
          business_id,
          reviewer_name,
          reviewer_email,
          rating,
          title,
          body,
          is_approved
         ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, false)
         RETURNING id, created_at`,
        [productId, business.id, reviewerName, reviewerEmail, rating, title || '', reviewBody]
      );

      return NextResponse.json({
        success: true,
        message: 'Review submitted successfully. It will be visible after approval.',
        review: {
          id: insertResult.rows[0].id,
          createdAt: insertResult.rows[0].created_at?.toISOString(),
        },
      });
    } catch (dbError) {
      // Handle case where product_reviews table doesn't exist
      if (dbError.code === '42P01') {
        return NextResponse.json({
          success: false,
          message: 'Reviews feature is not yet configured for this store',
        }, { status: 503 });
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[reviews route POST] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
