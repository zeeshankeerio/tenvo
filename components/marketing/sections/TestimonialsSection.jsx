'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { testimonials as defaultTestimonials } from '@/lib/marketing/testimonials';
import { cn } from '@/lib/utils';

/**
 * Resolves layout from `layout` or legacy `variant` prop (e.g. industries page used variant="grid").
 */
function resolveLayout(layout, variant) {
  const candidates = [layout, variant].filter(Boolean);
  for (const c of candidates) {
    if (c === 'carousel' || c === 'featured' || c === 'grid') return c;
  }
  return 'grid';
}

function StarRating({ rating, className }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating)) || 0));
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${n} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]',
            i < n ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial,
  showRatings,
  showIndustry,
  isLarge = false,
}) {
  const rating =
    typeof testimonial.rating === 'number' && testimonial.rating > 0 ? testimonial.rating : showRatings ? 5 : 0;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm transition-all duration-300',
        'hover:border-brand-200 hover:shadow-md sm:p-7',
        isLarge && 'sm:p-10 lg:p-12'
      )}
    >
      {/* Top bar: stars + decorative quote - same for every card */}
      <header className="relative z-10 mb-4 flex min-h-[1.75rem] items-start justify-between gap-3 sm:mb-5">
        <div className="min-w-0 flex-1 pt-0.5">
          {showRatings && rating > 0 ? <StarRating rating={rating} /> : null}
        </div>
        <Quote
          className="h-9 w-9 shrink-0 text-brand-primary/[0.12] sm:h-11 sm:w-11"
          strokeWidth={1.25}
          aria-hidden="true"
        />
      </header>

      <blockquote
        className={cn(
          'relative z-10 mb-6 min-h-0 flex-1 text-pretty font-medium italic leading-relaxed text-neutral-700',
          isLarge ? 'text-lg sm:text-xl' : 'text-base sm:text-[1.0625rem]'
        )}
      >
        <span className="text-neutral-400 not-italic" aria-hidden="true">
          &ldquo;
        </span>
        {testimonial.quote}
        <span className="text-neutral-400 not-italic" aria-hidden="true">
          &rdquo;
        </span>
      </blockquote>

      <footer className="mt-auto border-t border-neutral-100 pt-4 sm:pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {testimonial.avatar ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-2 ring-white">
                <Image
                  src={testimonial.avatar}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-neutral-900 sm:text-base">{testimonial.author}</p>
              <p className="truncate text-xs font-medium leading-snug text-neutral-600 sm:text-sm">
                <span className="text-neutral-500">{testimonial.role}</span>
                <span className="text-neutral-400"> · </span>
                <span>{testimonial.company}</span>
              </p>
            </div>
          </div>

          {showIndustry && testimonial.industry ? (
            <div className="flex shrink-0 sm:items-center sm:justify-end">
              <span
                className="inline-block max-w-full truncate rounded-full bg-brand-50 px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-primary-dark ring-1 ring-brand-primary/10 sm:max-w-[12.5rem] sm:text-xs sm:normal-case sm:tracking-normal"
                title={testimonial.industry}
              >
                {testimonial.industry}
              </span>
            </div>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

/**
 * TestimonialsSection - grid, carousel, or featured layouts.
 *
 * @param {'grid'|'carousel'|'featured'} [layout] - primary layout prop
 * @param {'grid'|'carousel'|'featured'} [variant] - legacy alias (e.g. variant="grid")
 */
export default function TestimonialsSection({
  title,
  subtitle,
  testimonials,
  layout: layoutProp = 'grid',
  variant,
  showRatings = true,
  showIndustry = true,
}) {
  const layout = resolveLayout(layoutProp, variant);
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonialsData = testimonials || defaultTestimonials;

  useEffect(() => {
    if (layout === 'carousel' && testimonialsData.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonialsData.length);
      }, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [layout, testimonialsData.length]);

  if (layout === 'grid') {
    return (
      <section className="bg-neutral-50 py-14 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14 lg:mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-3 text-pretty text-base font-medium leading-relaxed text-neutral-600 sm:mt-4 sm:text-lg">
                {subtitle}
              </p>
            ) : null}
          </div>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8 xl:gap-10">
            {testimonialsData.map((testimonial) => (
              <li key={testimonial.id} className="flex min-h-0">
                <TestimonialCard testimonial={testimonial} showRatings={showRatings} showIndustry={showIndustry} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (layout === 'carousel') {
    const currentTestimonial = testimonialsData[currentIndex];

    return (
      <section className="bg-brand-50 py-14 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14 lg:mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-3 text-pretty text-base font-medium leading-relaxed text-neutral-600 sm:mt-4 sm:text-lg">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="mx-auto max-w-4xl">
            {currentTestimonial ? (
              <TestimonialCard
                testimonial={currentTestimonial}
                showRatings={showRatings}
                showIndustry={showIndustry}
                isLarge
              />
            ) : null}

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev - 1 + testimonialsData.length) % testimonialsData.length)
                }
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-neutral-200 bg-white transition-all hover:border-brand-primary hover:bg-brand-50"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-6 w-6 text-neutral-600" aria-hidden />
              </button>

              <div className="flex gap-2">
                {testimonialsData.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      index === currentIndex ? 'w-8 bg-brand-primary' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                    )}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % testimonialsData.length)}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-neutral-200 bg-white transition-all hover:border-brand-primary hover:bg-brand-50"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-6 w-6 text-neutral-600" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'featured') {
    const [featured, ...others] = testimonialsData;

    return (
      <section className="bg-white py-14 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14 lg:mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-3 text-pretty text-base font-medium leading-relaxed text-neutral-600 sm:mt-4 sm:text-lg">
                {subtitle}
              </p>
            ) : null}
          </div>

          {featured ? (
            <div className="mx-auto mb-10 max-w-4xl sm:mb-12">
              <TestimonialCard testimonial={featured} showRatings={showRatings} showIndustry={showIndustry} isLarge />
            </div>
          ) : null}

          {others.length > 0 ? (
            <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              {others.map((testimonial) => (
                <li key={testimonial.id} className="flex min-h-0">
                  <TestimonialCard testimonial={testimonial} showRatings={showRatings} showIndustry={showIndustry} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}
