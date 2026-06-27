'use client';

import MarketingMeshBackground from '@/components/marketing/effects/MarketingMeshBackground';
import { HOME_TRUST_CHIP_THEMES, HOME_TRUST_CHIPS } from '@/lib/marketing/homeVisualThemes';
import { cn } from '@/lib/utils';

/**
 * Industry preset marquee with per-vertical tint (breaks flat white-chip monotony).
 */
export default function HomeTrustStrip() {
  return (
    <MarketingMeshBackground
      as="section"
      variant="trust"
      className="border-b border-neutral-200/80 py-3 sm:py-4"
    >
      <div
        className="relative w-full overflow-hidden integration-marquee-fade"
        aria-label="Industry presets"
      >
        <div className="flex w-max animate-marquee motion-reduce:animate-none whitespace-nowrap hover:[animation-play-state:paused]">
          {[0, 1].map((set) => (
            <div
              key={set}
              className="flex items-center gap-2.5 px-3 sm:gap-3 sm:px-4"
              aria-hidden={set === 1}
            >
              {HOME_TRUST_CHIPS.map((chip) => (
                <span
                  key={`${set}-${chip}`}
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm sm:px-4 sm:py-2 sm:text-sm',
                    HOME_TRUST_CHIP_THEMES[chip] ?? 'border-neutral-200/90 bg-white/95 text-neutral-700',
                    'motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-0.5'
                  )}
                >
                  {chip}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </MarketingMeshBackground>
  );
}
