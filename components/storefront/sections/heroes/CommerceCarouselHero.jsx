'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { HeroCarousel } from './HeroCarousel';

/** Default carousel hero with CTA for general retail domains. */
export function CommerceCarouselHero({ preset, accent, accentDark }) {
  const slide = preset.slides?.[0];
  return (
    <section className="relative">
      <HeroCarousel slides={preset.slides} accent={accent} />
      <div className="absolute bottom-8 left-0 right-0 z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Link
          href={`${preset.base}/products`}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-xl transition hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
        >
          <ShoppingBag className="h-4 w-4" />
          {preset.ctaLabel || 'Shop Now'}
        </Link>
      </div>
    </section>
  );
}
