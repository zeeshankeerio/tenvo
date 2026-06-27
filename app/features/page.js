'use client';

import Link from 'next/link';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import FeaturesGrid from '@/components/marketing/sections/FeaturesGrid';
import OperationsFlow from '@/components/marketing/sections/OperationsFlow';
import CommerceAndIntelligenceSection from '@/components/marketing/sections/CommerceAndIntelligenceSection';
import HomeSecurityTrustSection from '@/components/marketing/sections/HomeSecurityTrustSection';
import CTASection from '@/components/marketing/sections/CTASection';
import MarketingFeatureCard from '@/components/marketing/ui/MarketingFeatureCard';
import { FEATURE_PAGE_CARDS } from '@/lib/marketing/homeVisualThemes';
import { marketingContent } from '@/lib/marketing/content';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_LEAD,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge="Enterprise Capabilities"
        title={
          <>
            Everything You Need to <br />
            <span className="text-brand-primary">Run Your Business</span>
          </>
        }
        subtitle="Storefront, POS, warehouses, accounting, and Pakistan-ready compliance in one platform - so operators are not paying for a patchwork of global apps that were never designed together."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register',
        }}
        secondaryCTA={{
          text: 'Why TENVO vs others',
          href: '/why-tenvo',
        }}
      />

      <div id="integrations" className="scroll-mt-28">
        <FeaturesGrid
          variant="grid"
          title="Core ERP Capabilities"
          subtitle="Integrated modules that work together seamlessly"
          features={marketingContent.features}
        />

        <OperationsFlow />
      </div>

      <CommerceAndIntelligenceSection variant="compact" />

      <section className="bg-white py-10 sm:py-16 lg:py-24">
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto mb-8 max-w-3xl space-y-3 text-center sm:mb-12 sm:space-y-4">
            <p className={MARKETING_EYEBROW}>Advanced Features</p>
            <h2 className={MARKETING_SECTION_HEADING}>Built for Scale</h2>
            <p className={MARKETING_LEAD}>
              Enterprise-grade features that grow with your business
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {FEATURE_PAGE_CARDS.map((card) => (
              <MarketingFeatureCard
                key={card.id}
                id={card.id}
                title={card.title}
                description={card.description}
                features={card.features}
                heroImage={card.heroImage}
                demoHref={card.href}
                demoLabel={card.demoLabel}
                accent={card.accent}
              />
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-2xl text-center text-sm font-medium text-gray-500">
            See how TENVO compares to stitched storefront and suite stacks for business buyers on{' '}
            <Link href="/why-tenvo" className="font-semibold text-brand-primary hover:underline">
              Why TENVO
            </Link>
            .
          </p>
        </div>
      </section>

      <HomeSecurityTrustSection />

      <CTASection
        variant="split"
        title="Ready to Transform Your Business?"
        subtitle="Join growing teams using TENVO to streamline inventory, sales, and finance in one workspace."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register',
        }}
        secondaryCTA={{
          text: 'View Pricing',
          href: '/pricing',
        }}
      />
    </MarketingLayout>
  );
}
