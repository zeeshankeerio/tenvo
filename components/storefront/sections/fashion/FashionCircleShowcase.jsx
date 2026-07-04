'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';
import { FashionSectionHeader } from './FashionSectionHeader';
import { cn } from '@/lib/utils';

function CircleTile({ item, accent }) {
  return (
    <Link
      href={item.href}
      className="group flex w-[92px] shrink-0 flex-col items-center sm:w-[104px] lg:w-[116px]"
      style={{ '--sf-accent': accent }}
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
  );
}

/**
 * Premium single-row circular category showcase (Ready to Wear / Accessories).
 * Uses a seamless CSS marquee loop when there are enough tiles; otherwise a
 * centered static row with optional manual arrows.
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
  const [overflowing, setOverflowing] = useState(circles.length > 5);

  const useMarquee = animate && circles.length >= 4;
  const fadeFrom = variant === 'muted' ? 'muted' : 'white';

  const updateScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth > 8;
    setOverflowing(overflow);
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    if (useMarquee) return undefined;
    updateScroll();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [circles, updateScroll, useMarquee]);

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
          {!useMarquee && overflowing && canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className="absolute -left-1 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-md backdrop-blur transition hover:text-stone-900 sm:flex"
              aria-label={`Previous ${title}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          {!useMarquee && overflowing && canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className="absolute -right-1 top-[42%] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-md backdrop-blur transition hover:text-stone-900 sm:flex"
              aria-label={`Next ${title}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}

          {useMarquee ? (
            <StoreMarqueeRow
              items={circles}
              fadeFrom={fadeFrom}
              durationSec={34}
              gapClassName="gap-5 pr-5 sm:gap-8 sm:pr-8"
              renderItem={(item) => <CircleTile item={item} accent={accent} />}
            />
          ) : (
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
                <CircleTile key={item.id} item={item} accent={accent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
