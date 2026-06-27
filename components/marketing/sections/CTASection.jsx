'use client';

import { useState, useEffect } from 'react';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';
import { cn } from '@/lib/utils';
import {
  MARKETING_CONTAINER,
  MARKETING_H2,
  MARKETING_LEAD,
  MARKETING_SECTION,
  MARKETING_SECTION_LOOSE,
} from '@/lib/utils/marketingLayout';

/**
 * CTASection Component
 * 
 * Reusable call-to-action section with multiple variants.
 * 
 * @param {Object} props
 * @param {string} props.title - CTA title
 * @param {string} props.subtitle - CTA subtitle
 * @param {Object} props.primaryCTA - Primary button config
 * @param {Object} props.secondaryCTA - Secondary button config
 * @param {string} props.variant - Visual variant
 * @param {string} props.alignment - Text alignment
 */
export default function CTASection({
  title,
  subtitle,
  primaryCTA,
  secondaryCTA = null,
  variant = 'default',
  alignment = 'center'
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCTAClick = (ctaType, href) => {
    trackEvent(EVENTS.CTA_CLICK, {
      cta_location: 'cta_section',
      cta_text: ctaType === 'primary' ? primaryCTA.text : secondaryCTA?.text,
      cta_destination: href
    });
  };

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  };

  const buttonAlignment = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  if (variant === 'gradient') {
    return (
      <section className={cn(MARKETING_SECTION_LOOSE, 'relative overflow-hidden bg-brand-primary text-white')}>
        <div className="pointer-events-none absolute top-0 right-0 hidden h-96 w-96 rounded-full bg-white/10 blur-3xl sm:block" />
        <div className="pointer-events-none absolute bottom-0 left-0 hidden h-96 w-96 rounded-full bg-white/10 blur-3xl sm:block" />

        <div className={MARKETING_CONTAINER}>
          <div className={`mx-auto max-w-4xl ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className={`flex flex-col gap-4 sm:gap-6 ${alignmentClasses[alignment]}`}>
              <h2 className={cn(MARKETING_H2, 'text-white')}>{title}</h2>
              {subtitle ? <p className={cn(MARKETING_LEAD, 'max-w-2xl text-brand-100')}>{subtitle}</p> : null}

              <div className={`flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:gap-4 ${buttonAlignment[alignment]}`}>
                {primaryCTA && (
                  <Button asChild size="lg" className="bg-white hover:bg-neutral-100 text-brand-primary px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('primary', primaryCTA.href)}>
                    <MarketingCtaLink href={primaryCTA.href}>{primaryCTA.text}</MarketingCtaLink>
                  </Button>
                )}
                {secondaryCTA && (
                  <Button asChild variant="outline" size="lg" className="border-2 border-white/30 hover:border-white text-white px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('secondary', secondaryCTA.href)}>
                    <MarketingCtaLink href={secondaryCTA.href}>{secondaryCTA.text}</MarketingCtaLink>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn(MARKETING_SECTION_LOOSE, 'bg-neutral-50')}>
      <div className={MARKETING_CONTAINER}>
        <div className={`mx-auto max-w-4xl rounded-2xl border-2 border-neutral-200 bg-white p-6 sm:p-8 lg:p-12 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className={`flex flex-col gap-4 sm:gap-6 ${alignmentClasses[alignment]}`}>
            <h2 className={MARKETING_H2}>{title}</h2>
            {subtitle ? <p className={cn(MARKETING_LEAD, 'max-w-2xl')}>{subtitle}</p> : null}

            <div className={`flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:gap-4 ${buttonAlignment[alignment]}`}>
              {primaryCTA && (
                <Button asChild size="lg" className="bg-brand-primary hover:bg-brand-primary-dark text-white px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('primary', primaryCTA.href)}>
                  <MarketingCtaLink href={primaryCTA.href}>{primaryCTA.text}</MarketingCtaLink>
                </Button>
              )}
              {secondaryCTA && (
                <Button asChild variant="outline" size="lg" className="border-2 border-neutral-300 hover:border-brand-primary px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('secondary', secondaryCTA.href)}>
                  <MarketingCtaLink href={secondaryCTA.href}>{secondaryCTA.text}</MarketingCtaLink>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
