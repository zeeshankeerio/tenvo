'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';

function CollectionCard({ item }) {
  return (
    <div className="relative shrink-0" data-collection-card>
      <span
        className="pointer-events-none absolute -left-1 top-1/2 z-0 -translate-y-1/2 select-none font-bold leading-none text-stone-200 sm:-left-2"
        style={{
          fontSize: 'clamp(5rem, 14vw, 9rem)',
          WebkitTextStroke: '1px #e7e5e4',
          color: 'transparent',
        }}
        aria-hidden
      >
        {item.rank}
      </span>

      <Link
        href={item.href}
        className="group relative z-10 block w-[168px] overflow-hidden rounded-sm bg-stone-100 sm:w-[200px] md:w-[220px]"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          <SmartProductImage
            src={item.image}
            alt={item.label}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          {item.badge ? (
            <div className="absolute inset-x-0 bottom-[3.25rem] flex justify-center px-2">
              <span className="rounded-full bg-black/55 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm sm:text-[10px]">
                {item.badge}
              </span>
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-3 pt-10">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white sm:text-xs">
              {item.label}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Zellbury-style Top 10 collections carousel with rank numerals and badge overlays.
 * Seamless marquee loop when autoScroll is on; static row otherwise.
 */
export function TopCollectionsCarousel({
  title = 'Top 10 Collections Nationwide',
  items = [],
  autoScroll = true,
}) {
  if (!items.length) return null;

  const useMarquee = autoScroll && items.length >= 3;

  return (
    <section className="relative overflow-hidden bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-xl font-semibold tracking-tight text-stone-900 sm:mb-10 sm:text-2xl">
          {title}
        </h2>

        {useMarquee ? (
          <StoreMarqueeRow
            items={items}
            enabled={autoScroll}
            fadeFrom="white"
            durationSec={40}
            gapClassName="gap-3 pr-3 sm:gap-4 sm:pr-4"
            renderItem={(item) => <CollectionCard item={item} />}
          />
        ) : (
          <div
            className="flex gap-3 overflow-x-auto pb-2 pl-1 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {items.map((item) => (
              <div
                key={`${item.rank}-${item.productId || item.label}`}
                style={{ scrollSnapAlign: 'start' }}
              >
                <CollectionCard item={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
