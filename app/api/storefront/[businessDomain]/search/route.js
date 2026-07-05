import { NextResponse } from 'next/server';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { searchProducts } from '@/lib/actions/storefront/products';

/**
 * GET /api/storefront/[businessDomain]/search?q=query
 * Returns product suggestions for the search autocomplete.
 */
export async function GET(request, { params }) {
  try {
    const { businessDomain } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [] });
    }

    // Resolve business
    const bizResult = await fetchBusinessByDomain(businessDomain);
    if (!bizResult.success) {
      return NextResponse.json({ products: [] });
    }

    const result = await searchProducts(bizResult.business.id, query, 10);

    return NextResponse.json({
      products: result.success ? result.products : [],
    });
  } catch (error) {
    console.error('[search route]', error);
    return NextResponse.json({ products: [] });
  }
}
