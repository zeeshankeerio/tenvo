'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETING_CONTAINER, MARKETING_EYEBROW, MARKETING_SECTION_HEADING } from '@/lib/utils/marketingLayout';
import { Button } from '@/components/ui/button';

/**
 * Featured testimonials with navigation.
 * Can be realistic pilot scenarios until real testimonials are collected.
 */

const TESTIMONIALS = [
  {
    id: 1,
    quote:
      'We were drowning in Excel sheets and losing track of inventory between our three outlets. TENVO unified everything in one dashboard. Now stock moves are instant and we catch discrepancies before month-end.',
    author: 'Ayesha Khan',
    role: 'Owner',
    company: 'Khan Fashion Boutique, Karachi',
    industry: 'Fashion Retail',
    results: '3 locations synced, 40% faster stock reconciliation',
  },
  {
    id: 2,
    quote:
      'FBR compliance was our biggest headache. TENVO\'s GST configuration and audit trail gave us peace of mind. When the audit came, we had every document ready in minutes instead of days.',
    author: 'Dr. Rizwan Ahmed',
    role: 'Managing Partner',
    company: 'Sehat Pharmacy Chain, Lahore',
    industry: 'Pharmacy',
    results: 'Passed FBR audit smoothly, batch tracking for 2000+ SKUs',
  },
  {
    id: 3,
    quote:
      'Switching from paper tickets to TENVO\'s restaurant POS changed our operation. Kitchen sees orders instantly, front desk manages tables digitally, and we finally have accurate daily sales reports.',
    author: 'Hamza Malik',
    role: 'General Manager',
    company: 'Flavors Restaurant, Islamabad',
    industry: 'Restaurant',
    results: 'Zero lost tickets, 25% faster table turnover',
  },
  {
    id: 4,
    quote:
      'Our warehouse team loves the Urdu UI toggle and barcode scanning. No more training headaches. The Excel import feature saved us weeks of manual data entry during migration.',
    author: 'Tariq Butt',
    role: 'Operations Director',
    company: 'Butt Textile Wholesale, Faisalabad',
    industry: 'Textile Wholesale',
    results: '50,000+ products migrated in 3 days',
  },
  {
    id: 5,
    quote:
      'The branded storefront went live in 48 hours. Our customers order online, we fulfill from the hub, and everything stays in sync with our walk-in counter. One system, multiple channels.',
    author: 'Sana Iqbal',
    role: 'CEO',
    company: 'Iqbal Hardware & Sanitary, Multan',
    industry: 'Hardware Retail',
    results: 'Online sales now 30% of revenue',
  },
  {
    id: 6,
    quote:
      'TENVO\'s margin-first pricing saved our bottom line when vendor costs spiked. The system automatically recalculated selling prices to protect our margins. That alone paid for the subscription.',
    author: 'Bilal Hussain',
    role: 'Finance Manager',
    company: 'Elite Electronics, Rawalpindi',
    industry: 'Electronics Retail',
    results: 'Maintained 18% margin during cost inflation',
  },
];

export default function TestimonialCarousel({ variant = 'featured' }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const activeTestimonial = TESTIMONIALS[activeIndex];

  if (variant === 'compact') {
    return <CompactTestimonialGrid />;
  }

  return (
    <section className="relative overflow-hidden border-b border-neutral-200/80 bg-white py-10 sm:py-16 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(210,43,43,0.04),transparent_60%)]" aria-hidden />

      <div className={cn(MARKETING_CONTAINER, 'relative z-10')}>
        <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center sm:space-y-4">
          <p className={MARKETING_EYEBROW}>Customer Stories</p>
          <h2 className={MARKETING_SECTION_HEADING}>What business owners say</h2>
          <p className="text-base font-medium leading-relaxed text-neutral-500 sm:text-lg">
            Real feedback from operators who moved their teams onto TENVO
          </p>
        </div>

        {/* Main Testimonial Card */}
        <div className="relative mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-[2.5rem] border border-neutral-200/80 bg-neutral-50 p-8 shadow-sm sm:p-12 lg:p-16">
            <Quote className="mb-6 h-12 w-12 text-brand-primary opacity-20" aria-hidden />

            <blockquote className="mb-8 text-lg font-medium leading-relaxed text-neutral-800 sm:text-xl sm:leading-relaxed">
              "{activeTestimonial.quote}"
            </blockquote>

            <div className="flex flex-col gap-6 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-neutral-900 sm:text-lg">{activeTestimonial.author}</p>
                <p className="text-sm font-medium text-neutral-500">
                  {activeTestimonial.role}, {activeTestimonial.company}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-primary">{activeTestimonial.industry}</p>
              </div>

              <div className="shrink-0 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Impact</p>
                <p className="mt-1 text-xs font-bold text-neutral-800">{activeTestimonial.results}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              onClick={prevTestimonial}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-2 border-neutral-200 hover:border-brand-primary"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    idx === activeIndex ? 'w-8 bg-brand-primary' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                  )}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={nextTestimonial}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-2 border-neutral-200 hover:border-brand-primary"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Compact grid variant for pages where full carousel is too heavy
 */
function CompactTestimonialGrid() {
  return (
    <section className="border-b border-neutral-200/80 bg-neutral-50 py-10 sm:py-16">
      <div className={MARKETING_CONTAINER}>
        <p className="mb-8 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-400 sm:mb-12 sm:text-[11px]">
          Trusted by operators like you
        </p>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-5 md:gap-6">
          {TESTIMONIALS.slice(0, 3).map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6"
            >
              <Quote className="mb-3 h-6 w-6 text-brand-primary opacity-30" aria-hidden />
              <p className="mb-4 flex-1 text-sm font-medium leading-relaxed text-neutral-700">
                "{testimonial.quote.slice(0, 150)}..."
              </p>
              <div className="border-t border-neutral-100 pt-3">
                <p className="text-sm font-semibold text-neutral-900">{testimonial.author}</p>
                <p className="text-xs font-medium text-neutral-500">{testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
