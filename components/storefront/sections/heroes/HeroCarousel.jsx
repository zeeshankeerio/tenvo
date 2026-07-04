'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';
import { resolveAutomotiveTileImage } from '@/lib/storefront/storefrontImagePlaceholders';

/**
 * Auto-advancing hero background carousel with manual controls.
 * @param {{ slides: Array<{ title: string; subtitle?: string; image: string; eyebrow?: string; ctaLabel?: string; ctaHref?: string }>; accent: string; className?: string; minHeight?: string; variant?: 'default' | 'luxury' | 'pharmacy' | 'parts' | 'furniture' | 'restaurant'; contentClassName?: string; storeName?: string }} props
 */
export function HeroCarousel({ slides = [], accent, className, minHeight = 'min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]', variant = 'default', contentClassName, storeName = '' }) {
  const [index, setIndex] = useState(0);
  const count = slides.length || 1;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [count, next]);

  const slide = slides[index] || slides[0];
  const isLuxury = variant === 'luxury';
  const isPharmacy = variant === 'pharmacy';
  const isFurniture = variant === 'furniture';
  const isRestaurant = variant === 'restaurant';
  const isParts = variant === 'parts';
  const slideAccent = slide?.accent || accent;

  return (
    <div className={cn('store-hero relative overflow-hidden', isParts ? 'bg-neutral-950' : 'bg-slate-900', minHeight, className)}>
      {slides.map((s, i) => (
        <div
          key={s.image + i}
          className={cn(
            'absolute inset-0 transition-opacity duration-700 ease-in-out',
            i === index ? 'opacity-100 z-0' : 'opacity-0 z-0'
          )}
        >
          <SmartProductImage
            src={s.image}
            alt=""
            fill
            className="object-cover"
            priority={i === 0}
            fallbackSrc={resolveAutomotiveTileImage(s.title || String(i))}
          />
          <div
            className={cn(
              'absolute inset-0',
              isLuxury
                ? 'bg-gradient-to-t from-stone-950/95 via-stone-950/55 to-stone-900/25'
                : isPharmacy
                  ? 'bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-emerald-900/45'
                  : isFurniture
                    ? 'bg-gradient-to-r from-stone-950/95 via-amber-950/75 to-amber-900/40'
                    : isRestaurant
                      ? 'bg-gradient-to-r from-neutral-950/95 via-red-950/75 to-neutral-900/35'
                      : isParts
                      ? 'bg-gradient-to-t from-black/85 via-black/45 to-black/15'
                      : 'bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-900/55'
            )}
          />
          <div
            className={cn(
              'absolute inset-0',
              isLuxury ? 'bg-black/15' : isPharmacy ? 'bg-black/20' : isFurniture ? 'bg-black/18' : isRestaurant ? 'bg-black/20' : isParts ? 'bg-black/10' : 'bg-black/25'
            )}
          />
          {isParts ? (
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 20%, ${s.accent || accent || '#cd232a'}33, transparent 45%)`,
              }}
              aria-hidden
            />
          ) : null}
        </div>
      ))}

      <div
        className={cn(
          'relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16',
          (isLuxury || isParts) && 'items-center text-center',
          contentClassName
        )}
      >
        {slide ? (
          <div className={cn('max-w-xl', (isLuxury || isParts) && 'max-w-2xl')}>
            <p
              className={cn(
                'store-hero-eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm',
                isPharmacy && 'text-emerald-300',
                isFurniture && 'text-amber-200',
                isRestaurant && 'text-red-200/90',
                (isLuxury || isParts) && 'text-white/90'
              )}
              style={(isLuxury || isParts) && slideAccent ? { color: slideAccent } : undefined}
            >
              {slide.eyebrow || (isLuxury ? 'Curated collection' : isPharmacy ? (storeName || 'Pharmacy') : isFurniture ? (storeName || 'Furniture') : isRestaurant ? (storeName || 'Restaurant') : isParts ? 'Auto parts' : 'Welcome')}
            </p>
            <h1
              className={cn(
                'font-semibold leading-tight',
                isParts ? 'text-white' : 'text-white',
                isLuxury
                  ? 'store-heading store-heading--inverse text-3xl tracking-wide sm:text-5xl lg:text-6xl'
                  : isPharmacy
                    ? 'text-2xl tracking-tight sm:text-[2rem] lg:text-4xl'
                    : isFurniture
                      ? 'text-2xl tracking-tight sm:text-[2rem] lg:text-4xl'
                      : isRestaurant
                        ? 'text-2xl tracking-tight sm:text-[2rem] lg:text-4xl'
                        : isParts
                      ? 'store-heading store-heading--inverse text-2xl tracking-tight sm:text-4xl lg:text-[2.85rem]'
                      : 'store-heading store-heading--inverse text-2xl tracking-tight sm:text-4xl lg:text-[2.75rem]'
              )}
            >
              {slide.title}
            </h1>
            {slide.subtitle ? (
              <p
                className={cn(
                  'store-hero-subtitle mt-3 text-sm leading-relaxed sm:text-base lg:text-lg',
                  isParts ? 'mx-auto max-w-xl text-white/85' : 'text-white/90',
                  isLuxury && 'mx-auto max-w-xl'
                )}
              >
                {slide.subtitle}
              </p>
            ) : null}
            {slide.ctaLabel && slide.ctaHref ? (
              <Link
                href={slide.ctaHref}
                className={cn(
                  'mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-95 sm:px-7',
                  isPharmacy ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-400' : isFurniture ? 'bg-amber-800 text-white shadow-lg shadow-amber-950/30 hover:bg-amber-700' : 'text-white shadow-lg',
                  isParts && 'hover:shadow-xl motion-safe:hover:scale-[1.02]'
                )}
                style={!isPharmacy && !isFurniture ? { backgroundColor: slideAccent || accent } : undefined}
              >
                {slide.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className={cn(
              'absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur-sm transition sm:left-4',
              isParts
                ? 'left-2 border border-white/25 bg-black/35 text-white hover:bg-black/50 sm:left-4'
                : 'border border-white/20 bg-black/30 text-white hover:bg-black/50 left-2 sm:left-4',
              isPharmacy && 'hidden sm:flex'
            )}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className={cn(
              'absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur-sm transition sm:right-4',
              isParts
                ? 'right-2 border border-white/25 bg-black/35 text-white hover:bg-black/50 sm:right-4'
                : 'border border-white/20 bg-black/30 text-white hover:bg-black/50 right-2 sm:right-4',
              isPharmacy && 'hidden sm:flex'
            )}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index
                    ? cn('w-6', isParts ? 'bg-white' : 'bg-white')
                    : cn('w-1.5', isParts ? 'bg-white/40 hover:bg-white/70' : 'bg-white/40 hover:bg-white/70')
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
