'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Car,
  CarFront,
  Croissant,
  Gem,
  Pill,
  Scissors,
  Shirt,
  ShoppingBasket,
  Sofa,
  Store,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import MarketingSection from '@/components/marketing/layout/MarketingSection';
import {
  getHeroDemoGalleryItems,
  HERO_EXCLUDED_DEMO_DOMAINS,
} from '@/lib/marketing/demoStoreGalleryMeta';
import { CLIENT_DEMO_STORES } from '@/lib/marketing/demoStores';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  shirt: Shirt,
  gem: Gem,
  'utensils-crossed': UtensilsCrossed,
  pill: Pill,
  'shopping-basket': ShoppingBasket,
  wrench: Wrench,
  croissant: Croissant,
  scissors: Scissors,
  sofa: Sofa,
  car: Car,
  'car-front': CarFront,
  store: Store,
};

const FADE_MS = 700;
const HOLD_MS = 5200;

/**
 * @param {ReturnType<typeof getHeroDemoGalleryItems>[number]} store
 */
function StoreIconBadge({ store, className }) {
  const Icon = ICON_MAP[store.icon] || Store;
  if (store.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={store.logo}
        alt=""
        className={cn('h-8 w-8 object-contain', className)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <Icon
      className={cn('h-5 w-5', className)}
      strokeWidth={1.75}
      aria-hidden
      style={{ color: store.glowGradient }}
    />
  );
}

/**
 * @param {{
 *   store: ReturnType<typeof getHeroDemoGalleryItems>[number];
 *   active: boolean;
 *   priority?: boolean;
 * }} props
 */
function StoreSlide({ store, active, priority = false }) {
  const [imgSrc, setImgSrc] = useState(store.heroImage);

  useEffect(() => {
    setImgSrc(store.heroImage);
  }, [store.heroImage]);

  const fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=85&auto=format&fit=crop';

  return (
    <div
      className={cn(
        'absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none',
        active ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={!active}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        className="h-full w-full object-cover object-center"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => {
          if (imgSrc !== fallbackImage) setImgSrc(fallbackImage);
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white from-25% via-white/55 via-50% to-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex flex-col gap-5 px-5 pb-28 pt-16 sm:px-10 sm:pb-32 lg:px-14 lg:pb-36',
          'sm:flex-row sm:items-end sm:justify-between'
        )}
      >
        <div className="flex min-w-0 max-w-3xl gap-4 sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/90 bg-white/95 shadow-lg sm:h-14 sm:w-14">
            <StoreIconBadge store={store} />
          </div>
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              {store.vertical}
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
              {store.name}
            </h3>
            <p className="line-clamp-2 text-sm font-medium leading-relaxed text-neutral-600 sm:line-clamp-3 sm:text-base lg:text-lg">
              {store.description}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {store.city || store.country}
              {store.tier === 'full' ? ' · Full hub demo' : ''}
            </p>
          </div>
        </div>

        <Link
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={active ? 0 : -1}
          className={cn(
            'inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-full',
            'border border-neutral-300/90 bg-white/85 px-6 py-3 text-sm font-semibold text-neutral-900',
            'shadow-md backdrop-blur-md transition-all',
            'hover:border-neutral-400 hover:bg-white hover:shadow-lg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2'
          )}
        >
          Visit store
          <ArrowUpRight className="h-4 w-4 text-neutral-500" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/**
 * @param {{ stores: ReturnType<typeof getHeroDemoGalleryItems> }} props
 */
function FullScreenStoreShowcase({ stores }) {
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % stores.length);
  }, [stores.length]);

  useEffect(() => {
    if (stores.length <= 1) return undefined;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return undefined;

    const interval = setInterval(advance, HOLD_MS);
    return () => clearInterval(interval);
  }, [advance, stores.length]);

  if (!stores.length) return null;

  return (
    <div className="relative h-full w-full">
      {stores.map((store, i) => (
        <StoreSlide key={store.domain} store={store} active={i === index} priority={i === 0} />
      ))}

      <div
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-4 border-t border-white/60 bg-white/70 px-4 py-4 backdrop-blur-md sm:py-5"
        role="tablist"
        aria-label="Demo storefront slides"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {stores.map((store, i) => (
            <button
              key={store.domain}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${store.name}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-8 bg-brand-primary' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              )}
            />
          ))}
        </div>
        <p className="text-center text-xs font-medium text-neutral-500">
          {index + 1} / {stores.length} live demo storefronts
        </p>
      </div>
    </div>
  );
}

/**
 * Full-viewport light hero — edge-to-edge store imagery cycling all ready demos.
 * @param {{ stores: ReturnType<typeof getHeroDemoGalleryItems> }} props
 */
function DemoStoreHeroGallery({ stores }) {
  if (stores.length === 0) return null;

  return (
    <section
      aria-label="Live demo storefronts"
      className="relative h-svh w-full overflow-hidden border-y border-slate-200/80 bg-slate-100"
    >
      <FullScreenStoreShowcase stores={stores} />
    </section>
  );
}

/**
 * Live demo storefront gallery.
 * @param {{ variant?: 'hero' | 'featured' | 'all' }} props
 */
export function DemoStoreGallery({ variant = 'hero' }) {
  const heroItems = getHeroDemoGalleryItems();
  const isHero = variant === 'hero' || variant === 'featured';

  if (isHero) {
    return <DemoStoreHeroGallery stores={heroItems} />;
  }

  const stores = CLIENT_DEMO_STORES.filter((store) => !HERO_EXCLUDED_DEMO_DOMAINS.has(store.domain));

  return (
    <MarketingSection padding="loose" className="border-y border-slate-200/80 bg-slate-50">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <Link
            key={store.domain}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 motion-safe:hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-primary">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 group-hover:text-brand-primary">{store.name}</p>
              <p className="text-xs text-gray-500">{store.country}</p>
              <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{store.href}</p>
            </div>
          </Link>
        ))}
      </div>
    </MarketingSection>
  );
}
