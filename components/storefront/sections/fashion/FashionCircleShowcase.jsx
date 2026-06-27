'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';

/**
 * Centered circular category row (Ready to Wear / Accessories).
 * Wraps on large screens; horizontal scroll on small viewports when needed.
 */
export function FashionCircleShowcase({
  title,
  circles = [],
  viewAllHref,
  showDivider = false,
  variant = 'muted',
}) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScroll();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [circles, updateScroll]);

  const scrollByDir = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  if (circles.length < 2) return null;

  const bgClass = variant === 'white' ? 'bg-white' : 'bg-[#f5f5f4]';

  return (
    <section
      className={cn(
        'py-8 sm:py-10',
        bgClass,
        showDivider && 'border-t border-stone-200'
      )}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-center gap-3 sm:mb-7">
          <h2 className="text-center text-lg font-semibold uppercase tracking-[0.18em] text-stone-900 sm:text-xl">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className="mr-1 text-xs font-semibold uppercase tracking-wide text-stone-500 transition hover:text-stone-800"
              >
                View all
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              disabled={!canScrollLeft}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white transition hover:opacity-90 disabled:opacity-30"
              aria-label={`Previous ${title}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              disabled={!canScrollRight}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white transition hover:opacity-90 disabled:opacity-30"
              aria-label={`Next ${title}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative -mx-2 sm:mx-0">
          <div
            ref={trackRef}
            className={cn(
              'flex gap-4 px-2 pb-1 sm:gap-5 sm:px-0',
              'max-lg:overflow-x-auto max-lg:[-ms-overflow-style:none] max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden',
              'lg:mx-auto lg:max-w-5xl lg:flex-wrap lg:justify-center lg:overflow-visible lg:gap-x-6 lg:gap-y-7'
            )}
          >
            {circles.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex w-[84px] shrink-0 flex-col items-center sm:w-[96px] lg:w-[100px]"
              >
                <div className="relative h-[84px] w-[84px] overflow-hidden rounded-full border border-stone-200 bg-white shadow-sm transition group-hover:shadow-md sm:h-[96px] sm:w-[96px] lg:h-[100px] lg:w-[100px]">
                  <SmartProductImage
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="100px"
                  />
                </div>
                <p className="mt-2.5 max-w-[96px] text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-stone-900 sm:text-[11px]">
                  {item.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
