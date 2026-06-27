'use client';

import Link from 'next/link';
import { HOME_INTEGRATION_PARTNERS } from '@/lib/marketing/homePartners';
import { CAPABILITY_STATUS_STYLE } from '@/lib/marketing/capabilities';
import { MARKETING_CONTAINER, MARKETING_EYEBROW } from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

/**
 * Integration marquee with honest status labels from capabilities catalog.
 */
export default function HomeIntegrationMarquee({ compact = false, embedded = false }) {
  const partners = HOME_INTEGRATION_PARTNERS;

  const content = (
    <>
      <div className={embedded ? undefined : compact ? MARKETING_CONTAINER : undefined}>
        <p
          className={cn(
            'text-center',
            MARKETING_EYEBROW,
            'tracking-[0.2em] text-neutral-400',
            compact ? 'mb-2.5 sm:mb-3' : 'mb-3 px-4'
          )}
        >
          Payments, channels, and local ops{' '}
          <Link href="/integrations" className="text-brand-primary hover:underline">
            (see all)
          </Link>
        </p>
      </div>
      <div
        className="relative integration-marquee-fade"
        aria-label="Integration partners and status"
      >
        <div className="flex w-max animate-marquee-partners motion-reduce:animate-none hover:[animation-play-state:paused]">
          {[0, 1].map((set) => (
            <div
              key={set}
              className="flex shrink-0 items-center gap-2.5 pr-6 sm:gap-3 sm:pr-10"
              aria-hidden={set === 1}
            >
              {partners.map((partner) => (
                <div
                  key={`${set}-${partner.name}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200/90 bg-neutral-50/95 px-2.5 py-1 shadow-sm sm:px-3 sm:py-1.5"
                >
                  <span className="whitespace-nowrap text-[11px] font-semibold text-neutral-800 sm:text-xs">
                    {partner.name}
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap rounded-sm px-1 py-px text-[6px] font-semibold uppercase tracking-wide sm:text-[7px]',
                      CAPABILITY_STATUS_STYLE[partner.status]
                    )}
                  >
                    {partner.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className="overflow-hidden">{content}</div>;
  }

  return (
    <section
      className={cn(
        'overflow-hidden border-b border-neutral-200/70 bg-white',
        compact ? 'py-4 sm:py-5' : 'py-5 sm:py-6'
      )}
    >
      {content}
    </section>
  );
}
