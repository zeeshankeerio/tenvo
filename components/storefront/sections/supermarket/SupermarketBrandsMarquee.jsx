'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';

/**
 * Naheed-style "Trending Now" brand row — seamless auto-scroll (gym template pattern).
 * @param {{ brands: Array<{ id: string; label: string; href: string; image?: string }>; autoScroll?: boolean }} props
 */
export function SupermarketBrandsMarquee({ brands = [], autoScroll = true }) {
  if (!brands.length) return null;

  return (
    <StoreMarqueeRow
      items={brands}
      enabled={autoScroll}
      fadeFrom="white"
      durationSec={36}
      gapClassName="gap-3 pr-3 sm:gap-4 sm:pr-4"
      slideClassName="w-[72px] sm:w-20"
      renderItem={(brand) => (
        <Link
          href={brand.href}
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 sm:w-20"
        >
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-white bg-white shadow-md ring-1 ring-slate-100 transition group-hover:ring-orange-200">
            <SmartProductImage
              src={brand.image}
              alt={brand.label}
              fill
              className="object-cover"
            />
          </div>
          <span className="line-clamp-1 text-center text-[10px] font-medium text-slate-600">
            {brand.label}
          </span>
        </Link>
      )}
    />
  );
}
