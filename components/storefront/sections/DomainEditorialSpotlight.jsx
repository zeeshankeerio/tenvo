'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import {
  resolveEditorialSpotlightFallback,
  resolveSpotlightBannerImage,
} from '@/lib/storefront/storefrontImagePlaceholders';
import { cn } from '@/lib/utils';

/**
 * Glovida-style editorial category spotlight between product rows.
 * Always uses a full-bleed background image with gradient overlay for a premium banner look.
 */
export function DomainEditorialSpotlight({
  spotlight,
  accent,
  accentDark,
  businessDomain,
  variant = 'default',
  canonical,
}) {
  if (!spotlight) return null;

  const href = spotlight.href || `/store/${businessDomain}/products`;
  const isEditorial = variant === 'editorial';
  const isLight = spotlight.tone === 'light';
  const isAccent = spotlight.tone === 'accent' && !isEditorial;

  const imageSrc = resolveSpotlightBannerImage(spotlight, canonical, 0);
  const fallbackSrc = resolveEditorialSpotlightFallback(spotlight.id, canonical, 1);
  const useLightText = isLight ? false : true;

  return (
    <section
      className={cn(
        'mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8',
        isEditorial ? 'py-6 sm:py-8' : 'py-6 sm:py-8'
      )}
    >
      <div
        className={cn(
          'group relative isolate overflow-hidden rounded-3xl bg-neutral-900',
          'min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]'
        )}
      >
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <SmartProductImage
            src={imageSrc}
            alt=""
            fill
            priority={isEditorial}
            className="object-cover transition duration-[8000ms] ease-out motion-safe:group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 1400px"
            fallbackSrc={fallbackSrc}
          />
          <div
            className={cn(
              'absolute inset-0',
              isLight
                ? 'bg-gradient-to-r from-white/95 via-white/82 to-white/45'
                : isAccent
                  ? 'bg-gradient-to-r from-black/82 via-black/48 to-black/15'
                  : isEditorial
                    ? 'bg-gradient-to-r from-stone-950/88 via-stone-950/42 to-stone-900/10'
                    : 'bg-gradient-to-r from-black/82 via-black/48 to-black/12'
            )}
          />
          {!isLight ? (
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl transition group-hover:opacity-45"
              style={{ backgroundColor: isAccent ? accent : accentDark || accent }}
            />
          ) : null}
        </div>

        <div className="relative z-10 flex min-h-[220px] flex-col justify-center p-6 sm:min-h-[280px] sm:p-10 lg:min-h-[320px] lg:p-12">
          <div className="max-w-xl">
            {spotlight.eyebrow ? (
              <p
                className={cn(
                  'mb-2 text-xs font-bold uppercase tracking-widest',
                  useLightText ? 'text-white/75' : 'text-slate-500'
                )}
              >
                {spotlight.eyebrow}
              </p>
            ) : null}
            <h2
              className={cn(
                'store-heading mb-3 text-2xl sm:text-3xl lg:text-4xl',
                useLightText ? 'store-heading--inverse text-white' : ''
              )}
            >
              {spotlight.title}
            </h2>
            <p
              className={cn(
                'mb-6 max-w-lg text-sm leading-relaxed sm:text-base',
                useLightText ? 'text-white/85' : 'text-slate-600'
              )}
            >
              {spotlight.subtitle}
            </p>
            <Link
              href={href}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 text-sm font-bold transition-transform hover:scale-[1.02]',
                isEditorial
                  ? 'rounded-full bg-white text-stone-900 shadow-lg hover:bg-white/95'
                  : useLightText
                    ? 'rounded-xl bg-white text-slate-900 shadow-lg'
                    : 'rounded-xl text-white shadow-md'
              )}
              style={!useLightText && !isEditorial ? { backgroundColor: accent } : undefined}
            >
              {spotlight.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
