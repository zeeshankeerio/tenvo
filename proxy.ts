import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveCanonicalHostRedirect } from '@/lib/auth/authOrigins';
import { lookupCustomDomainFromCache } from '@/lib/cache/customDomainCache';

/**
 * Network proxy (Next.js 16+): security headers, custom domain routing, and lightweight request metadata.
 * Tenant/business resolution stays in Node route handlers (Prisma/pg).
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;

  const canonicalHost = resolveCanonicalHostRedirect(host ?? '');
  if (canonicalHost) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  // Custom domain detection (skip platform routes)
  const cleanHost = host?.replace(/:\d+$/, '')?.toLowerCase() || '';
  const isPlatformDomain =
    cleanHost.includes('tenvo.store') ||
    cleanHost.includes('tenvo.app') ||
    cleanHost.includes('localhost') ||
    cleanHost === '';

  // Skip internal routes
  const skipRoutes =
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/business') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/multi-business') ||
    pathname.startsWith('/accept-invitation') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/solutions') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/pricing');

  if (!isPlatformDomain && !skipRoutes) {
    try {
      // Check if this is a known custom domain
      const businessDomain = await lookupCustomDomainFromCache(cleanHost);

      if (businessDomain) {
        // Rewrite to /store/[businessDomain] route
        const url = request.nextUrl.clone();
        url.pathname = `/store/${businessDomain}${pathname === '/' ? '' : pathname}`;

        const response = NextResponse.rewrite(url);
        response.headers.set('x-tenvo-custom-domain', cleanHost);
        response.headers.set('x-tenvo-business-domain', businessDomain);

        // Add security headers
        response.headers.set('X-Frame-Options', 'SAMEORIGIN');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), interest-cohort=()'
        );

        return response;
      }

      // Unknown custom domain → redirect to main site
      return NextResponse.redirect(new URL('https://www.tenvo.store/404', request.url));
    } catch (error) {
      console.error('[proxy] Custom domain lookup error:', error);
      // On error, continue with normal flow
    }
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
