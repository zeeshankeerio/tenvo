'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';

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
      <section className="py-16 lg:py-24 bg-gradient-to-br from-wine-600 to-wine-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`max-w-4xl mx-auto ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className={`flex flex-col gap-6 ${alignmentClasses[alignment]}`}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">{title}</h2>
              {subtitle && <p className="text-lg sm:text-xl text-wine-100 leading-relaxed max-w-2xl">{subtitle}</p>}

              <div className={`flex flex-col sm:flex-row gap-4 ${buttonAlignment[alignment]}`}>
                {primaryCTA && (
                  <Button asChild size="lg" className="bg-white hover:bg-neutral-100 text-wine-600 px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('primary', primaryCTA.href)}>
                    <Link href={primaryCTA.href}>{primaryCTA.text}</Link>
                  </Button>
                )}
                {secondaryCTA && (
                  <Button asChild variant="outline" size="lg" className="border-2 border-white/30 hover:border-white text-white px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('secondary', secondaryCTA.href)}>
                    <Link href={secondaryCTA.href}>{secondaryCTA.text}</Link>
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
    <section className="py-16 lg:py-24 bg-neutral-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`max-w-4xl mx-auto bg-white rounded-2xl border-2 border-neutral-200 p-12 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className={`flex flex-col gap-6 ${alignmentClasses[alignment]}`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900">{title}</h2>
            {subtitle && <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-2xl">{subtitle}</p>}

            <div className={`flex flex-col sm:flex-row gap-4 ${buttonAlignment[alignment]}`}>
              {primaryCTA && (
                <Button asChild size="lg" className="bg-wine-600 hover:bg-wine-700 text-white px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('primary', primaryCTA.href)}>
                  <Link href={primaryCTA.href}>{primaryCTA.text}</Link>
                </Button>
              )}
              {secondaryCTA && (
                <Button asChild variant="outline" size="lg" className="border-2 border-neutral-300 hover:border-wine-600 px-8 py-6 text-lg font-semibold rounded-xl" onClick={() => handleCTAClick('secondary', secondaryCTA.href)}>
                  <Link href={secondaryCTA.href}>{secondaryCTA.text}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
