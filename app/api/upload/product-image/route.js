import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * POST /api/upload/product-image
 *
 * Accepts multipart/form-data with a single `file` field.
 * Converts the image to WebP (via browser Canvas API on client side,
 * here we accept and return it as-is as a data URL for self-hosted use).
 *
 * Returns: { success: true, url: "data:image/webp;base64,..." }
 *
 * Optimal sizes for storefront:
 *   - Max 800×800px (product cards are 4:5 ratio)
 *   - Max 300KB after conversion
 *   - Format: WebP for best compression/quality ratio
 */
export async function POST(request) {
  try {
    // Auth check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported format. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    // Validate size (max 5MB raw upload)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum upload size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert to buffer → base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      originalName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[upload/product-image] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

/**
 * GET /api/upload/product-image?q=product+name&category=retail
 *
 * Auto-fetch a relevant product image from Unsplash by search query.
 * Returns a direct Unsplash CDN URL (no API key needed for source.unsplash.com).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const category = searchParams.get('category')?.trim() || '';

    if (!q) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    // Build a clean search term
    const terms = [q, category].filter(Boolean).join(' ');
    const encoded = encodeURIComponent(terms);

    // Unsplash Source API — no auth needed, returns redirect to a CDN image
    // We use a fixed 800×800 size, optimized for product cards
    const unsplashUrl = `https://source.unsplash.com/800x800/?${encoded}`;

    // Resolve the redirect to get the final stable CDN URL
    const res = await fetch(unsplashUrl, { method: 'HEAD', redirect: 'follow' });
    const finalUrl = res.url;

    if (!finalUrl || finalUrl.includes('unsplash.com/photo/') === false) {
      // Fallback: try with just product name
      const fallbackUrl = `https://source.unsplash.com/800x800/?${encodeURIComponent(q)}`;
      return NextResponse.json({ success: true, url: fallbackUrl, source: 'unsplash' });
    }

    return NextResponse.json({ success: true, url: finalUrl, source: 'unsplash' });
  } catch (error) {
    console.error('[upload/product-image GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
