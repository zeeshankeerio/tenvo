'use client';

import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { TrendingUp, CheckSquare, Users, BarChart3, ClipboardList } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_H3,
  MARKETING_LEAD,
  MARKETING_SECTION,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';
import { MARKETING_CRM_PILLARS } from '@/lib/marketing/homeVisualThemes';
import { cn } from '@/lib/utils';
import Hero from '@/components/marketing/sections/Hero';
import CTASection from '@/components/marketing/sections/CTASection';
import MarketingPillarCard from '@/components/marketing/ui/MarketingPillarCard';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { Button } from '@/components/ui/button';

const SALES_OPS = [
  {
    icon: TrendingUp,
    title: 'Quotations & Sales Manager',
    body:
      'B2B quotes, follow-ups, and pipeline-style tracking live next to inventory availability and credit exposure, so sales teams stop promising SKUs you cannot fulfil.',
    accent: 'border-sky-200/80 bg-gradient-to-br from-sky-50/70 to-white',
    iconClass: 'bg-sky-600 text-white',
  },
  {
    icon: CheckSquare,
    title: 'Approvals & governance',
    body:
      'Discounts, refunds, and high-impact changes can follow approval paths so growing teams keep control like they would in larger ERPs, without slowing honest day-to-day selling.',
    accent: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white',
    iconClass: 'bg-emerald-600 text-white',
  },
];

export default function MarketingCrmSolutionsPage() {
  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge="Growth & customer experience"
        title={
          <>
            Marketing & CRM that share <span className="text-brand-primary">one source of truth</span>
          </>
        }
        subtitle="Campaigns, loyalty, analytics, and B2B selling - wired to the same products, orders, and payments as your storefront and POS. Positioned for teams comparing TENVO to stitched Current Solutions + spreadsheets."
        primaryCTA={{ text: 'Start free trial', href: '/register' }}
        secondaryCTA={{ text: 'Compare positioning', href: '/why-tenvo' }}
      />

      <section className={cn(MARKETING_SECTION, 'border-b border-neutral-200/80 bg-white')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10 lg:mb-14">
            <p className={cn(MARKETING_EYEBROW, 'mb-3')}>Why this page exists</p>
            <h2 className={MARKETING_SECTION_HEADING}>
              Subscribers choose suites that cover operations and growth
            </h2>
            <p className={cn(MARKETING_LEAD, 'mt-4')}>
              Shopify wins on storefront + apps; Zoho wins on breadth. TENVO&apos;s story is{' '}
              <strong className="font-semibold text-neutral-800">one hub</strong>: when campaigns and CRM read the same stock and
              arguments about which system is right.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 sm:gap-6 md:gap-8">
            {MARKETING_CRM_PILLARS.map((pillar) => {
              const Icon = LucideIcons[pillar.icon];
              return (
                <MarketingPillarCard
                  key={pillar.id}
                  id={pillar.id}
                  title={pillar.title}
                  body={pillar.body}
                  bullets={pillar.bullets}
                  icon={Icon}
                  accent={pillar.accent}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section id="sales-suite" className={cn(MARKETING_SECTION, 'scroll-mt-28 border-b border-neutral-200/80 bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10 lg:mb-12">
            <p className={cn(MARKETING_EYEBROW, 'mb-3')}>Sales & operations</p>
            <h2 className={MARKETING_SECTION_HEADING}>What else sits next to campaigns</h2>
            <p className={cn(MARKETING_LEAD, 'mt-4')}>
              These modules mirror what power users see in the Enterprise Hub sidebar - so marketing promises match the
              product surface.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 md:gap-8">
            {SALES_OPS.map(({ icon: Icon, title, body, accent, iconClass }) => (
              <article
                key={title}
                className={cn(
                  'rounded-2xl border p-5 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8',
                  'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md',
                  accent
                )}
              >
                <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-xl', iconClass)}>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-600">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:mt-10 sm:gap-6 sm:rounded-3xl sm:p-6 md:grid-cols-2 md:p-8 lg:p-10">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-primary">
                <Users className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Payroll & HR</h3>
                <p className="mt-1 text-sm font-medium text-neutral-600">
                  Payroll runs on Business+. Attendance and shift scheduling surfaces are early - confirm HR depth on a demo before buying for workforce management.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-primary">
                <BarChart3 className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Audit trail</h3>
                <p className="mt-1 text-sm font-medium text-neutral-600">
                  Who changed prices, approved a refund, or edited tax settings - audit logs on Business+ alongside
                  export-oriented tax summaries.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild className="rounded-xl bg-brand-primary font-semibold text-white hover:bg-brand-primary-dark">
              <Link href="/features#analytics">Explore analytics on Features</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl font-semibold">
              <Link href="/integrations">View integrations</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-3xl px-4 text-center min-[380px]:px-5 sm:px-6">
          <ClipboardList className="mx-auto mb-4 h-10 w-10 text-brand-primary" aria-hidden />
          <h2 className={MARKETING_H3}>Plans & domain fit</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-600">
            Campaigns and some automation surfaces are <strong className="font-semibold">tiered by plan</strong> and <strong className="font-semibold">business domain</strong>{' '}
            (for example hospitality vs pure wholesale). Always confirm exact entitlements on{' '}
            <Link href="/pricing" className="font-semibold text-brand-primary underline-offset-2 hover:underline">
              Pricing
            </Link>{' '}
            or a{' '}
            <MarketingCtaLink href={getBookMeetingHref()} className="font-semibold text-brand-primary underline-offset-2 hover:underline">
              meeting call
            </MarketingCtaLink>
            {' '}we prefer accurate expectations over overselling.
          </p>
        </div>
      </section>

      <CTASection
        variant="split"
        title="Show growth and operations in one walkthrough"
        subtitle="Book a demo to map campaigns, CRM, and storefront data to how your team already works."
        primaryCTA={{ text: 'Book a meeting', href: getBookMeetingHref() }}
        secondaryCTA={{ text: 'View pricing', href: '/pricing' }}
      />
    </MarketingLayout>
  );
}
