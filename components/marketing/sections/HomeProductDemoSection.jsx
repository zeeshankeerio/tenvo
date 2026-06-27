'use client';

import Link from 'next/link';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { ArrowRight, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomeDemoSpotlightVisual from '@/components/marketing/sections/HomeDemoSpotlightVisual';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_LEAD,
  MARKETING_SECTION,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

const DEMO_HIGHLIGHTS = [
  'Zero-downtime migration from Excel',
  'Real-time multi-warehouse sync',
  'GST and sales tax on invoices',
  'AI-powered restock alerts',
];

/**
 * Product walkthrough band — links to live demo booking (no placeholder video asset).
 */
export default function HomeProductDemoSection() {
  return (
    <section className={cn(MARKETING_SECTION, 'border-b border-neutral-200/80 bg-neutral-50')}>
      <div className={MARKETING_CONTAINER}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="relative order-2 lg:order-1">
            <HomeDemoSpotlightVisual className="mx-auto max-w-md lg:max-w-none" />
          </div>

          <div className="order-1 space-y-5 lg:order-2">
            <div
              className={cn(
                MARKETING_EYEBROW,
                'inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 tracking-[0.2em] text-brand-primary'
              )}
            >
              <Play className="h-4 w-4 shrink-0" aria-hidden />
              Product walkthrough
            </div>
            <h2 className={MARKETING_SECTION_HEADING}>
              See how operators save hours every week.
            </h2>
            <p className={MARKETING_LEAD}>
              Book a short walkthrough of TENVO in action: Excel import, multi-location stock,
              GST-aware invoicing, and storefront checkout in one workspace.
            </p>
            <ul className="space-y-2.5">
              {DEMO_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium text-neutral-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-primary">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Button
                asChild
                className="h-12 rounded-xl bg-brand-primary px-6 font-semibold text-white hover:bg-brand-primary-dark"
              >
                <MarketingCtaLink href={getBookMeetingHref()} className="inline-flex items-center gap-2">
                  <Play className="h-4 w-4" fill="currentColor" aria-hidden />
                  Book a live meeting
                </MarketingCtaLink>
              </Button>
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary underline-offset-2 hover:underline"
              >
                Explore demo stores
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
