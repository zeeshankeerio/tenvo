'use client';

import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import CTASection from '@/components/marketing/sections/CTASection';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { Button } from '@/components/ui/button';
import {
  listDomainPackages,
  getDomainPackageRegisterHref,
  mergePlanLimits,
} from '@/lib/config/domainPackages';
import { INDUSTRY_PLANS_NAV, listIndustryPlanNavItems } from '@/lib/marketing/domainPackageNav';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { formatCurrency } from '@/lib/currency';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { getDemoStoreHref } from '@/lib/marketing/demoStoreGalleryMeta';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_LEAD,
  MARKETING_SECTION,
  MARKETING_SECTION_HEADING,
  MARKETING_STAT_VALUE,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

function resolveIcon(name) {
  return LucideIcons[name] || LucideIcons.Sparkles;
}

export default function IndustryPlansHubPage() {
  const packages = listDomainPackages();
  const navItems = listIndustryPlanNavItems();
  const navByKey = Object.fromEntries(navItems.map((item) => [item.key, item]));

  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge={INDUSTRY_PLANS_NAV.hubEyebrow}
        title={
          <>
            Specialized plans for <span className="text-brand-primary">serious operators</span>
          </>
        }
        subtitle={INDUSTRY_PLANS_NAV.hubDescription}
        primaryCTA={{ text: 'Compare SaaS tiers', href: '/pricing' }}
        secondaryCTA={{ text: 'Book a meeting', href: getBookMeetingHref() }}
      />

      <section className={cn(MARKETING_SECTION, 'border-b border-neutral-200/80 bg-white')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10 lg:mb-12">
            <p className={MARKETING_EYEBROW}>{packages.length} vertical suites</p>
            <h2 className={MARKETING_SECTION_HEADING}>Pick the industry plan that matches how you sell</h2>
            <p className={cn(MARKETING_LEAD, 'mt-4')}>
              Each suite bundles the right hub modules, registration presets, demo storefront, and limit bumps.
              Start on a 14-day trial with your vertical already wired.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            {packages.map((pkg) => {
              const nav = navByKey[pkg.key];
              const Icon = resolveIcon(nav?.icon);
              const tier = PLAN_TIERS[resolvePlanTier(pkg.recommendedPlanTier)];
              const limits = mergePlanLimits(pkg.recommendedPlanTier, pkg.limitOverrides);
              const highlights = (pkg.moduleGroups || []).slice(0, 3).map((m) => m.title);
              const detailHref = pkg.marketingPath || `/solutions/${pkg.slug}`;
              const registerHref = getDomainPackageRegisterHref(pkg.key);
              const demoHref = pkg.demoStoreDomain ? getDemoStoreHref(pkg.demoStoreDomain) : null;

              return (
                <article
                  key={pkg.key}
                  className="group flex flex-col rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50/80 to-white p-6 shadow-sm transition-[box-shadow,border-color] hover:border-brand-primary/25 hover:shadow-md sm:p-7"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-brand">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-neutral-900">{nav?.label || pkg.name}</h3>
                        {pkg.pricing?.badge ? (
                          <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                            {pkg.pricing.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-neutral-600">{pkg.tagline}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-neutral-600">{pkg.summary}</p>

                  <div className="mt-5 flex flex-wrap items-baseline gap-2">
                    <span className={cn(MARKETING_STAT_VALUE, 'text-2xl text-neutral-900')}>
                      {formatCurrency(pkg.pricing?.price_pkr || 0, 'PKR')}
                    </span>
                    <span className="text-sm font-medium text-neutral-500">/ month</span>
                    <span className="text-xs font-medium text-neutral-400">
                      on {tier?.name || pkg.recommendedPlanTier} tier base
                    </span>
                  </div>

                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {highlights.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-sm font-medium text-neutral-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>

                  <ul className="mt-4 flex flex-wrap gap-2">
                    {[
                      `${limits.max_products?.toLocaleString() || '10k+'} products`,
                      `${limits.max_warehouses || 8} warehouses`,
                      `${limits.max_pos_terminals || 6} POS`,
                    ].map((chip) => (
                      <li
                        key={chip}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600"
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button asChild className="font-semibold">
                      <Link href={detailHref}>
                        Explore plan
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="font-semibold">
                      <Link href={registerHref}>Start trial</Link>
                    </Button>
                    {demoHref ? (
                      <Button asChild variant="ghost" className="font-semibold text-neutral-700">
                        <Link href={demoHref} target="_blank" rel="noopener noreferrer">
                          Demo store
                          <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={cn(MARKETING_SECTION, 'border-b border-neutral-200/80 bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <p className={MARKETING_EYEBROW}>How this differs from /pricing</p>
            <h2 className={cn(MARKETING_SECTION_HEADING, 'mt-3 text-2xl sm:text-3xl')}>
              SaaS tiers plus industry depth
            </h2>
            <p className={cn(MARKETING_LEAD, 'mt-4')}>
              Generic plans on the pricing page cover platform limits and module gates. Industry plans add
              vertical storefront templates, registration seed catalogs, module overrides, and limit bumps tuned
              for operators in that sector.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="outline" className="font-semibold">
                <Link href="/pricing">View SaaS pricing</Link>
              </Button>
              <MarketingCtaLink
                href={getBookMeetingHref()}
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-primary-dark"
              >
                Talk to sales
              </MarketingCtaLink>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        variant="centered"
        title="Ready to register with your industry plan?"
        subtitle="Choose a suite above or start on a standard tier and upgrade later from Settings → Billing."
        primaryCTA={{ text: 'Start free trial', href: '/register' }}
        secondaryCTA={{ text: 'Book a meeting', href: getBookMeetingHref() }}
      />
    </MarketingLayout>
  );
}
