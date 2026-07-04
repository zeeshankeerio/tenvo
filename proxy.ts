import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveCanonicalHostRedirect } from '@/lib/auth/authOrigins';

/**
 * Network proxy (Next.js 16+): security headers and lightweight request metadata.
 * Tenant/business resolution stays in Node route handlers (Prisma/pg).
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host');

  const canonicalHost = resolveCanonicalHostRedirect(host ?? '');
  if (canonicalHost) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  const res = NextResponse.next();

  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  if (host) {
    res.headers.set('x-tenvo-forwarded-host', host);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
