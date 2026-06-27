'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';
import { cn } from '@/lib/utils';
import {
  MARKETING_CONTAINER,
  MARKETING_CONTAINER_NARROW,
  MARKETING_EYEBROW,
  MARKETING_H1,
  MARKETING_LEAD,
} from '@/lib/utils/marketingLayout';

/**
 * Hero Component
 * 
 * Above-the-fold section with value proposition and primary CTA.
 * Supports multiple variants for different page layouts.
 * 
 * @param {Object} props
 * @param {string} props.headline - Main headline text
 * @param {string} props.subheadline - Supporting text below headline
 * @param {Object} props.primaryCTA - Primary call-to-action button
 * @param {Object} props.secondaryCTA - Secondary call-to-action button
 * @param {Array} props.stats - Trust indicators/stats to display
 * @param {string} props.heroImage - Path to hero image
 * @param {string} props.heroImageAlt - Alt text for hero image
 * @param {string} props.variant - Layout variant: 'default' | 'centered' | 'split'
 * @param {Object} props.badge - Optional badge to display above headline
 */
export default function Hero({
  headline,
  subheadline,
  // Also accept alternate prop names used by pages
  title,
  subtitle,
  primaryCTA,
  secondaryCTA,
  stats = [],
  heroImage,
  heroImageAlt,
  // Also accept alternate prop names
  image,
  imageAlt,
  variant = 'default',
  badge = null
}) {
  // Normalize props - support both naming conventions
  const headlineText = headline || title;
  const subheadlineText = subheadline || subtitle;
  const heroImageSrc = heroImage || image;
  const heroImageAltText = heroImageAlt || imageAlt || '';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCTAClick = (ctaType, href) => {
    trackEvent(EVENTS.CTA_CLICK, {
      cta_location: 'hero',
      cta_text: ctaType === 'primary' ? primaryCTA?.text : secondaryCTA?.text,
      cta_destination: href
    });
  };

  // Render badge if provided (supports string or object)
  const renderBadge = () => {
    if (!badge) return null;
    
    const badgeText = typeof badge === 'string' ? badge : badge.text;
    const BadgeIcon = (typeof badge === 'object' && badge.icon) ? LucideIcons[badge.icon] : null;
    
    return (
      <div className={cn('mb-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-2 shadow-sm min-[400px]:px-4', MARKETING_EYEBROW)}>
        {BadgeIcon && <BadgeIcon className="h-4 w-4 shrink-0" aria-hidden />}
        <span className="min-w-0 text-balance leading-snug">{badgeText}</span>
      </div>
    );
  };

  // Render stats bar
  const renderStats = () => {
    if (!stats || stats.length === 0) return null;

    return (
      <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-6 mt-6 sm:flex sm:flex-wrap sm:gap-8 sm:pt-8 sm:mt-8">
        {stats.map((stat, index) => {
          const StatIcon = stat.icon ? LucideIcons[stat.icon] : null;
          
          return (
            <div key={index} className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
              {StatIcon && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 shadow-sm sm:h-10 sm:w-10">
                  <StatIcon className="h-4 w-4 text-slate-600 sm:h-5 sm:w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-lg font-bold text-neutral-900 sm:text-2xl">{stat.value}</div>
                <div className="text-xs text-neutral-600 sm:text-sm">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render CTA buttons - tracking on Link ensures clicks are captured with asChild/Slot
  const renderCTAs = () => (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
      {primaryCTA && (
        <Button
          asChild
          size="lg"
          className="group relative h-12 min-h-[48px] w-full min-w-0 overflow-hidden rounded-xl border border-black/[0.06] bg-brand-primary px-5 text-[0.9375rem] font-semibold tracking-tight text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_32px_-8px_rgba(210,43,43,0.45)] transition-[transform,box-shadow,background-color] duration-200 hover:bg-brand-primary-dark hover:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_16px_40px_-8px_rgba(210,43,43,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:scale-[0.99] motion-safe:sm:hover:-translate-y-px sm:h-[3.25rem] sm:w-auto sm:min-w-[10rem] sm:px-8 sm:text-sm sm:font-bold"
        >
          <MarketingCtaLink
            href={primaryCTA.href}
            className="relative z-[1] inline-flex w-full items-center justify-center gap-2 text-center"
            onClick={() => handleCTAClick('primary', primaryCTA.href)}
          >
            {primaryCTA.text}
            <LucideIcons.ArrowRight className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden />
          </MarketingCtaLink>
        </Button>
      )}

      {secondaryCTA && (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="group relative h-12 min-h-[48px] w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-5 text-[0.9375rem] font-semibold tracking-tight text-neutral-900 shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_6px_20px_-8px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-[transform,box-shadow,border-color,color] duration-200 hover:border-neutral-300 hover:bg-neutral-50/90 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/80 focus-visible:ring-offset-2 active:scale-[0.99] motion-safe:sm:hover:-translate-y-px sm:h-[3.25rem] sm:w-auto sm:min-w-[10rem] sm:border-neutral-200 sm:px-8 sm:text-sm sm:font-bold"
        >
          <MarketingCtaLink
            href={secondaryCTA.href}
            className="inline-flex w-full items-center justify-center text-center"
            onClick={() => handleCTAClick('secondary', secondaryCTA.href)}
          >
            {secondaryCTA.text}
          </MarketingCtaLink>
        </Button>
      )}
    </div>
  );

  // Default variant: Split layout with text left, image right
  if (variant === 'default') {
    return (
      <section className="relative overflow-x-clip bg-slate-50 border-b border-slate-200/50">
        {/* Decorative blurs - toned down on small viewports to avoid bleed */}
        <div className="pointer-events-none absolute top-0 right-0 hidden h-[28rem] w-[28rem] rounded-full bg-brand-primary/10 blur-3xl sm:block md:h-[32rem] md:w-[32rem] md:animate-pulse" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[22rem] w-[22rem] rounded-full bg-brand-secondary/10 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 blur-3xl md:block md:h-[50rem] md:w-[50rem]" />
        
        <div className={cn('relative mx-auto min-w-0 py-10 sm:py-14 lg:py-24', MARKETING_CONTAINER)}>
          <div className="grid min-w-0 grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            {/* Text content */}
            <div className={`min-w-0 max-w-full space-y-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              {renderBadge()}
              
              <h1 className={MARKETING_H1}>
                {typeof headlineText === 'string' 
                  ? headlineText.split(' ').map((word, index) => {
                      const highlightWords = ['Pakistan', 'Intelligent', 'Operating'];
                      if (highlightWords.some(hw => word.includes(hw))) {
                        return <span key={index} className="text-brand-primary">{word}{' '}</span>;
                      }
                      return <span key={index}>{word} </span>;
                    })
                  : headlineText
                }
              </h1>
              
              <p className={cn('max-w-2xl', MARKETING_LEAD)}>
                {subheadlineText}
              </p>
              
              {renderCTAs()}
              
              {renderStats()}
            </div>
 
            {/* Hero image with enhanced styling */}
            {heroImageSrc && (
              <div className={`relative min-w-0 max-w-full ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
                <div className="relative mx-auto aspect-[4/3] w-full max-w-[min(36rem,100%)] overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.35)] group lg:mx-0">
                  <Image
                    src={heroImageSrc}
                    alt={heroImageAltText}
                    fill
                    priority
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  
                  {/* Floating UI elements overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/20 to-transparent" />
                </div>
                
                {/* Enhanced decorative elements */}
                <div className="pointer-events-none absolute -right-2 -top-2 hidden h-20 w-20 rounded-[1.75rem] bg-gradient-to-br from-brand-primary to-brand-primary-dark opacity-30 blur-xl sm:block md:-right-4 md:-top-4 md:h-24 md:w-24 md:animate-pulse" />
                <div className="pointer-events-none absolute -bottom-2 -left-2 hidden h-24 w-24 rounded-[1.75rem] bg-gradient-to-tr from-brand-secondary to-brand-primary opacity-20 blur-xl sm:block md:-bottom-4 md:-left-4 md:h-32 md:w-32" />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Centered variant: Centered text with light themed standard hero matching pricing page
  if (variant === 'centered') {
    return (
      <section className="relative overflow-x-clip border-b border-neutral-200/80 bg-white py-10 sm:py-14 lg:py-24">
        <div className={cn('relative mx-auto min-w-0 space-y-6 text-center sm:space-y-8', MARKETING_CONTAINER_NARROW)}>
          <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'} space-y-5 sm:space-y-6`}>
            {renderBadge()}
            
            <h1 className={cn('mx-auto max-w-4xl', MARKETING_H1)}>
              {headlineText}
            </h1>
            
            <p className={cn('mx-auto max-w-2xl', MARKETING_LEAD)}>
              {subheadlineText}
            </p>
            
            <div className="flex w-full min-w-0 flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4 sm:pt-4">
              {renderCTAs()}
            </div>
            
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-8 mt-8 sm:flex sm:flex-wrap sm:justify-center sm:gap-8 sm:pt-12 sm:mt-12">
                {stats.map((stat, index) => {
                  const StatIcon = stat.icon ? LucideIcons[stat.icon] : null;
                  
                  return (
                    <div key={index} className="text-center">
                      {StatIcon && (
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 shadow-sm">
                          <StatIcon className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <div className="text-3xl font-bold text-neutral-900">{stat.value}</div>
                      <div className="text-sm text-neutral-500 mt-1">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Split variant: 50/50 split with equal emphasis
  if (variant === 'split') {
    return (
      <section className="relative overflow-hidden bg-white">
        <div className="grid lg:grid-cols-2 min-h-[600px]">
          {/* Text content */}
          <div className="flex items-center bg-slate-50">
            <div className={`container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 space-y-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              {renderBadge()}
              
              <h1 className={MARKETING_H1}>
                {headlineText}
              </h1>
              
              <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
                {subheadlineText}
              </p>
              
              {renderCTAs()}
              
              {renderStats()}
            </div>
          </div>

          {/* Hero image */}
          {heroImageSrc && (
            <div className={`relative ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
              <Image
                src={heroImageSrc}
                alt={heroImageAltText}
                fill
                priority
                className="object-cover"
                sizes="50vw"
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
}
