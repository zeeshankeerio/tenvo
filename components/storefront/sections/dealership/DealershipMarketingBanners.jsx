'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { resolveDealershipBannerFallback } from '@/lib/storefront/storefrontImagePlaceholders';

/**
 * Secondary promo grid below the dealership hero (Tenvo Vehicles template).
 * @param {{ banners: Array<{ id?: string; title: string; subtitle?: string; image: string; href: string; badge?: string }>; accent?: string; overlap?: boolean; className?: string }} props
 */
export function DealershipMarketingBanners({ banners = [], accent = '#111827', overlap = false, className }) {
  if (!banners.length) return null;

  return (
    <section
      className={cn(
        overlap ? 'relative z-10 bg-transparent pb-2 pt-0' : 'border-b border-neutral-100 bg-neutral-50 py-8 sm:py-10',
        className
      )}
      aria-label="Showroom promotions"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.slice(0, 6).map((banner, i) => (
            <Link
              key={banner.id || banner.href || i}
              href={banner.href}
              className={cn(
                'group relative isolate min-h-[180px] overflow-hidden rounded-2xl bg-neutral-900 shadow-md sm:min-h-[200px]',
                'ring-1 ring-black/5 transition duration-500',
                'hover:shadow-xl hover:ring-black/10'
              )}
            >
              <SmartProductImage
                src={banner.image}
                alt=""
                fill
                className="object-cover transition duration-[8000ms] ease-out motion-safe:group-hover:scale-110"
                sizes="(max-width: 1024px) 50vw, 33vw"
                fallbackSrc={resolveDealershipBannerFallback(i)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-3xl transition group-hover:opacity-60"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-5 sm:p-6">
                {banner.badge ? (
                  <span className="mb-2 inline-flex w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                    {banner.badge}
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold leading-tight text-white sm:text-xl">{banner.title}</h3>
                {banner.subtitle ? (
                  <p className="mt-1 max-w-md text-sm text-white/80">{banner.subtitle}</p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/90">
                  Explore <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
