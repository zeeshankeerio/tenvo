'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { resolveFashionPromoBannerImage } from '@/lib/storefront/fashionPromoBanners';

/**
 * Split promo banners — Ready to wear / Unstitched (or vertical variants).
 */
export function FashionPromoBannersSection({ banners = [], businessDomain, businessCategory, productsUrl }) {
  if (!banners.length) return null;

  return (
    <section className="bg-stone-100/60 py-8 sm:py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {banners.map((banner, bannerIndex) => {
            const isDark = banner.tone === 'dark' || banner.tone === 'walnut';
            const imageSrc = resolveFashionPromoBannerImage(banner, businessCategory, bannerIndex);
            const fallbackSrc = resolveFashionPromoBannerImage(
              { ...banner, id: `${banner.id}-alt` },
              businessCategory,
              bannerIndex + 1
            );

            return (
              <Link
                key={banner.id}
                href={`${productsUrl}${banner.href || ''}`}
                className={cn(
                  'group relative flex min-h-[168px] items-end overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:min-h-[204px] sm:p-6 lg:min-h-[220px]',
                  isDark ? 'border-stone-800/30 bg-stone-950' : 'border-stone-200/80 bg-white'
                )}
              >
                <SmartProductImage
                  src={imageSrc}
                  alt={banner.title || ''}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  fallbackSrc={fallbackSrc}
                />
                <div
                  className={cn(
                    'absolute inset-0',
                    isDark
                      ? 'bg-gradient-to-t from-stone-950/94 via-stone-900/50 to-stone-900/20'
                      : 'bg-gradient-to-t from-white/96 via-white/78 to-white/25'
                  )}
                  aria-hidden
                />
                <div className="relative z-10 w-full max-w-[88%] text-left">
                  <h3
                    className={cn(
                      'store-heading text-lg font-semibold sm:text-xl',
                      isDark ? 'store-heading--inverse !text-white' : '!text-stone-900'
                    )}
                  >
                    {banner.title}
                  </h3>
                  <p
                    className={cn(
                      'mt-1.5 max-w-sm text-sm leading-snug',
                      isDark ? 'text-white/90' : 'text-stone-600'
                    )}
                  >
                    {banner.subtitle}
                  </p>
                  <span
                    className={cn(
                      'mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-[gap] group-hover:gap-2.5',
                      isDark ? 'text-white' : 'text-stone-800'
                    )}
                  >
                    Shop now <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
