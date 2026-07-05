'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';

const TILE_TEXT_SHADOW_STYLE = {
  textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)',
};

/**
 * @param {'hero' | 'banner' | 'half'} variant
 */
function HomeEditTile({ tile, variant = 'half', className }) {
  const isHero = variant === 'hero';
  const isBanner = variant === 'banner';
  const isCompact = variant === 'half';

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
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <div
        className={cn(
          'absolute inset-0',
          isHero && 'bg-gradient-to-t from-stone-950/85 via-stone-900/40 to-stone-800/15',
          isBanner && 'bg-gradient-to-t from-stone-950/80 via-stone-900/35 to-stone-900/5',
          isCompact && 'bg-gradient-to-t from-stone-950/75 via-stone-900/30 to-transparent'
        )}
        aria-hidden
      />
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center text-center',
          isHero ? 'px-6 py-8 sm:px-10' : isBanner ? 'px-5 py-6 sm:px-8' : 'px-3 py-5 sm:px-4'
        )}
      >
        {tile.eyebrow ? (
          <p
            style={TILE_TEXT_SHADOW_STYLE}
            className={cn(
              'store-heading--inverse !text-white font-medium tracking-wide',
              isHero ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
            )}
          >
            {tile.eyebrow}
          </p>
        ) : null}
        {tile.title && !isCompact ? (
          <h3
            style={TILE_TEXT_SHADOW_STYLE}
            className={cn(
              'store-heading--inverse !text-white max-w-md font-semibold leading-snug',
              isHero ? 'mt-3 text-base sm:mt-4 sm:text-xl lg:text-2xl' : 'mt-2 text-sm sm:text-lg lg:text-xl'
            )}
          >
            {tile.title}
          </h3>
        ) : null}
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-sm bg-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] !text-white transition group-hover:bg-stone-800',
            isHero ? 'mt-5 min-w-[140px] sm:mt-6 sm:min-w-[190px] sm:py-2.5 sm:text-sm' : '',
            isBanner ? 'mt-4 min-w-[130px] sm:min-w-[170px] sm:py-2.5 sm:text-sm' : '',
            isCompact ? 'mt-4 min-w-[110px] sm:mt-5 sm:min-w-[140px]' : ''
          )}
        >
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
          <HomeEditTile tile={hero} variant="hero" className="min-h-[320px] sm:min-h-[420px] lg:min-h-[640px]" />

          <div className="flex flex-col gap-2.5">
            {banner ? (
              <HomeEditTile tile={banner} variant="banner" className="min-h-[160px] sm:min-h-[200px] lg:min-h-[260px]" />
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              {halfLeft ? (
                <HomeEditTile tile={halfLeft} variant="half" className="min-h-[180px] sm:min-h-[220px] lg:min-h-[318px]" />
              ) : null}
              {halfRight ? (
                <HomeEditTile tile={halfRight} variant="half" className="min-h-[180px] sm:min-h-[220px] lg:min-h-[318px]" />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
