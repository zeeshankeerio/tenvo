'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { resolveBrandMonogramUrl } from '@/lib/storefront/storefrontImagePlaceholders';

/**
 * Infinite single-row brand marquee for automotive storefronts.
 * Duplicates the list for seamless CSS marquee animation.
 *
 * @param {{
 *   brands: Array<{ id: string; name: string; image?: string; href?: string }>;
 *   productsUrl: string;
 *   viewAllHref?: string;
 *   accent?: string;
 *   variant?: 'dealership' | 'marketplace' | 'parts';
 *   layout?: 'marquee' | 'grid';
 *   showViewAll?: boolean;
 *   viewAllLabel?: string;
 *   className?: string;
 * }} props
 */
export function AutoBrandMarquee({
  brands = [],
  productsUrl,
  viewAllHref,
  accent = '#D4AF37',
  variant = 'dealership',
  layout = 'marquee',
  showViewAll = true,
  viewAllLabel = 'View more brands',
  className,
}) {
  if (!brands.length) return null;

  const loop = [...brands, ...brands];
  const hoverBorder =
    variant === 'marketplace'
      ? 'hover:border-[#E30613] group-hover:text-[#E30613]'
      : variant === 'parts'
        ? 'hover:border-[var(--store-accent,#b45309)]'
        : 'hover:border-[#D4AF37] hover:shadow-md';

  const buildHref = (brand) =>
    brand.href || `${productsUrl}?brand=${encodeURIComponent(brand.name)}`;

  const brandTile = (brand, keySuffix = '') => (
    <Link
      key={`${brand.id}${keySuffix}`}
      href={buildHref(brand)}
      className={cn(
        'group flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-lg border border-neutral-100 bg-white p-3 transition sm:w-[100px]',
        hoverBorder
      )}
    >
      <div
        className={cn(
          'relative h-12 w-12 overflow-hidden rounded-full bg-neutral-100 sm:h-14 sm:w-14',
          variant === 'dealership' && 'grayscale transition group-hover:grayscale-0'
        )}
      >
        {brand.image ? (
          <SmartProductImage
            src={brand.image}
            alt={brand.name}
            fill
            className="object-cover"
            fallbackSrc={brand.imageFallback || resolveBrandMonogramUrl(brand.name)}
            placeholderLabel={brand.name}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-400"
            aria-hidden
          >
            {brand.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-500 group-hover:text-neutral-900 sm:text-[11px]',
          variant === 'marketplace' && 'normal-case tracking-normal'
        )}
      >
        {brand.name}
      </span>
    </Link>
  );

  if (layout === 'grid') {
    return (
      <div className={className}>
        <div className="flex flex-wrap justify-center gap-3">
          {brands.map((brand) => brandTile(brand))}
        </div>
        {showViewAll ? (
          <div className="mt-4 text-center">
            <Link
              href={viewAllHref || productsUrl}
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition hover:text-neutral-900"
              style={{ color: variant === 'dealership' ? undefined : accent }}
            >
              {viewAllLabel} <ChevronDown className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent sm:w-12"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent sm:w-12"
          aria-hidden
        />

        <div
          className={cn(
            'flex w-max gap-3 py-1 animate-marquee',
            'motion-reduce:animate-none motion-reduce:overflow-x-auto motion-reduce:pb-2'
          )}
        >
          {loop.map((brand, i) => brandTile(brand, `-${i}`))}
        </div>
      </div>

      {showViewAll ? (
        <div className="mt-4 text-center">
          <Link
            href={viewAllHref || productsUrl}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition hover:text-neutral-900"
            style={{ color: variant === 'dealership' ? undefined : accent }}
          >
            {viewAllLabel} <ChevronDown className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
