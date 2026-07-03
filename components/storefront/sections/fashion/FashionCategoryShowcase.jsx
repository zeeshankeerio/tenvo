'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { FashionSectionHeader } from './FashionSectionHeader';
import { cn } from '@/lib/utils';

/**
 * Editorial 4-up unstitched / fabric category grid. Aligns to the shared
 * 1400px content column (matching every other fashion section) and uses a
 * consistent 3:4 tile ratio with an on-hover "Shop now" reveal.
 */
export function UnstitchedShowcase({
  title = 'UNSTITCHED',
  tiles = [],
  viewAllHref,
  animate = true,
  accent = '#1c1917',
}) {
  if (tiles.length < 2) return null;

  return (
    <section className="border-b border-stone-100 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <FashionSectionHeader title={title} viewAllHref={viewAllHref} accent={accent} />

        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5',
            animate && 'sf-stagger'
          )}
        >
          {tiles.map((tile) => (
            <Link key={tile.id} href={tile.href} className="group text-center">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100 shadow-sm ring-1 ring-stone-200/60 transition duration-500 group-hover:shadow-xl">
                <SmartProductImage
                  src={tile.image}
                  alt=""
                  fill
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-70 transition duration-500 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white drop-shadow-sm sm:text-sm">
                    {tile.label}
                  </p>
                  <span
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/0 transition-all duration-300 group-hover:text-white/90 sm:text-[11px]"
                  >
                    Shop now
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
