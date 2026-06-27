'use client';

import Link from 'next/link';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, Building2, Globe2, Shield, Users } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_H3,
  MARKETING_LEAD,
  MARKETING_SECTION,
} from '@/lib/utils/marketingLayout';
import { WHY_TENVO_COMPARE } from '@/lib/marketing/homeVisualThemes';
import { getDemoStoreHeroByDomain } from '@/lib/marketing/demoStoreGalleryMeta';
import { cn } from '@/lib/utils';
import Hero from '@/components/marketing/sections/Hero';
import CommerceAndIntelligenceSection from '@/components/marketing/sections/CommerceAndIntelligenceSection';
import CompetitorComparisonSection from '@/components/marketing/sections/CompetitorComparisonSection';
import CTASection from '@/components/marketing/sections/CTASection';
import MarketingPillarCard from '@/components/marketing/ui/MarketingPillarCard';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { Button } from '@/components/ui/button';

const HERO_IMAGE = getDemoStoreHeroByDomain('demo-supermarket');

export default function WhyTenvoPage() {
  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge="For operators who outgrew patchwork tools"
        title={
          <>
            One intelligent platform for{' '}
            <span className="text-brand-primary">how you actually run the business</span>
          </>
        }
        subtitle="TENVO brings your storefront, checkout, warehouse, accounting, and local compliance into one calm workspace - so small teams move fast and large teams stay audit-ready without paying for a dozen disconnected products."
        primaryCTA={{ text: 'Start free', href: '/register' }}
        secondaryCTA={{ text: 'Book a meeting', href: getBookMeetingHref() }}
      />

      <section className={cn(MARKETING_SECTION, 'border-b border-neutral-200/80 bg-white')}>
        <div className={cn(MARKETING_CONTAINER, 'grid items-center gap-8 lg:grid-cols-2 lg:gap-12')}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 shadow-xl sm:rounded-[2rem]">
            {HERO_IMAGE ? (
              <Image
                src={HERO_IMAGE}
                alt="TENVO supermarket demo storefront"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : null}
          </div>
          <div className="space-y-5 sm:space-y-6">
            <p className={MARKETING_EYEBROW}>Small to enterprise</p>
            <h2 className={MARKETING_H3}>
              From a single outlet to a national footprint - same product philosophy.
            </h2>
            <p className={MARKETING_LEAD}>
              Solo founders get sensible defaults and fast setup. Growing brands get multi-location control,
              role-based access, and clear handoffs between sales, warehouse, and finance. Larger groups get the
              rigor they expect around traceability, tax posture, and operational reporting - without forcing IT
              projects every quarter.
            </p>
            <ul className="space-y-4">
              {[
                { icon: Users, t: 'Roles that match real jobs', d: 'Cashier, warehouse, accountant, and owner - each sees what they need, nothing extra.' },
                { icon: Building2, t: 'Scales with your entity structure', d: 'Multiple brands or branches under one disciplined operating model.' },
                { icon: Shield, t: 'Compliance as a daily habit', d: 'Local tax configuration and audit-friendly ledgers are part of the workflow - live FBR IRIS sync is on the roadmap.' },
                { icon: Globe2, t: 'Commerce without chaos', d: 'Branded storefront, POS, and B2B documents share one product catalog and customer record - marketplace connectors are roadmap; see Integrations.' },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t}</p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-500">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CommerceAndIntelligenceSection variant="homepage" />

      <section className={cn(MARKETING_SECTION, 'border-b border-neutral-200/80 bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mb-8 max-w-3xl sm:mb-10 lg:mb-12">
            <p className={MARKETING_EYEBROW}>Compared to stitched-together stacks</p>
            <h2 className={cn(MARKETING_H3, 'mt-2')}>
              Why &apos;good enough&apos; tools quietly tax your margin.
            </h2>
            <p className={cn(MARKETING_LEAD, 'mt-4')}>
              When your storefront, inventory, and ledger do not agree, you pay twice: once in lost sales or
              penalties, and again in staff time fixing spreadsheets. TENVO is opinionated about keeping those
              worlds connected so leadership can trust the numbers on Tuesday morning - not only after month-end.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-5 md:gap-6">
            {WHY_TENVO_COMPARE.map((pillar) => {
              const Icon = LucideIcons[pillar.icon];
              return (
                <MarketingPillarCard
                  key={pillar.id}
                  title={pillar.title}
                  body={pillar.body}
                  icon={Icon}
                  accent={pillar.accent}
                />
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" className="rounded-xl border-2 font-semibold">
              <Link href="/pricing" className="inline-flex items-center gap-2">
                View plans <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <CompetitorComparisonSection />

      <CTASection
        variant="split"
        title="Ready to simplify how you sell and operate?"
        subtitle="Bring your team onto one platform built for Pakistani realities - and keep your ambition global."
        primaryCTA={{ text: 'Create your workspace', href: '/register' }}
        secondaryCTA={{ text: 'Book a meeting', href: getBookMeetingHref() }}
      />
    </MarketingLayout>
  );
}
