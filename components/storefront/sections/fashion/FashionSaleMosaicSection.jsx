'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';

function SaleTile({ tile, tall = false }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        'group relative block overflow-hidden rounded-[10px] bg-stone-200',
        tall ? 'min-h-[280px] flex-1 sm:min-h-[340px] lg:min-h-[420px]' : 'min-h-[130px] sm:min-h-[160px] lg:min-h-[200px]'
      )}
    >
      <SmartProductImage
        src={tile.desktop || tile.image}
        alt={tile.label || ''}
        fill
        className="hidden object-cover transition duration-500 group-hover:scale-[1.03] md:block"
      />
      <SmartProductImage
        src={tile.mobile || tile.desktop || tile.image}
        alt={tile.label || ''}
        fill
        className="object-cover transition duration-500 group-hover:scale-[1.03] md:hidden"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 py-4"
        aria-hidden
      >
        <span className="w-full rounded-sm bg-white/90 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-900 sm:text-sm">
          {tile.label}
        </span>
      </div>
    </Link>
  );
}

/**
 * Gul Ahmed "Sale" mosaic — five-column staggered category grid (desktop), scroll row (mobile).
 */
export function FashionSaleMosaicSection({ section }) {
  if (!section?.columns?.length) return null;

  const flatMobile = section.columns.flatMap((col) => col.tiles || []);

  return (
    <section className="bg-white pb-8 pt-4 sm:pb-10 sm:pt-5">
      <div className="mx-auto max-w-[1800px] px-2.5 sm:px-5">
        <div className="mb-6 text-center sm:mb-10">
          <h2 className={cn(STORE_SECTION_HEADING, 'text-[20px] text-stone-800 sm:text-[32px]')}>
            {section.title}
          </h2>
        </div>

        {/* Mobile: horizontal scroll strip */}
        <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {flatMobile.map((tile) => (
            <div key={tile.id} className="w-[42vw] max-w-[200px] shrink-0">
              <SaleTile tile={tile} tall />
            </div>
          ))}
        </div>

        {/* Desktop: five-column mosaic */}
        <div className="hidden items-stretch justify-center gap-4 md:flex">
          {section.columns.map((col) => {
            const tiles = col.tiles || [];
            const isSingle = tiles.length === 1;
            return (
              <div
                key={col.id}
                className={cn('flex min-w-0 flex-1 flex-col gap-4', isSingle && 'justify-center')}
              >
                {tiles.map((tile, index) => (
                  <SaleTile key={tile.id} tile={tile} tall={isSingle || index === 0} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
