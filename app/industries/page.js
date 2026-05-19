'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import DomainShowcase from '@/components/marketing/sections/DomainShowcase';
import TestimonialsSection from '@/components/marketing/sections/TestimonialsSection';
import CTASection from '@/components/marketing/sections/CTASection';

export default function IndustriesPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge="55+ Industry Verticals"
        title={
          <>
            Purpose-Built Workflows for <br />
            <span className="text-brand-primary">Every Industry</span>
          </>
        }
        subtitle="Pre-configured ERP solutions designed for real operations, real teams, and compliance-sensitive workflows across Pakistan's major sectors."
        primaryCTA={{
          text: 'Find Your Industry',
          href: '#domains'
        }}
        secondaryCTA={{
          text: 'Schedule Demo',
          href: '/demo'
        }}
      />

      {/* Domain Showcase - Full List */}
      <div id="domains">
        <DomainShowcase 
          title="All Industry Verticals"
          subtitle="Choose your industry to see pre-configured features, workflows, and compliance rules"
          showAll={true}
          ctaText="Get Started"
          ctaHref="/register"
        />
      </div>

      {/* Industry Benefits */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.3em]">Industry-Specific Benefits</h2>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">Why Industry Specialization Matters</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              title="Pre-Configured Workflows"
              description="Start with industry best practices already built-in. No need to configure from scratch."
              icon="⚙️"
            />
            <BenefitCard
              title="Compliance Built-In"
              description="Industry-specific regulations and compliance requirements are automatically handled."
              icon="✓"
            />
            <BenefitCard
              title="Faster Implementation"
              description="Go live in days, not months. Pre-built templates and sample data get you started quickly."
              icon="⚡"
            />
            <BenefitCard
              title="Industry Terminology"
              description="Use the language of your industry. Labels, reports, and workflows use familiar terms."
              icon="💬"
            />
            <BenefitCard
              title="Best Practice Reports"
              description="Industry-standard reports and KPIs are ready to use out of the box."
              icon="[CHART]"
            />
            <BenefitCard
              title="Continuous Updates"
              description="Stay current with industry changes. We update compliance rules and best practices regularly."
              icon="🔄"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection 
        variant="grid"
        title="Success Stories Across Industries"
        subtitle="See how businesses in different sectors are thriving with TENVO"
      />

      {/* CTA Section */}
      <CTASection 
        variant="centered"
        title="Ready to Get Started?"
        subtitle="Choose your industry and start your free trial today. No credit card required."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register'
        }}
        secondaryCTA={{
          text: 'Talk to Sales',
          href: '/contact'
        }}
      />
    </MarketingLayout>
  );
}

function BenefitCard({ title, description, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:-translate-y-1 hover:shadow-[0_12px_30px_-10px_rgba(15,23,42,0.08)] transition-all duration-300">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-brand-primary text-2xl">{icon}</div>
      <h4 className="text-xl font-black text-gray-900 mb-3">{title}</h4>
      <p className="text-gray-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}
