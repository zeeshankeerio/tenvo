'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';
import { resolveRestaurantMenuIcon } from '@/lib/storefront/restaurantMenu';

function CategoryTile({ cat, accent }) {
  const Icon = resolveRestaurantMenuIcon(cat.slug || cat.label);
  const hasImage = Boolean(cat.image);

  return (
    <Link
      href={cat.href}
      className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center sm:w-[5.25rem]"
    >
      <div className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-2 border-zinc-200 bg-white shadow-sm transition duration-300 motion-safe:group-hover:scale-105 motion-safe:group-hover:border-zinc-300 motion-safe:group-hover:shadow-md sm:h-20 sm:w-20">
        {hasImage ? (
          <SmartProductImage
            src={cat.image}
            alt={cat.label}
            fill
            className="object-cover transition duration-300 motion-safe:group-hover:scale-105"
            sizes="80px"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-red-50"
            style={{ color: accent }}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </div>
        )}
      </div>
      <span className="line-clamp-2 w-full text-[10px] font-semibold leading-tight text-zinc-600 motion-safe:group-hover:text-zinc-900 sm:text-[11px]">
        {cat.label}
      </span>
    </Link>
  );
}

/**
 * Single-row auto-scrolling category rail with Roll Inn CDN images (or lucide fallback).
 */
export function RestaurantCategoryMarquee({ categoryIcons = [], accent = '#dc2626' }) {
  if (!categoryIcons.length) return null;

  return (
    <StoreMarqueeRow
      items={categoryIcons}
      fadeFrom="white"
      durationSec={40}
      slideClassName="w-[4.75rem] sm:w-[5.25rem]"
      gapClassName="gap-4 pr-4 sm:gap-5 sm:pr-5"
      renderItem={(cat) => <CategoryTile cat={cat} accent={accent} />}
    />
  );
}
