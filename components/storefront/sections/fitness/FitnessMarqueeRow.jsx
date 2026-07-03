'use client';

import { cn } from '@/lib/utils';

function MarqueeTrack({ trackId, slideClassName, items, renderItem, ariaHidden }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-stretch gap-3 pr-3 sm:gap-4 sm:pr-4',
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

/**
 * Seamless CSS marquee — same pattern as FitnessTrainingServices (dual track, -50% loop).
 * Mobile/tablet only; pair with a separate lg+ grid for desktop.
 */
export function FitnessMarqueeRow({
  items = [],
  renderItem,
  slideClassName,
  className,
  resetKey,
  reverse = false,
}) {
  if (!items.length || typeof renderItem !== 'function') return null;

  if (items.length === 1) {
    return (
      <div className={cn('flex justify-center px-4 lg:hidden', className)} key={resetKey}>
        <div className={cn('w-full max-w-sm', slideClassName)}>{renderItem(items[0], 0)}</div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden lg:hidden', className)} key={resetKey}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black via-black/95 to-transparent sm:w-12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black via-black/95 to-transparent sm:w-12"
        aria-hidden
      />

      <div className="overflow-hidden">
        <div
          className={cn(
            'flex w-max items-stretch',
            reverse ? 'fitness-membership-marquee-track' : 'fitness-training-marquee-track'
          )}
        >
          <MarqueeTrack
            trackId="a"
            items={items}
            renderItem={renderItem}
            slideClassName={slideClassName}
          />
          <MarqueeTrack
            trackId="b"
            items={items}
            renderItem={renderItem}
            slideClassName={slideClassName}
            ariaHidden
          />
        </div>
      </div>
    </div>
  );
}

export default FitnessMarqueeRow;
