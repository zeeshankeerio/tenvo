'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { cn } from '@/lib/utils';

/**
 * Glovida-style editorial category spotlight between product rows.
 */
export function DomainEditorialSpotlight({
  spotlight,
  accent,
  accentDark,
  businessDomain,
  variant = 'default',
}) {
  if (!spotlight) return null;

  const href = spotlight.href || `/store/${businessDomain}/products`;
  const isEditorial = variant === 'editorial';
  const isDark = spotlight.tone === 'dark' || isEditorial;
  const isAccent = spotlight.tone === 'accent' && !isEditorial;

  return (
    <section
      className={cn(
        'mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8',
        isEditorial ? 'py-6 sm:py-8' : 'py-6 sm:py-8'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12',
          isDark ? 'bg-stone-900 text-white' : isAccent ? 'text-white' : 'bg-white border border-slate-100'
        )}
        style={
          isAccent
            ? { background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }
            : undefined
        }
      >
        {spotlight.image ? (
          <div className="absolute inset-0 opacity-20">
            <SmartProductImage src={spotlight.image} alt="" fill className="object-cover" />
          </div>
        ) : null}
        <div className="relative z-10 max-w-xl">
          {spotlight.eyebrow ? (
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark || isAccent ? 'text-white/70' : 'text-slate-500'}`}>
              {spotlight.eyebrow}
            </p>
          ) : null}
          <h2 className={`store-heading text-2xl sm:text-3xl lg:text-4xl mb-3 ${isDark || isAccent ? 'store-heading--inverse' : ''}`}>
            {spotlight.title}
          </h2>
          <p className={`text-sm sm:text-base mb-6 leading-relaxed ${isDark || isAccent ? 'text-white/85' : 'text-slate-600'}`}>
            {spotlight.subtitle}
          </p>
          <Link
            href={href}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-transform hover:scale-[1.02] ${
              isDark || isAccent
                ? 'bg-white text-slate-900'
                : 'text-white'
            }`}
            style={!(isDark || isAccent) ? { backgroundColor: accent } : undefined}
          >
            {spotlight.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
