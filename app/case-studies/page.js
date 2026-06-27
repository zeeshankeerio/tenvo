'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MARKETING_HONEST_STATS } from '@/lib/marketing/homeVisualThemes';
import {
  MARKETING_CONTAINER,
  MARKETING_H2,
  MARKETING_LEAD,
  MARKETING_STAT_LABEL,
  MARKETING_STAT_VALUE,
} from '@/lib/utils/marketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import CaseStudyCard from '@/components/marketing/cards/CaseStudyCard';
import CTASection from '@/components/marketing/sections/CTASection';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { caseStudies } from '@/lib/marketing/case-studies';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function CaseStudiesPage() {
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique industries
  const industries = ['all', ...new Set(caseStudies.map(cs => cs.industry))];

  // Filter case studies
  const filteredCaseStudies = caseStudies.filter(caseStudy => {
    const matchesIndustry = selectedIndustry === 'all' || caseStudy.industry === selectedIndustry;
    const matchesSearch = searchQuery === '' || 
      caseStudy.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseStudy.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesIndustry && matchesSearch;
  });

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge="Success Stories"
        title={
          <>
            Real Results from <br />
            <span className="text-brand-primary">Real Businesses</span>
          </>
        }
        subtitle="See how businesses across Pakistan are transforming their operations with TENVO. From small startups to large enterprises, discover their success stories."
        primaryCTA={{
          text: 'Start Your Story',
          href: '/register'
        }}
        secondaryCTA={{
          text: 'Book a meeting',
          href: getBookMeetingHref(),
        }}
      />

      {/* Filters and Search */}
      <section className="bg-white py-10 sm:py-14 lg:py-16">
        <div className={MARKETING_CONTAINER}>
          <div className="mb-8 flex flex-col gap-3 sm:mb-10 md:flex-row md:gap-4 lg:mb-12">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                placeholder="Search case studies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-primary focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="w-full md:w-64">
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-brand-primary focus:ring-2 focus:ring-brand-primary"
              >
                {industries.map(industry => (
                  <option key={industry} value={industry}>
                    {industry === 'all' ? 'All Industries' : industry}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-8">
            <p className="text-gray-600">
              Showing {filteredCaseStudies.length} of {caseStudies.length} case studies
            </p>
          </div>

          {/* Case Studies Grid */}
          {filteredCaseStudies.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              {filteredCaseStudies.map((caseStudy) => (
                <CaseStudyCard key={caseStudy.slug} caseStudy={caseStudy} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No case studies found matching your criteria.
              </p>
              <button
                onClick={() => {
                  setSelectedIndustry('all');
                  setSearchQuery('');
                }}
                className="mt-4 text-brand-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Platform scope (honest, not aggregate ROI claims) */}
      <section className="bg-gray-50 py-10 sm:py-14 lg:py-16">
        <div className={MARKETING_CONTAINER}>
          <div className="mb-8 space-y-3 text-center sm:mb-10 lg:mb-12">
            <h2 className={MARKETING_H2}>
              What teams explore on TENVO
            </h2>
            <p className={MARKETING_LEAD}>
              Verifiable platform scope - not unverified aggregate ROI percentages
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {MARKETING_HONEST_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={cn(MARKETING_STAT_VALUE, 'mb-1 text-brand-primary sm:mb-2')}>{stat.value}</div>
                <div className={MARKETING_STAT_LABEL}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection 
        variant="centered"
        title={
          <>
            Ready to Write Your <br />
            Success Story?
          </>
        }
        subtitle="Start your free trial and explore live demo storefronts across verticals"
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register'
        }}
        secondaryCTA={{
          text: 'Book a meeting',
          href: getBookMeetingHref(),
        }}
      />
    </MarketingLayout>
  );
}
