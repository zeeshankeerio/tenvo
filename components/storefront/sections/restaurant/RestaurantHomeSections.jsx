'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bike,
  Clock,
  Shield,
  UtensilsCrossed,
  Headphones,
  Leaf,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreProductRail } from '@/components/storefront/StoreProductRail';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import {
  getRestaurantConfig,
  partitionRestaurantProducts,
  filterRestaurantByCategorySlug,
  resolveRestaurantCuisineIcons,
  resolveRestaurantCuratedTabs,
  resolveRestaurantSpotlightCards,
  resolveRestaurantTrustPillars,
  formatRestaurantStoreName,
} from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';

const TRUST_ICONS = {
  delivery: Bike,
  fresh: Leaf,
  support: Headphones,
  stock: UtensilsCrossed,
  default: Shield,
};

function SpotlightCardGrid({ cards, displayName, accent }) {
  if (!cards.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group relative flex min-h-[140px] items-end overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:shadow-xl sm:min-h-[168px] lg:min-h-[180px]"
        >
          {card.image ? (
            <SmartProductImage
              src={card.image}
              alt={card.title || ''}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-800" aria-hidden />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10"
            aria-hidden
          />
          <div className="relative z-10 w-full p-3 sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-red-200/80 sm:text-[10px]">
              {displayName}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-white sm:text-base">{card.title}</h3>
            {card.subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-[10px] text-neutral-300 sm:text-xs">{card.subtitle}</p>
            ) : null}
            <span
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold sm:text-xs"
              style={{ color: accent }}
            >
              Order now
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * Tenant-aware elevated restaurant homepage sections (dark premium layout).
 */
export function RestaurantHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  currency = 'PKR',
  accent = '#dc2626',
  base,
  settings = {},
  storeName = '',
  businessDescription = '',
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const config = getRestaurantConfig(settings, businessDomain);
  const { superPicks, deals, combos } = partitionRestaurantProducts(products);
  const cuisineIcons = resolveRestaurantCuisineIcons(settings, storeBase, {
    categories,
    businessDomain,
    products,
    businessCategory,
  });
  const spotlightCards = resolveRestaurantSpotlightCards(
    settings,
    categories,
    businessDomain,
    storeBase
  );
  const trustPillars = config.showTrustStrip !== false
    ? resolveRestaurantTrustPillars(settings, businessDomain).filter((p) => p.id !== 'cashback')
    : [];
  const curatedTabs = resolveRestaurantCuratedTabs(settings, categories);
  const displayName = formatRestaurantStoreName(storeName);
  const featuredTitle = config.featuredRailTitle || 'Featured picks';
  const featuredSubtitle =
    config.featuredRailSubtitle || `Popular dishes from ${displayName}`;
  const businessHours =
    settings?.businessHours || settings?.contact?.businessHours || 'See contact page for hours';
  const panelBg = RESTAURANT_MENU_THEME.panelBg;

  const [activeTab, setActiveTab] = useState(curatedTabs[0]?.id || 'all');
  const activeTabDef = curatedTabs.find((t) => t.id === activeTab) || curatedTabs[0];
  const curatedProducts = activeTabDef
    ? filterRestaurantByCategorySlug(products, activeTabDef.slug).slice(0, 8)
    : [];

  return (
    <>
      {trustPillars.length > 0 && (
        <section className="border-b border-neutral-800 bg-[#0a0a0a] py-3 sm:py-4">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {trustPillars.map((pillar) => {
                const Icon = TRUST_ICONS[pillar.id] || TRUST_ICONS.default;
                return (
                  <div
                    key={pillar.id}
                    className="flex items-center gap-2 rounded-xl border border-neutral-800 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5"
                    style={{ backgroundColor: panelBg }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 sm:h-9 sm:w-9"
                      style={{ color: accent }}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-neutral-100 sm:text-xs">{pillar.label}</p>
                      {pillar.desc ? (
                        <p className="text-[9px] leading-tight text-neutral-500 sm:text-[10px]">{pillar.desc}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {spotlightCards.length > 0 && (
        <section className="bg-[#0a0a0a] py-6 sm:py-8">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className={cn(STORE_SECTION_HEADING, 'text-white')}>Shop by category</h2>
              <Link
                href={productsUrl}
                className="text-xs font-semibold hover:opacity-90"
                style={{ color: accent }}
              >
                Full menu
              </Link>
            </div>
            <SpotlightCardGrid cards={spotlightCards} displayName={displayName} accent={accent} />
          </div>
        </section>
      )}

      {config.showCuisineCarousel !== false && cuisineIcons.length > 0 && (
        <section className="border-t border-neutral-800 bg-[#0a0a0a] pb-6 pt-4 sm:pb-8 sm:pt-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <h2 className={cn(STORE_SECTION_HEADING, 'mb-3 text-white lg:mb-4')}>Browse the menu</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible md:grid-cols-6 lg:grid-cols-8">
              {cuisineIcons.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 sm:w-auto"
                >
                  <div
                    className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-neutral-800 shadow-md transition group-active:scale-[0.97] sm:h-[72px] sm:w-[72px] lg:group-hover:border-neutral-600"
                  >
                    {cat.image ? (
                      <SmartProductImage src={cat.image} alt="" fill className="object-cover" />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-xs font-semibold text-white"
                        style={{ backgroundColor: `${accent}33` }}
                      >
                        {cat.label?.slice(0, 2)?.toUpperCase() || '•'}
                      </div>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />
                  </div>
                  <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-neutral-400 group-hover:text-neutral-200 sm:text-[11px]">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.showSuperPicks !== false && superPicks.length > 0 && (
        <StoreProductRail
          title={featuredTitle}
          subtitle={featuredSubtitle}
          href={`${productsUrl}?sort=featured`}
          linkLabel="View all"
          products={superPicks}
          catalogPool={products}
          businessDomain={businessDomain}
          className="border-t border-neutral-800 bg-[#0a0a0a] [&_h2]:text-white [&_p]:text-neutral-400"
        />
      )}

      {combos.length > 0 && (
        <StoreProductRail
          title="Combos & bundles"
          subtitle="Shareable boxes and value meals"
          href={`${productsUrl}?search=combo`}
          linkLabel="All combos"
          products={combos}
          catalogPool={products}
          businessDomain={businessDomain}
          className="border-t border-neutral-800 bg-[#0a0a0a] [&_h2]:text-white [&_p]:text-neutral-400"
        />
      )}

      {deals.length > 0 && (
        <StoreProductRail
          title="Deals & offers"
          subtitle="Limited-time savings on menu favourites"
          href={`${productsUrl}?onSale=true`}
          linkLabel="All deals"
          products={deals.slice(0, 12)}
          catalogPool={products}
          businessDomain={businessDomain}
          className="border-t border-neutral-800 bg-[#141414] [&_h2]:text-white [&_p]:text-neutral-400"
        />
      )}

      {curatedTabs.length > 0 && (
        <section className="border-t border-neutral-800 bg-[#0a0a0a] py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={cn(STORE_SECTION_HEADING, 'text-white')}>Explore the menu</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {businessDescription?.slice(0, 80) || 'Curated dishes by category'}
                </p>
              </div>
              {curatedTabs.length > 1 && (
                <div className="flex gap-1 overflow-x-auto rounded-full border border-neutral-800 bg-neutral-900 p-1 scrollbar-hide">
                  {curatedTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4',
                        activeTab === tab.id ? 'text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                      )}
                      style={activeTab === tab.id ? { backgroundColor: accent } : undefined}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {curatedProducts.length > 0 ? (
              <ProductGrid products={curatedProducts} businessDomain={businessDomain} density="default" />
            ) : (
              <p className="text-sm text-neutral-500">
                No items in this section yet.{' '}
                <Link href={productsUrl} className="font-semibold hover:underline" style={{ color: accent }}>
                  Browse the full menu
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      {config.showDeliveryInfo !== false && (
        <section className="border-t border-neutral-800 py-8" style={{ backgroundColor: panelBg }}>
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                { icon: Clock, title: 'Opening hours', desc: businessHours },
                { icon: Bike, title: 'Delivery & pickup', desc: 'Order online for delivery or collection' },
                { icon: Shield, title: 'Secure checkout', desc: 'Pay with your preferred method at checkout' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 text-center sm:p-5"
                >
                  <item.icon className="mx-auto h-5 w-5 sm:h-6 sm:w-6" style={{ color: accent }} aria-hidden />
                  <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
