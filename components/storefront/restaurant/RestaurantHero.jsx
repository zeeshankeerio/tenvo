'use client';

import { HeroCarousel } from '@/components/storefront/sections/heroes/HeroCarousel';
import { formatRestaurantStoreName } from '@/lib/storefront/restaurantStorefront';

/**
 * Elevated restaurant hero — cinematic food carousel (actions live in site header).
 */
export function RestaurantHero({ preset, businessDomain, accent, accentDark, contactCity }) {
  const storeName = preset.storeName || formatRestaurantStoreName('');
  const slides = preset.slides || [];

  return (
    <section className="relative bg-[#0a0a0a]" data-restaurant-hero>
      <HeroCarousel
        slides={slides}
        accent={accent}
        accentDark={accentDark}
        variant="restaurant"
        storeName={storeName}
        minHeight="min-h-[220px] sm:min-h-[300px] lg:min-h-[380px]"
        className="restaurant-hero-carousel"
        contentClassName="pb-8 sm:pb-10 lg:pb-12"
      />
    </section>
  );
}
