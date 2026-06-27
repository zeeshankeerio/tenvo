'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';
import { TRIAL_CONFIG } from '@/lib/config/platform';
import MarketingMeshBackground from '@/components/marketing/effects/MarketingMeshBackground';
import HomeProductHeroVisual from '@/components/marketing/sections/HomeProductHeroVisual';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { cn } from '@/lib/utils';
import {
  MARKETING_CONTAINER,
  MARKETING_H1,
  MARKETING_LEAD,
} from '@/lib/utils/marketingLayout';

const DEFAULT_TRUST_STATS = [
  { value: 'One stack', label: 'Storefront, POS, inventory, and accounting in sync' },
  { value: 'Global-ready', label: 'Multi-country tax, currency, and regional workflows built in' },
  { value: 'Role-based', label: 'Clear permissions from cashier to owner' },
  { value: 'Guided rollout', label: 'Imports, templates, and demo-led onboarding' },
];

/**
 * Homepage hero — product-led visual, honest trust stats, pricing teaser.
 */
export default function HomeHero({
  workspaceHref = '/register',
  workspaceCtaMobile = 'Start free',
  workspaceCtaDesktop = 'START FREE',
  trustStats = DEFAULT_TRUST_STATS,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const trackHeroCta = (kind, href) => {
    trackEvent(EVENTS.HERO_CTA_CLICK, {
      cta_location: 'home_hero',
      cta_kind: kind,
      cta_destination: href,
    });
  };

  return (
    <MarketingMeshBackground
      as="section"
      variant="hero"
      className="border-b border-neutral-200/60 pb-10 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] lg:pb-16 lg:pt-[calc(5rem+env(safe-area-inset-top,0px))]"
    >
      <div className={cn('mx-auto min-w-0', MARKETING_CONTAINER)}>
        <div className="grid min-w-0 grid-cols-1 items-center gap-8 max-md:gap-6 lg:grid-cols-12 lg:gap-12">
          <div
            className={cn(
              'col-span-1 min-w-0 max-w-full space-y-5 sm:space-y-6 lg:col-span-6 lg:max-w-2xl lg:space-y-8',
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            )}
          >
            <div className="space-y-3.5 sm:space-y-4">
              <h1 className={MARKETING_H1}>
                Run your entire business from one{' '}
                <span className="text-brand-primary">intelligent dashboard</span>
              </h1>
              <p className={cn('max-w-xl', MARKETING_LEAD)}>
                <span className="lg:hidden">
                  Storefront, POS, inventory, and books in one stack. Stock, orders, and tax stay
                  aligned without duct-taping spreadsheets and plugins.
                </span>
                <span className="hidden lg:inline">
                  Run your brand store, checkout floors, warehouses, and books in one place. TENVO
                  keeps stock, orders, and tax aligned so you are not stitching spreadsheets,
                  plugins, and separate apps the way generic platforms expect you to.
                </span>
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-3 pt-1 md:flex-row md:items-stretch md:gap-4 md:pt-2">
              <Button
                asChild
                size="lg"
                className="group relative h-12 min-h-[48px] w-full min-w-0 overflow-hidden rounded-xl border border-black/[0.06] bg-brand-primary px-5 text-[0.9375rem] font-semibold tracking-tight text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_32px_-8px_rgba(210,43,43,0.45)] transition-[transform,box-shadow,background-color] duration-200 hover:bg-brand-primary-dark hover:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_16px_40px_-8px_rgba(210,43,43,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.99] motion-safe:md:hover:-translate-y-px md:h-[3.25rem] md:w-auto md:min-w-[11rem] md:px-8"
              >
                <MarketingCtaLink
                  href={getBookMeetingHref()}
                  className="relative z-[1] inline-flex w-full items-center justify-center gap-2 text-center"
                  onClick={() => trackHeroCta('book_meeting', getBookMeetingHref())}
                >
                  Book a meeting
                  <ArrowRight
                    className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </MarketingCtaLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="group relative h-12 min-h-[48px] w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-5 text-[0.9375rem] font-semibold tracking-tight text-neutral-900 shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_6px_20px_-8px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-[transform,box-shadow,border-color,color] duration-200 hover:border-neutral-300 hover:bg-neutral-50/90 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/80 focus-visible:ring-offset-2 active:scale-[0.99] motion-safe:md:hover:-translate-y-px md:h-[3.25rem] md:w-auto md:min-w-[11rem] md:px-8"
              >
                <Link
                  href={workspaceHref}
                  className="inline-flex w-full items-center justify-center gap-2 text-center"
                  onClick={() => trackHeroCta('workspace', workspaceHref)}
                >
                  <span className="md:hidden">{workspaceCtaMobile}</span>
                  <span className="hidden md:inline">{workspaceCtaDesktop}</span>
                </Link>
              </Button>
            </div>

            <p className="text-sm font-medium text-neutral-600">
              <span className="font-semibold text-neutral-800">
                {TRIAL_CONFIG.durationDays}-day free trial
              </span>
              {' · '}
              No credit card required ·{' '}
              <Link
                href="/pricing"
                className="font-semibold text-brand-primary underline-offset-2 transition-colors hover:text-brand-primary-dark hover:underline"
              >
                View pricing
              </Link>
            </p>

            {trustStats.length > 0 && (
              <div
                className="grid grid-cols-2 gap-4 border-t border-neutral-200/80 pt-6 sm:gap-6 sm:pt-8"
                role="list"
                aria-label="Platform highlights"
              >
                {trustStats.map((stat) => (
                  <div key={stat.value} className="min-w-0" role="listitem">
                    <p className="text-base font-semibold text-neutral-900 sm:text-lg">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs font-medium leading-snug text-neutral-500 sm:text-sm">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={cn(
              'relative col-span-1 min-w-0 w-full max-w-full lg:col-span-6',
              mounted ? 'animate-fade-in' : 'opacity-0'
            )}
          >
            <HomeProductHeroVisual className="lg:pl-2" />
          </div>
        </div>
      </div>
    </MarketingMeshBackground>
  );
}
