'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';

function HomeEditTile({ tile, className, imageClassName }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        'group relative block overflow-hidden rounded-[10px] bg-stone-200',
        className
      )}
    >
      <SmartProductImage
        src={tile.image}
        alt={tile.eyebrow || tile.title || ''}
        fill
        className={cn('object-cover transition duration-500 group-hover:scale-[1.03]', imageClassName)}
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-900/25 to-stone-900/10"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-6 text-center text-white sm:px-6">
        {tile.eyebrow ? (
          <p className="text-sm font-medium text-white/95 sm:text-lg">{tile.eyebrow}</p>
        ) : null}
        {tile.title ? (
          <h3 className="mt-1 max-w-md text-sm font-semibold leading-snug sm:text-2xl">{tile.title}</h3>
        ) : null}
        <span className="mt-3 inline-flex min-w-[120px] items-center justify-center rounded-sm bg-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition group-hover:bg-stone-800 sm:mt-4 sm:min-w-[190px] sm:py-2.5 sm:text-base">
          {tile.ctaLabel || 'Explore'}
        </span>
      </div>
    </Link>
  );
}

/**
 * Gul Ahmed "The Home Edit" — large left hero + right stacked tiles.
 */
export function FashionHomeEditSection({ section }) {
  if (!section?.tiles?.length) return null;

  const hero = section.tiles.find((t) => t.slot === 'hero') || section.tiles[0];
  const banner = section.tiles.find((t) => t.slot === 'banner');
  const halfLeft = section.tiles.find((t) => t.slot === 'half-left');
  const halfRight = section.tiles.find((t) => t.slot === 'half-right');

  return (
    <section className="bg-white py-5 sm:py-8">
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-4 lg:px-[15px]">
        <div className="mb-5 text-center sm:mb-8">
          <h2 className={cn(STORE_SECTION_HEADING, 'text-[20px] text-stone-900 sm:text-[32px]')}>
            {section.viewAllHref ? (
              <Link href={section.viewAllHref} className="hover:text-stone-700">
                {section.title}
              </Link>
            ) : (
              section.title
            )}
          </h2>
          {section.subtitle ? (
            <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-stone-700 sm:text-[15px]">
              {section.subtitle}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-2.5">
          <HomeEditTile tile={hero} className="min-h-[320px] sm:min-h-[420px] lg:min-h-[640px]" />

          <div className="flex flex-col gap-2.5">
            {banner ? (
              <HomeEditTile tile={banner} className="min-h-[160px] sm:min-h-[200px] lg:min-h-[260px]" />
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              {halfLeft ? (
                <HomeEditTile tile={halfLeft} className="min-h-[180px] sm:min-h-[220px] lg:min-h-[318px]" />
              ) : null}
              {halfRight ? (
                <HomeEditTile tile={halfRight} className="min-h-[180px] sm:min-h-[220px] lg:min-h-[318px]" />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
