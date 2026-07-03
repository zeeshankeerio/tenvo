'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';

/**
 * Zellbury-style full-bleed editorial hero, left-aligned copy, social proof, dash indicators.
 * Auto-advances (pausing on hover / hidden tab / reduced motion) with manual
 * arrow + dot navigation and touch-swipe support.
 * @param {{ preset: object; accent: string }} props
 */
export function FashionEditorialHero({ preset, accent }) {
  const router = useRouter();
  const slides = preset.slides || [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length || 1;
  const touchStartX = useRef(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      return undefined;
    }
    const id = setInterval(next, 7000);
    return () => clearInterval(id);
  }, [count, next, paused]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = (e.changedTouches?.[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(delta) > 45) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  const slide = slides[index] || slides[0];
  const hideRating = preset.hideRating === true;

  return (
    <section
      className="store-hero relative min-h-[100svh] bg-stone-950 lg:min-h-[92vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {slides.map((s, i) => {
        const active = i === index;
        // Only mount the active slide and its immediate neighbours so the
        // browser never composites 6 full-bleed images at once.
        const near = Math.abs(i - index) <= 1 || (index === 0 && i === count - 1) || (index === count - 1 && i === 0);
        if (!near) return <div key={`${s.image}-${i}`} aria-hidden className="hidden" />;
        return (
          <div
            key={`${s.image}-${i}`}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-in-out',
              active ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden={!active}
          >
            <SmartProductImage src={s.image} alt="" fill className="object-cover object-center" priority={i === 0} />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-stone-900/15" />
          </div>
        );
      })}

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-end px-4 pb-20 pt-24 sm:px-8 sm:pb-24 lg:px-12 lg:pb-28">
        <div className="mx-auto w-full max-w-[1400px]">
          {slide ? (
            <div key={index} className="max-w-xl animate-in fade-in duration-500">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 sm:text-xs">
                {slide.eyebrow?.replace(/^,\s*/, '') || 'Curated collection'}
              </p>
              <h1 className="store-heading store-heading--inverse text-3xl font-semibold leading-[1.1] tracking-wide text-white sm:text-5xl lg:text-[3.25rem]">
                {slide.title}
              </h1>
              {slide.subtitle ? (
                <p className="store-hero-subtitle mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                  {slide.subtitle}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-4 sm:mt-8">
                <button
                  type="button"
                  onClick={() => router.push(slide.ctaHref || preset.base || '/')}
                  className="group inline-flex w-fit items-center gap-2 rounded-md px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-black/20 ring-1 ring-white/15 transition hover:brightness-110 sm:text-xs"
                  style={{ backgroundColor: accent || '#1c1917' }}
                >
                  {slide.ctaLabel || 'Shop Now'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                {slide.rating && !hideRating ? (
                  <div className="flex flex-wrap items-center gap-2 text-white/80">
                    <div className="flex items-center gap-0.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3.5 w-3.5',
                            i < Math.floor(slide.rating) ? 'fill-amber-400 text-amber-400' : 'text-white/30'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm">
                      <span className="font-semibold text-white">{slide.rating}/5</span>
                      {slide.ratingText ? ` ${slide.ratingText}` : null}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 sm:flex lg:left-6"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 sm:flex lg:right-6"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {count > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-8">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'h-0.5 rounded-full transition-all duration-300',
                i === index ? 'w-8 bg-white' : 'w-5 bg-white/35 hover:bg-white/55'
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
