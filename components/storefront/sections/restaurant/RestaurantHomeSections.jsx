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
  resolveRestaurantUpperPromoTiles,
  formatRestaurantStoreName,
} from '@/lib/storefront/restaurantStorefront';
import { RESTAURANT_MENU_THEME } from '@/lib/storefront/restaurantMenu';
import {
  RestaurantMenuItemCard,
} from '@/components/storefront/restaurant/RestaurantMenuItemCard';
import { RestaurantCategoryMarquee } from '@/components/storefront/sections/restaurant/RestaurantCategoryMarquee';

const TRUST_ICONS = {
  delivery: Bike,
  fresh: Leaf,
  support: Headphones,
  stock: UtensilsCrossed,
  default: Shield,
};

function SpotlightCardGrid({ cards, accent }) {
  if (!cards.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
            {card.image ? (
              <SmartProductImage
                src={card.image}
                alt={card.title || ''}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                <UtensilsCrossed className="h-8 w-8 text-zinc-300" aria-hidden />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-zinc-900 sm:text-base">{card.title}</h3>
            {card.subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 sm:text-sm">{card.subtitle}</p>
            ) : null}
            <span
              className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold sm:text-sm"
              style={{ color: accent }}
            >
              Order now
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function UpperPromoTiles({ tiles, accent }) {
  if (!tiles.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className="group relative flex min-h-[88px] items-end overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md sm:min-h-[100px]"
        >
          {tile.image ? (
            <SmartProductImage
              src={tile.image}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-100" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" aria-hidden />
          <p className="relative z-10 w-full px-3 py-2.5 text-xs font-semibold text-white sm:text-sm">
            {tile.title}
          </p>
        </Link>
      ))}
    </div>
  );
}

/**
 * Tenant-aware elevated restaurant homepage — premium light layout.
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
  const upperPromoTiles = config.showUpperPromoTiles !== false
    ? resolveRestaurantUpperPromoTiles(settings, storeBase)
    : [];
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

  const [activeTab, setActiveTab] = useState(curatedTabs[0]?.id || 'all');
  const activeTabDef = curatedTabs.find((t) => t.id === activeTab) || curatedTabs[0];
  const curatedProducts = activeTabDef
    ? filterRestaurantByCategorySlug(products, activeTabDef.slug).slice(0, 8)
    : [];

  return (
    <>
      {trustPillars.length > 0 && (
        <section className="border-b border-zinc-200/80 bg-white py-4 sm:py-5">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
              {trustPillars.map((pillar) => {
                const Icon = TRUST_ICONS[pillar.id] || TRUST_ICONS.default;
                return (
                  <div
                    key={pillar.id}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200/80 sm:h-10 sm:w-10"
                      style={{ color: accent }}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 sm:text-[13px]">{pillar.label}</p>
                      {pillar.desc ? (
                        <p className="text-[10px] leading-snug text-zinc-500 sm:text-[11px]">{pillar.desc}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {upperPromoTiles.length > 0 && (
        <section className="border-b border-zinc-200/80 bg-zinc-50 py-5 sm:py-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <UpperPromoTiles tiles={upperPromoTiles.slice(0, 4)} accent={accent} />
          </div>
        </section>
      )}

      {spotlightCards.length > 0 && (
        <section className="bg-zinc-50 py-6 sm:py-8">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className={cn(STORE_SECTION_HEADING, 'text-zinc-900')}>Shop by category</h2>
              <Link
                href={productsUrl}
                className="text-xs font-semibold hover:opacity-90 sm:text-sm"
                style={{ color: accent }}
              >
                Full menu
              </Link>
            </div>
            <SpotlightCardGrid cards={spotlightCards} accent={accent} />
          </div>
        </section>
      )}

      {config.showCuisineCarousel !== false && cuisineIcons.length > 0 && (
        <section className="border-t border-zinc-200/80 bg-white pb-6 pt-5 sm:pb-8 sm:pt-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className={cn(STORE_SECTION_HEADING, 'text-zinc-900')}>Browse the menu</h2>
              <Link
                href={productsUrl}
                className="text-xs font-semibold sm:text-sm"
                style={{ color: accent }}
              >
                View all
              </Link>
            </div>
            <RestaurantCategoryMarquee categoryIcons={cuisineIcons} accent={accent} />
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
          accentColor={accent}
          className="border-t border-zinc-200/80 bg-zinc-50"
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
          accentColor={accent}
          className="border-t border-zinc-200/80 bg-white"
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
          accentColor={accent}
          className="border-t border-zinc-200/80 bg-zinc-50"
        />
      )}

      {curatedTabs.length > 0 && (
        <section className="border-t border-zinc-200/80 bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={cn(STORE_SECTION_HEADING, 'text-zinc-900')}>Explore the menu</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {businessDescription?.slice(0, 80) || 'Curated dishes by category'}
                </p>
              </div>
              {curatedTabs.length > 1 && (
                <div className="flex gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-zinc-50 p-1 scrollbar-hide">
                  {curatedTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4',
                        activeTab === tab.id
                          ? 'text-white shadow-sm'
                          : 'text-zinc-600 hover:bg-white hover:text-zinc-900'
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
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:gap-3.5">
                {curatedProducts.map((product) => (
                  <RestaurantMenuItemCard
                    key={product.id}
                    product={product}
                    businessDomain={businessDomain}
                    accent={accent}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
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
        <section className="border-t border-zinc-200/80 bg-zinc-50 py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                { icon: Clock, title: 'Opening hours', desc: businessHours },
                { icon: Bike, title: 'Delivery & pickup', desc: 'Order online for delivery or collection' },
                { icon: Shield, title: 'Secure checkout', desc: 'Pay with your preferred method at checkout' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-center shadow-sm sm:p-5"
                >
                  <item.icon className="mx-auto h-5 w-5 sm:h-6 sm:w-6" style={{ color: accent }} aria-hidden />
                  <h3 className="mt-2 text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
