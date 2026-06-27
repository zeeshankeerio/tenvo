'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Sofa } from 'lucide-react';
import { HeroCarousel } from '@/components/storefront/sections/heroes/HeroCarousel';
import { getFurnitureConfig } from '@/lib/storefront/furnitureStorefront';

/**
 * Tenant-aware furniture homepage hero.
 */
export function FurnitureHero({ preset, businessDomain, accent, accentDark, contactCity }) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}`;
  const productsUrl = `${base}/products`;
  const [query, setQuery] = useState('');
  const config = getFurnitureConfig(preset.settings, businessDomain);
  const location = contactCity || config.defaultLocation || 'Your area';
  const quickSearchTerms = preset.quickSearchTerms || [];
  const storeName = preset.storeName || '';

  const search = () => {
    const q = query.trim();
    if (!q) {
      router.push(productsUrl);
      return;
    }
    router.push(`${productsUrl}?search=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative bg-[#faf7f2]">
      <div className="relative bg-stone-950">
        <HeroCarousel
          slides={preset.slides || []}
          accent={accent}
          variant="furniture"
          storeName={storeName}
          minHeight="min-h-[240px] sm:min-h-[320px] lg:min-h-[440px]"
          className="furniture-hero-carousel"
          contentClassName="pb-10 sm:pb-14 lg:pb-20"
        />
      </div>

      {quickSearchTerms.length > 0 && (
        <div className="border-b border-amber-100/80 bg-white px-3 py-3 lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Trending</span>
            {quickSearchTerms.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900 active:scale-[0.98]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-20 mx-auto hidden max-w-[1400px] px-4 sm:px-6 lg:block lg:px-8">
        <div className="-mt-14 lg:-mt-16">
          <div className="rounded-2xl border border-amber-100/90 bg-white p-4 shadow-lg shadow-amber-950/10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900"
                aria-label={`Delivery location: ${location}`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="text-amber-700">{config.locationLabel}</span>
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
                    placeholder={config.searchPlaceholder}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    aria-label="Search furniture"
                  />
                </div>
                <button
                  type="button"
                  onClick={search}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
                >
                  Search
                </button>
              </div>

              <Link
                href={`${base}/contact`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-800/30 px-4 py-2.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
              >
                <Sofa className="h-4 w-4" aria-hidden />
                {config.showroomLabel}
              </Link>
            </div>

            {quickSearchTerms.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Popular</span>
                {quickSearchTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => router.push(`${productsUrl}?search=${encodeURIComponent(term)}`)}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition hover:bg-amber-50 hover:text-amber-900"
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
