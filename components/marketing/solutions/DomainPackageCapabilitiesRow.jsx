'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTO_SCROLL_MS = 4800;
const CARD_GAP_PX = 24;

/**
 * Included capabilities row — static 4-column grid when ≤4 cards;
 * single-row auto-scroller when more than 4 (e.g. clothing suite).
 *
 * @param {{
 *   groups: Array<{ id: string }>;
 *   renderGroup: (group: { id: string }, index: number) => React.ReactNode;
 * }} props
 */
export default function DomainPackageCapabilitiesRow({ groups, renderGroup }) {
  const scrollRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const useScroller = groups.length > 4;

  const scrollByStep = useCallback((direction = 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-capability-card]');
    const step = (card?.offsetWidth || 320) + CARD_GAP_PX;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (direction > 0 && el.scrollLeft >= maxScroll - 8) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (direction < 0 && el.scrollLeft <= 8) {
      el.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!useScroller || paused) return undefined;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const interval = setInterval(() => scrollByStep(1), AUTO_SCROLL_MS);
    return () => clearInterval(interval);
  }, [useScroller, paused, scrollByStep, groups.length]);

  if (!useScroller) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        {groups.map((group, index) => renderGroup(group, index))}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white via-white/80 to-transparent sm:w-14"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white via-white/80 to-transparent sm:w-14"
        aria-hidden
      />

      <div className="absolute -top-1 right-0 z-20 hidden gap-1 sm:flex">
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:border-neutral-300 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          aria-label="Previous capability"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:border-neutral-300 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          aria-label="Next capability"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'domain-capabilities-scroller flex gap-5 overflow-x-auto pb-1 sm:gap-6',
          'snap-x snap-mandatory scroll-smooth',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
        role="region"
        aria-label="Included capabilities carousel"
        tabIndex={0}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {groups.map((group, index) => (
          <div
            key={group.id}
            data-capability-card
            className="w-[min(88vw,340px)] shrink-0 snap-start sm:w-[300px] lg:w-[calc((100%-4.5rem)/4)]"
          >
            {renderGroup(group, index)}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs font-medium text-neutral-400">
        {groups.length} modules · auto-scrolls · hover or focus to pause
      </p>
    </div>
  );
}
