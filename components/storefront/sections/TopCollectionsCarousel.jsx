'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';

/**
 * Zellbury-style Top 10 collections carousel with rank numerals and badge overlays.
 * @param {{ title?: string; items: Array<{ rank: number; label: string; badge?: string | null; image: string; href: string }> }} props
 */
export function TopCollectionsCarousel({ title = 'Top 10 Collections Nationwide', items = [] }) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [items, updateScrollState]);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-collection-card]');
    const step = card ? card.clientWidth + 12 : 280;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center text-xl font-semibold tracking-tight text-stone-900 sm:mb-10 sm:text-2xl">
          {title}
        </h2>

        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className="absolute left-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-800 shadow-lg transition hover:scale-105 sm:h-11 sm:w-11"
              aria-label="Previous collections"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className="absolute right-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-800 shadow-lg transition hover:scale-105 sm:h-11 sm:w-11"
              aria-label="Next collections"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            ref={trackRef}
            className="flex gap-3 overflow-x-auto scroll-smooth pb-2 pl-1 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {items.map((item) => (
              <div
                key={`${item.rank}-${item.productId || item.label}`}
                className="relative shrink-0"
                style={{ scrollSnapAlign: 'start' }}
                data-collection-card
              >
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
