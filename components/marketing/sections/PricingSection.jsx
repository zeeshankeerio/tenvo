'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, calculateAnnualSavings } from '@/lib/marketing/pricing';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';

/**
 * PricingSection Component
 * 
 * Displays pricing tiers with feature comparison and billing toggle.
 * Supports monthly/annual billing with discount display.
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.subtitle - Section subtitle
 * @param {Array} props.tiers - Array of pricing tier objects
 * @param {boolean} props.billingToggle - Show monthly/annual toggle
 * @param {number} props.annualDiscount - Annual discount percentage
 * @param {boolean} props.showComparison - Show detailed feature comparison table
 */
export default function PricingSection({
  title,
  subtitle,
  tiers = [],
  billingToggle = true,
  annualDiscount = 20,
  showComparison = false
}) {
  const [mounted, setMounted] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCTAClick = (tier) => {
    trackEvent(EVENTS.CTA_CLICK, {
      cta_location: 'pricing',
      cta_text: tier.ctaText,
      cta_destination: tier.ctaHref,
      pricing_tier: tier.id,
      billing_period: billingPeriod
    });
  };

  // Calculate price based on billing period
  const getDisplayPrice = (tier) => {
    if (tier.price.amount === null) {
      return { amount: null, period: 'month' };
    }

    if (billingPeriod === 'annual' && tier.annualPrice) {
      const monthlyEquivalent = tier.annualPrice.amount / 12;
      return { amount: monthlyEquivalent, period: 'month' };
    }

    return { amount: tier.price.amount, period: tier.price.period };
  };

  return (
    <section className="py-16 lg:py-24 bg-neutral-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Billing toggle */}
        {billingToggle && (
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-neutral-900' : 'text-neutral-500'}`}>
              Monthly
            </span>
            
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                billingPeriod === 'annual' ? 'bg-brand-primary' : 'bg-neutral-300'
              }`}
              aria-label="Toggle billing period"
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  billingPeriod === 'annual' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            
            <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-neutral-900' : 'text-neutral-500'}`}>
              Annual
            </span>
            
            {billingPeriod === 'annual' && (
              <span className="ml-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                Save {annualDiscount}%
              </span>
            )}
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {tiers.map((tier, index) => {
            const displayPrice = getDisplayPrice(tier);
            const isHighlighted = tier.highlighted || tier.popular;
            
            return (
              <div
                key={tier.id}
                className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${
                  isHighlighted
                    ? 'border-brand-primary shadow-2xl scale-105 lg:scale-110'
                    : 'border-neutral-200 hover:border-brand-primary/50 hover:shadow-xl'
                } ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-primary text-white text-sm font-bold rounded-full shadow-lg">
                    {tier.badge || 'Most Popular'}
                  </div>
                )}

                {/* Tier name */}
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  {displayPrice.amount === null ? (
                    <div className="text-3xl font-bold text-neutral-900">
                      Custom Pricing
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-neutral-900">
                          {formatPrice(displayPrice.amount, tier.price.currency)}
                        </span>
                        <span className="text-neutral-600">
                          /{displayPrice.period}
                        </span>
                      </div>
                      
                      {billingPeriod === 'annual' && tier.annualPrice && (
                        <div className="mt-2 text-sm text-green-600 font-medium">
                          Save {formatPrice(calculateAnnualSavings(tier.price.amount), tier.price.currency)} per year
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CTA button */}
                <Button
                  asChild
                  size="lg"
                  className={`w-full mb-6 ${
                    isHighlighted
                      ? 'bg-brand-primary hover:bg-brand-primary-dark text-white'
                      : 'bg-white border-2 border-brand-primary text-brand-primary hover:bg-brand-50'
                  }`}
                  onClick={() => handleCTAClick(tier)}
                >
                  <Link href={tier.ctaHref}>
                    {tier.ctaText}
                  </Link>
                </Button>

                {/* Features list */}
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <LucideIcons.Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-neutral-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <LucideIcons.Shield className="w-5 h-5 text-green-600" />
            <span>No credit card required</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LucideIcons.RefreshCw className="w-5 h-5 text-green-600" />
            <span>Cancel anytime</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LucideIcons.Clock className="w-5 h-5 text-green-600" />
            <span>14-day free trial</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LucideIcons.Headphones className="w-5 h-5 text-green-600" />
            <span>24/7 support</span>
          </div>
        </div>

        {/* Feature comparison table (optional) */}
        {showComparison && (
          <div className="mt-16 max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-neutral-900 text-center mb-8">
              Compare Plans
            </h3>
            
            <div className="bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-4 text-left text-sm font-bold text-neutral-900">
                        Features
                      </th>
                      {tiers.map(tier => (
                        <th key={tier.id} className="px-6 py-4 text-center text-sm font-bold text-neutral-900">
                          {tier.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Extract all unique features */}
                    {Array.from(new Set(tiers.flatMap(t => t.features))).map((feature, index) => (
                      <tr key={index} className="border-b border-neutral-100 last:border-0">
                        <td className="px-6 py-4 text-sm text-neutral-700">
                          {feature}
                        </td>
                        {tiers.map(tier => (
                          <td key={tier.id} className="px-6 py-4 text-center">
                            {tier.features.includes(feature) ? (
                              <LucideIcons.Check className="w-5 h-5 text-green-600 mx-auto" />
                            ) : (
                              <LucideIcons.X className="w-5 h-5 text-neutral-300 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
