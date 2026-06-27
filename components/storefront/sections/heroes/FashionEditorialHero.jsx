'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Star } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';

/**
 * Zellbury-style full-bleed editorial hero, left-aligned copy, social proof, dash indicators.
 * @param {{ preset: object; accent: string }} props
 */
export function FashionEditorialHero({ preset, accent }) {
  const router = useRouter();
  const slides = preset.slides || [];
  const [index, setIndex] = useState(0);
  const count = slides.length || 1;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(next, 7000);
    return () => clearInterval(id);
  }, [count, next]);

  const slide = slides[index] || slides[0];

  return (
    <section className="store-hero relative min-h-[100svh] bg-stone-950 lg:min-h-[92vh]">
      {slides.map((s, i) => (
        <div
          key={`${s.image}-${i}`}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000 ease-in-out',
            i === index ? 'opacity-100' : 'opacity-0'
          )}
        >
          <SmartProductImage src={s.image} alt="" fill className="object-cover object-center" priority={i === 0} />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-stone-900/20" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      ))}

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-end px-4 pb-20 pt-24 sm:px-8 sm:pb-24 lg:px-12 lg:pb-28">
        <div className="mx-auto w-full max-w-[1400px]">
          {slide ? (
            <div className="max-w-xl animate-in fade-in duration-500">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 sm:text-xs">, {slide.eyebrow?.replace(/^, \s*/, '') || 'Curated collection'}
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
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-stone-500/35 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm transition hover:bg-stone-500/50 sm:text-xs"
                >
                  {slide.ctaLabel || 'Shop Now'}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {slide.rating ? (
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
