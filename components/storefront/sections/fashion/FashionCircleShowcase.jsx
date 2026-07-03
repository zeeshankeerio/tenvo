'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { useRailAutoScroll } from '@/lib/hooks/storefront/useRailAutoScroll';
import { FashionSectionHeader } from './FashionSectionHeader';
import { cn } from '@/lib/utils';

/**
 * Premium single-row circular category showcase (Ready to Wear / Accessories).
 * Always a single horizontal row: it auto-scrolls and exposes overlay arrows
 * when the tiles overflow, and stays centered when they fit. Circles pick up
 * the store accent colour on hover for a boutique feel.
 *
 * @param {{
 *   title: string;
 *   circles?: Array<{ id: string; label: string; href: string; image: string }>;
 *   viewAllHref?: string;
 *   showDivider?: boolean;
 *   variant?: 'white' | 'muted';
 *   animate?: boolean;
 *   accent?: string;
 * }} props
 */
export function FashionCircleShowcase({
  title,
  circles = [],
  viewAllHref,
  showDivider = false,
  variant = 'muted',
  animate = true,
  accent = '#1c1917',
}) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Assume overflow for longer rows to avoid an initial centered → left shift.
  const [overflowing, setOverflowing] = useState(circles.length > 5);

  useRailAutoScroll(trackRef, {
    enabled: animate && circles.length > 4,
    interval: 3400,
    step: 132,
  });

  const updateScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth > 8;
    setOverflowing(overflow);
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
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
    trackRef.current?.scrollBy({ left: dir * 264, behavior: 'smooth' });
  };

  if (circles.length < 2) return null;

  const bgClass = variant === 'white' ? 'bg-white' : 'bg-[#f7f6f5]';

  return (
    <section
      className={cn('py-12 sm:py-16', bgClass, showDivider && 'border-t border-stone-200')}
      style={{ '--sf-accent': accent }}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <FashionSectionHeader title={title} viewAllHref={viewAllHref} accent={accent} dense />

        <div className="relative">
          {overflowing && canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className="absolute -left-1 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-md backdrop-blur transition hover:text-stone-900 sm:flex"
              aria-label={`Previous ${title}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          {overflowing && canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className="absolute -right-1 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-md backdrop-blur transition hover:text-stone-900 sm:flex"
              aria-label={`Next ${title}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}

          <div
            ref={trackRef}
            className={cn(
              'flex gap-5 pb-1 sm:gap-8',
              'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              !overflowing && 'justify-center',
              animate && 'sf-stagger'
            )}
          >
            {circles.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex w-[92px] shrink-0 flex-col items-center sm:w-[104px] lg:w-[116px]"
              >
                <div className="rounded-full border-2 border-transparent p-1 transition-colors duration-300 group-hover:border-[color:var(--sf-accent)]">
                  <div className="relative h-[84px] w-[84px] overflow-hidden rounded-full bg-stone-100 shadow-sm ring-1 ring-stone-200/70 transition-shadow duration-300 group-hover:shadow-md sm:h-[96px] sm:w-[96px] lg:h-[108px] lg:w-[108px]">
                    <SmartProductImage
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.08]"
                      sizes="120px"
                    />
                  </div>
                </div>
                <p className="mt-3 max-w-[108px] text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-stone-800 transition-colors group-hover:text-[color:var(--sf-accent)] sm:text-[11px]">
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
