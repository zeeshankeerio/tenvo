'use client';

import * as LucideIcons from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { VERTICAL_COUNT } from '@/lib/marketing/capabilities';
import { INDUSTRY_PAGE_BENEFITS } from '@/lib/marketing/homeVisualThemes';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import DomainShowcase from '@/components/marketing/sections/DomainShowcase';
import IndustrySolutionsSection from '@/components/marketing/sections/IndustrySolutionsSection';
import TestimonialsSection from '@/components/marketing/sections/TestimonialsSection';
import CTASection from '@/components/marketing/sections/CTASection';
import MarketingBenefitCard from '@/components/marketing/ui/MarketingBenefitCard';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';

export default function IndustriesPage() {
  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge={`${VERTICAL_COUNT} Industry Verticals`}
        title={
          <>
            Industry presets for <br />
            <span className="text-brand-primary">real operations</span>
          </>
        }
        subtitle="Each vertical configures dashboards, units, seed templates, and intelligence defaults - not a separate product fork. Pick your category at registration and refine in the hub."
        primaryCTA={{
          text: 'Find Your Industry',
          href: '#domains',
        }}
        secondaryCTA={{
          text: 'Book a meeting',
          href: getBookMeetingHref(),
        }}
      />

      <div id="domains">
        <DomainShowcase
          title="All Industry Verticals"
          subtitle="Choose your industry to see pre-configured features, workflows, and compliance rules"
          showAll={true}
          ctaText="Get Started"
          ctaHref="/register"
        />
      </div>

      <IndustrySolutionsSection />

      <section className="bg-transparent py-10 sm:py-16 lg:py-24">
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto mb-8 max-w-3xl space-y-3 text-center sm:mb-12 lg:mb-16 sm:space-y-4">
            <p className={MARKETING_EYEBROW}>Industry-Specific Benefits</p>
            <h2 className={MARKETING_SECTION_HEADING}>Why Industry Specialization Matters</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 sm:gap-6 md:gap-8">
            {INDUSTRY_PAGE_BENEFITS.map((item) => {
              const Icon = LucideIcons[item.icon];
              return (
                <MarketingBenefitCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  icon={Icon}
                  accent={item.accent}
                />
              );
            })}
          </div>
        </div>
      </section>

      <TestimonialsSection
        variant="grid"
        title="Success Stories Across Industries"
        subtitle="See how businesses in different sectors are thriving with TENVO"
      />

      <CTASection
        variant="centered"
        title="Ready to Get Started?"
        subtitle="Choose your industry and start your free trial today. No credit card required."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register',
        }}
        secondaryCTA={{
          text: 'Book a meeting',
          href: getBookMeetingHref(),
        }}
      />
    </MarketingLayout>
  );
}
