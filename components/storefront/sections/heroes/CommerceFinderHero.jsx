'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Heart, Leaf, Thermometer, Activity, Baby, Sparkles, ShoppingBag, Phone, Headphones, ArrowRight } from 'lucide-react';
import { HeroCarousel } from './HeroCarousel';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { getLuxuryTileImage } from '@/lib/storefront/luxuryFashion';
import { cn } from '@/lib/utils';

const ICONS = { heart: Heart, leaf: Leaf, thermometer: Thermometer, activity: Activity, baby: Baby, sparkles: Sparkles, phone: Phone, headphones: Headphones, star: Sparkles, tag: Sparkles, package: Sparkles, gift: Sparkles };

export function PharmacyFinderHero({ preset, businessDomain, accent, accentDark }) {
  const router = useRouter();
  const base = `/store/${businessDomain}/products`;
  const [query, setQuery] = useState('');
  const searchPlaceholder = preset.searchPlaceholder || 'Search medicines, vitamins, brands…';
  const trendingTerms = preset.trendingTerms || ['Panadol', 'Probiotics', 'Vitamin C', 'Cold & flu'];

  const search = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`${base}?search=${encodeURIComponent(q)}`);
  };

  return (
    <section className="relative bg-slate-50 pb-6">
      <HeroCarousel slides={preset.slides} accent={accent} minHeight="min-h-[240px] sm:min-h-[320px] lg:min-h-[380px]" />

      <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 sm:-mt-16">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6">
            <p className="mb-3 text-sm font-bold text-slate-800">What are you looking for?</p>
            <div className="flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-100"
              />
              <button
                type="button"
                onClick={search}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {trendingTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => router.push(`${base}?search=${encodeURIComponent(term)}`)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {preset.categoryShortcuts?.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
              {preset.categoryShortcuts.map((cat) => {
                const Icon = ICONS[cat.icon] || Leaf;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        cat.href || `${base}?category=${encodeURIComponent(cat.slug)}`
                      )
                    }
                    className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}18`, color: accent }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-center text-[10px] font-bold text-slate-700 sm:text-xs">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function FashionFinderHero({ preset, businessDomain, accent, accentDark }) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}`;
  const isLuxury = Boolean(preset.luxury);
  const luxuryVariant = preset.luxuryVariant;

  const tiles = preset.tiles || [
    { label: 'New In', href: `${base}/products?sort=newest`, desc: 'Latest drops' },
    { label: 'Sale', href: `${base}/products?onSale=true`, desc: 'Up to 50% off' },
    { label: 'Mens', href: `${base}/products`, desc: 'Shirts & more' },
    { label: 'Women', href: `${base}/products`, desc: 'Dresses & tops' },
  ];

  const trustPills = preset.trustPills || [];

  if (isLuxury) {
    return (
      <section className="relative bg-stone-100 pb-8 sm:pb-10">
        <HeroCarousel
          slides={preset.slides}
          accent={accent}
          variant="luxury"
          minHeight="min-h-[320px] sm:min-h-[440px] lg:min-h-[520px]"
        />

        <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="-mt-16 sm:-mt-24">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {tiles.map((t) => {
                const tileImage = luxuryVariant ? getLuxuryTileImage(luxuryVariant, t.label) : null;
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => router.push(t.href)}
                    className={cn(
                      'group relative overflow-hidden rounded-sm border border-stone-200/80 text-left shadow-md transition duration-300',
                      'hover:-translate-y-0.5 hover:shadow-xl',
                      tileImage ? 'aspect-[4/5] min-h-[120px] sm:min-h-[160px]' : 'bg-white p-4 sm:p-5'
                    )}
                  >
                    {tileImage ? (
                      <>
                        <SmartProductImage
                          src={tileImage}
                          alt=""
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/10" />
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                          <p className="text-sm font-semibold tracking-wide text-white sm:text-base">{t.label}</p>
                          <p className="mt-0.5 text-[10px] text-white/75 sm:text-xs">{t.desc}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold tracking-wide text-stone-900 sm:text-base">{t.label}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{t.desc}</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {trustPills.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {trustPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600 backdrop-blur-sm sm:text-xs"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => router.push(`${base}/products`)}
                className="inline-flex items-center gap-2 rounded-sm px-8 py-3 text-sm font-semibold tracking-wide text-white transition hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                <ShoppingBag className="h-4 w-4" />
                View entire collection
              </button>
              <button
                type="button"
                onClick={() => router.push(`${base}/contact`)}
                className="inline-flex items-center gap-2 rounded-sm border border-stone-300 bg-white px-6 py-3 text-sm font-semibold tracking-wide text-stone-800 transition hover:border-stone-400"
              >
                Book consultation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-slate-50 pb-6">
      <HeroCarousel slides={preset.slides} accent={accent} />

      <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-14 sm:-mt-20">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {tiles.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => router.push(t.href)}
                className={cn(
                  'rounded-xl border border-slate-100 bg-white p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5'
                )}
              >
                <p className="text-sm font-extrabold text-slate-900 sm:text-base">{t.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.push(`${base}/products`)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white sm:hidden"
            style={{ backgroundColor: accent }}
          >
            <ShoppingBag className="h-4 w-4" />
            Shop all
          </button>
        </div>
      </div>
    </section>
  );
}

export function GroceryFinderHero({ preset, businessDomain, accent }) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}/products`;

  return (
    <section className="relative bg-slate-50 pb-4">
      <HeroCarousel slides={preset.slides} accent={accent} minHeight="min-h-[220px] sm:min-h-[300px]" />
      <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-10 grid grid-cols-3 gap-2 sm:-mt-14 sm:grid-cols-6 sm:gap-3">
          {preset.categoryShortcuts?.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
            router.push(cat.href || `${base}?category=${encodeURIComponent(cat.slug)}`)
          }
              className="rounded-xl border border-slate-100 bg-white px-2 py-3 text-center text-xs font-bold text-slate-800 shadow-md hover:shadow-lg sm:py-4 sm:text-sm"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RestaurantFinderHero({ preset, businessDomain, accent, accentDark }) {
  const router = useRouter();
  const base = preset.base || `/store/${businessDomain}/products`;

  return (
    <section className="relative bg-slate-50 pb-6">
      <HeroCarousel
        slides={preset.slides}
        accent={accent}
        minHeight="min-h-[240px] sm:min-h-[320px] lg:min-h-[380px]"
      />
      <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 sm:-mt-16">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6">
            <p className="mb-3 text-sm font-bold text-slate-800">What would you like to order?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {preset.categoryShortcuts?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    router.push(cat.href || `${base}?category=${encodeURIComponent(cat.slug)}`)
                  }
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-md"
                >
                  <p className="text-sm font-extrabold text-slate-900">{cat.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Browse menu</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push(base)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
            >
              <ShoppingBag className="h-4 w-4" />
              View full menu
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
