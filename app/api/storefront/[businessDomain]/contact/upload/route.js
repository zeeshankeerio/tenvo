import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * POST /api/storefront/[businessDomain]/contact/upload
 * Public prescription image upload (scoped to resolved tenant).
 */
export async function POST(request, { params }) {
  const { businessDomain } = await params;
  const bizResult = await fetchBusinessByDomain(businessDomain);

  if (!bizResult.success) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Please upload a JPEG, PNG, or WebP image' }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 3MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const supabase = getSupabaseClient();
  const tenantSegment = sanitizeSegment(bizResult.business.id);

  if (!supabase) {
    if (buffer.length > 400 * 1024) {
      return NextResponse.json(
        { error: 'Image storage is not configured. Try a smaller photo or contact the pharmacy directly.' },
        { status: 503 }
      );
    }
    const mime = file.type || 'image/webp';
    return NextResponse.json({
      success: true,
      url: `data:${mime};base64,${buffer.toString('base64')}`,
      storage: 'inline',
    });
  }

  const uniqueName = `${Date.now()}-${String(file.name || 'prescription').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `prescriptions/${tenantSegment}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage.from('products').upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.error('[storefront/contact/upload]', uploadError);
    return NextResponse.json({ error: 'Could not upload prescription image' }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath);

  return NextResponse.json({
    success: true,
    url: publicUrlData.publicUrl,
    storage: 'supabase',
  });
}
