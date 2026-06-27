'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { CheckCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import Hero from '@/components/marketing/sections/Hero';
import { DemoRequestForm } from '@/components/marketing/forms/DemoRequestForm';
import { DemoStoreGallery } from '@/components/marketing/sections/DemoStoreGallery';
import HomeTrustStrip from '@/components/marketing/sections/HomeTrustStrip';
import TestimonialsSection from '@/components/marketing/sections/TestimonialsSection';
import { TrustBadges } from '@/components/marketing/ui/TrustBadges';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { Button } from '@/components/ui/button';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { MARKETING_HONEST_STATS } from '@/lib/marketing/homeVisualThemes';
import {
  MARKETING_CONTAINER,
  MARKETING_H2,
  MARKETING_H3,
  MARKETING_LEAD,
  MARKETING_STAT_LABEL,
  MARKETING_STAT_VALUE,
} from '@/lib/utils/marketingLayout';

export default function DemoPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge="Schedule a Demo"
        title={
          <>
            See TENVO in <br />
            <span className="text-brand-primary">Action</span>
          </>
        }
        subtitle="Get a personalized demo tailored to your industry and business needs. See how TENVO can transform your operations."
        primaryCTA={{
          text: 'Pick a time',
          href: getBookMeetingHref(),
        }}
        secondaryCTA={{
          text: 'Request callback',
          href: '#demo-form',
        }}
      />

      <DemoStoreGallery variant="featured" />

      <HomeTrustStrip />

      <section className="border-b border-neutral-200/80 bg-brand-50/40 py-8 sm:py-10">
        <div className={`${MARKETING_CONTAINER} flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left`}>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">Instant scheduling</p>
            <h2 className="text-lg font-semibold text-neutral-900 sm:text-xl">Book a 30-minute walkthrough</h2>
            <p className="text-sm text-neutral-600">
              Choose a slot that works for you. We tailor the session to your vertical and rollout goals.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 rounded-xl bg-brand-primary px-6 font-semibold text-white hover:bg-brand-primary-dark">
            <MarketingCtaLink href={getBookMeetingHref()} className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" aria-hidden />
              Open scheduler
            </MarketingCtaLink>
          </Button>
        </div>
      </section>

      {/* Demo Form and Benefits */}
      <section id="demo-form" className="bg-white py-10 sm:py-14 lg:py-16">
        <div className={MARKETING_CONTAINER}>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="min-w-0">
              <h2 className={cn(MARKETING_H2, 'mb-3 sm:mb-4')}>
                Request Your Demo
              </h2>
              <p className={cn(MARKETING_LEAD, 'mb-6 sm:mb-8')}>
                Fill out the form and our team will contact you within 24 hours to schedule your personalized demo.
              </p>
              <DemoRequestForm />
            </div>

            <div className="min-w-0 space-y-6 sm:space-y-8">
              <div>
                <h2 className={cn(MARKETING_H2, 'mb-3 sm:mb-4')}>
                  What to Expect
                </h2>
                <p className={MARKETING_LEAD}>
                  Your demo will be customized to your specific needs
                </p>
              </div>

              <div className="space-y-4">
                <BenefitItem text="30-minute personalized walkthrough" />
                <BenefitItem text="Industry-specific use cases and examples" />
                <BenefitItem text="Live Q&A with our product experts" />
                <BenefitItem text="Custom pricing based on your requirements" />
                <BenefitItem text="Implementation timeline and support options" />
                <BenefitItem text="Free trial access after the demo" />
              </div>

              {/* Trust Badges */}
              <div className="pt-6">
                <h3 className={cn(MARKETING_H3, 'mb-3')}>
                  Trusted &amp; Compliant
                </h3>
                <TrustBadges variant="vertical" />
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-6 sm:p-7">
                <h3 className={cn(MARKETING_H3, 'mb-5')}>
                  What you can explore today
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {MARKETING_HONEST_STATS.map((stat) => (
                    <div key={stat.label}>
                      <div className={cn(MARKETING_STAT_VALUE, 'mb-1 text-brand-primary')}>{stat.value}</div>
                      <div className={MARKETING_STAT_LABEL}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-10 sm:py-14 lg:py-16">
        <TestimonialsSection 
          variant="grid"
          title="What Our Customers Say"
          subtitle="See why businesses trust TENVO for their operations"
        />
      </section>

      {/* FAQ */}
      <section className="bg-white py-10 sm:py-14 lg:py-16">
        <div className={`${MARKETING_CONTAINER} max-w-4xl`}>
          <div className="mb-8 space-y-3 text-center sm:mb-10 sm:space-y-4 lg:mb-12">
            <h2 className={MARKETING_H2}>
              Demo FAQs
            </h2>
            <p className={MARKETING_LEAD}>
              Common questions about our demo process
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <FAQItem
              question="How long does the demo take?"
              answer="Our standard demo is 30 minutes, but we can adjust based on your needs. We'll cover the features most relevant to your industry and answer all your questions."
            />
            <FAQItem
              question="Is the demo really free?"
              answer="Yes, absolutely! There's no cost or obligation. We want you to see how TENVO can help your business before making any commitment."
            />
            <FAQItem
              question="Can I try TENVO after the demo?"
              answer="Yes! After the demo, we'll provide you with free trial access so you can explore TENVO at your own pace."
            />
            <FAQItem
              question="What should I prepare for the demo?"
              answer="Just come with your questions! It helps if you can share some details about your current processes and pain points, but it's not required."
            />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function BenefitItem({ text }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-6 h-6 text-brand-primary flex-shrink-0 mt-0.5" />
      <span className="text-gray-700 font-medium">{text}</span>
    </div>
  );
}

function FAQItem({ question, answer }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
      <h3 className={cn(MARKETING_H3, 'mb-2')}>{question}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{answer}</p>
    </div>
  );
}
