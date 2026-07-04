'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function MarqueeTrack({
  trackId,
  items,
  renderItem,
  slideClassName,
  gapClassName,
  ariaHidden,
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-stretch',
        gapClassName,
        ariaHidden && 'pointer-events-none'
      )}
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item, index) => (
        <div
          key={`${trackId}-${item.id ?? item.key ?? index}`}
          className={cn('shrink-0', slideClassName)}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

const FADE_EDGES = {
  white: {
    left: 'bg-gradient-to-r from-white via-white/95 to-transparent',
    right: 'bg-gradient-to-l from-white via-white/95 to-transparent',
  },
  muted: {
    left: 'bg-gradient-to-r from-[#f7f6f5] via-[#f7f6f5]/95 to-transparent',
    right: 'bg-gradient-to-l from-[#f7f6f5] via-[#f7f6f5]/95 to-transparent',
  },
  black: {
    left: 'bg-gradient-to-r from-black via-black/95 to-transparent',
    right: 'bg-gradient-to-l from-black via-black/95 to-transparent',
  },
};

/**
 * Seamless horizontal CSS marquee — dual track, -50% loop (same pattern as gym template).
 * Pauses on hover; falls back to a static scroll row when motion is reduced or disabled.
 */
export function StoreMarqueeRow({
  items = [],
  renderItem,
  slideClassName,
  className,
  gapClassName = 'gap-3 pr-3 sm:gap-4 sm:pr-4',
  fadeFrom = 'white',
  reverse = false,
  durationSec = 38,
  enabled = true,
}) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!items.length || typeof renderItem !== 'function') return null;

  const fade = FADE_EDGES[fadeFrom] || FADE_EDGES.white;
  const useMarquee = enabled && items.length >= 2 && !reduceMotion;

  if (items.length === 1) {
    return (
      <div className={cn('flex justify-center', className)}>
        <div className={cn('w-full max-w-sm', slideClassName)}>{renderItem(items[0], 0)}</div>
      </div>
    );
  }

  if (!useMarquee) {
    return (
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-1 sm:gap-4',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className
        )}
      >
        {items.map((item, index) => (
          <div key={item.id ?? item.key ?? index} className={cn('shrink-0', slideClassName)}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-12',
          fade.left
        )}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-12',
          fade.right
        )}
        aria-hidden
      />

      <div className="overflow-hidden">
        <div
          className={cn(
            'store-marquee-track flex w-max items-stretch',
            reverse && 'store-marquee-track--reverse'
          )}
          style={{ '--store-marquee-duration': `${durationSec}s` }}
        >
          <MarqueeTrack
            trackId="a"
            items={items}
            renderItem={renderItem}
            slideClassName={slideClassName}
            gapClassName={gapClassName}
          />
          <MarqueeTrack
            trackId="b"
            items={items}
            renderItem={renderItem}
            slideClassName={slideClassName}
            gapClassName={gapClassName}
            ariaHidden
          />
        </div>
      </div>
    </div>
  );
}

export default StoreMarqueeRow;
