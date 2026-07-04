'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, UtensilsCrossed, Bike, ShoppingBag } from 'lucide-react';
import { HeroCarousel } from '@/components/storefront/sections/heroes/HeroCarousel';
import {
  getRestaurantConfig,
  RESTAURANT_ORDER_MODES,
} from '@/lib/storefront/restaurantStorefront';
import { useRestaurantChromeOptional } from '@/components/storefront/restaurant/RestaurantChromeContext';

/**
 * Elevated restaurant hero — tenant-aware carousel, location + search dock.
 */
export function RestaurantHero({ preset, businessDomain, accent, accentDark, contactCity }) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}`;
  const productsUrl = `${base}/products`;
  const [query, setQuery] = useState('');
  const restaurantChrome = useRestaurantChromeOptional();
  const orderMode = restaurantChrome?.orderMode || 'delivery';
  const setOrderMode = restaurantChrome?.setOrderMode;
  const config = getRestaurantConfig(preset.settings, businessDomain);
  const location = contactCity || config.defaultLocation || 'Your area';
  const quickSearchTerms = preset.quickSearchTerms || [];
  const storeName = preset.storeName || '';
  const searchPlaceholder = config.searchPlaceholder || 'Search dishes, categories, or specials…';

  const search = () => {
    const q = query.trim();
    if (!q) {
      router.push(productsUrl);
      return;
    }
    router.push(`${productsUrl}?search=${encodeURIComponent(q)}`);
  };

  const orderModes = config.orderModes || RESTAURANT_ORDER_MODES;

  return (
    <section className="relative bg-[#f2f2f2]">
      <div className="relative bg-violet-950">
        <HeroCarousel
          slides={preset.slides || []}
          accent={accent}
          variant="restaurant"
          storeName={storeName}
          minHeight="min-h-[260px] sm:min-h-[340px] lg:min-h-[460px]"
          className="restaurant-hero-carousel"
          contentClassName="pb-10 sm:pb-14 lg:pb-20"
        />
      </div>

      {quickSearchTerms.length > 0 && (
        <div className="border-b border-violet-100 bg-white px-3 py-3 lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Popular</span>
            {quickSearchTerms.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                className="shrink-0 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-900 active:scale-[0.98]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-20 mx-auto hidden max-w-[1400px] px-4 sm:px-6 lg:block lg:px-8">
        <div className="-mt-14 lg:-mt-16">
          <div className="rounded-2xl border border-violet-100/90 bg-white p-4 shadow-lg shadow-violet-950/10">
            {config.showOrderModes !== false && (
              <div className="mb-3 flex flex-wrap gap-2">
                {orderModes.map((mode) => {
                  const active = orderMode === mode.id;
                  const Icon = mode.icon === 'bike' ? Bike : mode.icon === 'bag' ? ShoppingBag : UtensilsCrossed;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setOrderMode?.(mode.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                        active ? 'text-white' : 'text-stone-800 hover:bg-stone-50'
                      }`}
                      style={
                        active
                          ? { backgroundColor: accent, borderColor: accent }
                          : { borderColor: `${accent}33`, backgroundColor: `${accent}0d` }
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-900"
                aria-label={`Delivery location: ${location}`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="text-violet-700">{config.locationLabel}</span>
                <span className="max-w-[140px] truncate sm:max-w-none">{location}</span>
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    aria-label="Search menu"
                  />
                </div>
                <button
                  type="button"
                  onClick={search}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
                >
                  Find food
                </button>
              </div>

              <Link
                href={`${base}/contact`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 text-xs font-semibold text-violet-900 transition hover:bg-violet-50"
              >
                <UtensilsCrossed className="h-4 w-4" aria-hidden />
                {config.cateringLabel}
              </Link>
            </div>

            {quickSearchTerms.length > 0 && (
              <div className="mt-2.5 hidden flex-wrap items-center gap-1.5 lg:flex">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Popular</span>
                {quickSearchTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition hover:bg-violet-50 hover:text-violet-900"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
