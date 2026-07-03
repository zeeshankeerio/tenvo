'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Auto-scrolling trending pill strip — no manual scrollbar, seamless loop.
 * @param {{ links: Array<{ id: string; label: string; href: string }>; accent?: string }} props
 */
export function FitnessTrendingMarquee({ links = [] }) {
  if (!links.length) return null;

  const loop = [...links, ...links];

  return (
    <div className="mt-3 flex items-center gap-2 sm:mt-2.5">
      <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-[9px]">
        Trending
      </span>
      <div
        className="relative min-w-0 flex-1 overflow-hidden"
        aria-label="Trending searches"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black via-black/80 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black via-black/80 to-transparent"
          aria-hidden
        />

        <div
          className={cn(
            'fitness-hero-trending-track flex w-max items-center gap-2 py-0.5',
            'motion-safe:animate-marquee motion-safe:[animation-duration:26s]',
            'motion-reduce:flex-wrap motion-reduce:gap-1.5 motion-reduce:overflow-visible'
          )}
        >
          {loop.map((link, index) => (
            <Link
              key={`${link.id}-${index}`}
              href={link.href}
              className={cn(
                'shrink-0 rounded-full border border-white/[0.09] bg-white/[0.06] px-3 py-1',
                'text-[11px] font-semibold text-zinc-200 transition',
                'active:scale-[0.97] active:border-rose-500/30',
                'hover:border-white/16 hover:bg-white/[0.11] hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/35'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
