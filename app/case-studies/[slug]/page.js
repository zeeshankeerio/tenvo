'use client';

import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import CTASection from '@/components/marketing/sections/CTASection';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import CaseStudyCard from '@/components/marketing/cards/CaseStudyCard';
import { caseStudies } from '@/lib/marketing/case-studies';
import { useParams } from 'next/navigation';
import { CheckCircle, TrendingUp, Clock, DollarSign } from 'lucide-react';
import Image from 'next/image';

export default function CaseStudyDetailPage() {
  const params = useParams();
  const slug = params.slug;

  // Find the case study
  const caseStudy = caseStudies.find(cs => cs.slug === slug);

  if (!caseStudy) {
    return (
      <MarketingLayout>
        <div className="py-24 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Case Study Not Found</h1>
          <p className="text-gray-600 mb-8">The case study you're looking for doesn't exist.</p>
          <a href="/case-studies" className="text-brand-primary hover:underline">
            View all case studies
          </a>
        </div>
      </MarketingLayout>
    );
  }

  // Get related case studies (same industry, excluding current)
  const relatedCaseStudies = caseStudies
    .filter(cs => cs.industry === caseStudy.industry && cs.slug !== slug)
    .slice(0, 3);

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="py-20 bg-brand-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-block px-4 py-2 bg-brand-100 text-brand-primary-dark rounded-full text-sm font-semibold mb-6">
            {caseStudy.industry}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {caseStudy.company}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {caseStudy.summary}
          </p>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {caseStudy.results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-bold text-brand-primary mb-1">
                  {result.metric}
                </div>
                <div className="text-sm text-gray-600">{result.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Image */}
      {caseStudy.heroImage && (
        <section className="py-8 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={caseStudy.heroImage}
                alt={caseStudy.company}
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1024px"
                priority
              />
            </div>
          </div>
        </section>
      )}

      {/* Challenge Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">The Challenge</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 leading-relaxed">
              {caseStudy.challenge || `${caseStudy.company} was facing significant operational challenges that were impacting their growth and efficiency. They needed a comprehensive solution that could streamline their processes and provide real-time visibility into their operations.`}
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">The Solution</h2>
          <div className="prose prose-lg max-w-none mb-8">
            <p className="text-gray-600 leading-relaxed">
              {caseStudy.solution || `${caseStudy.company} implemented TENVO's comprehensive ERP solution, which provided them with integrated inventory management, financial tracking, and compliance tools specifically designed for the ${caseStudy.industry} industry.`}
            </p>
          </div>

          {/* Key Features Used */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Key Features Implemented</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(caseStudy.features || [
                'Real-time Inventory Tracking',
                'Automated Financial Reporting',
                'FBR Compliance Tools',
                'Multi-location Management',
                'Custom Dashboards',
                'Mobile Access'
              ]).map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">The Results</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {caseStudy.results.map((result, index) => (
              <ResultCard key={index} result={result} />
            ))}
          </div>

          {/* Testimonial */}
          {caseStudy.testimonial && (
            <div className="bg-brand-50 rounded-2xl p-8 border-l-4 border-brand-primary">
              <p className="text-lg text-gray-700 italic mb-4">
                "{caseStudy.testimonial.quote}"
              </p>
              <div className="flex items-center gap-4">
                {caseStudy.testimonial.avatar && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-brand-primary/20">
                    <Image
                      src={caseStudy.testimonial.avatar}
                      alt={caseStudy.testimonial.author}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                )}
                <div>
                  <div className="font-bold text-gray-900">{caseStudy.testimonial.author}</div>
                  <div className="text-sm text-gray-600">{caseStudy.testimonial.role}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Case Studies */}
      {relatedCaseStudies.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Success Stories</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedCaseStudies.map((cs) => (
                <CaseStudyCard key={cs.slug} caseStudy={cs} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <CTASection 
        variant="centered"
        title={
          <>
            Ready to Achieve <br />
            Similar Results?
          </>
        }
        subtitle="See how TENVO can transform your business operations"
        primaryCTA={{
          text: 'Book a meeting',
          href: getBookMeetingHref(),
        }}
        secondaryCTA={{
          text: 'Start Free Trial',
          href: '/register'
        }}
      />
    </MarketingLayout>
  );
}

function ResultCard({ result }) {
  const getIcon = (label) => {
    if (label.toLowerCase().includes('cost') || label.toLowerCase().includes('revenue')) {
      return <DollarSign className="w-6 h-6" />;
    }
    if (label.toLowerCase().includes('time')) {
      return <Clock className="w-6 h-6" />;
    }
    return <TrendingUp className="w-6 h-6" />;
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <div className="text-brand-primary mb-3">
        {getIcon(result.label)}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">
        {result.metric}
      </div>
      <div className="text-gray-600">{result.label}</div>
    </div>
  );
}
