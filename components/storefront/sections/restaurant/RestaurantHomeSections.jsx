'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bike, Clock, Shield, Sparkles, Wallet, UtensilsCrossed, Star } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreProductRail } from '@/components/storefront/StoreProductRail';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import {
  getRestaurantConfig,
  RESTAURANT_ORDER_MODES,
  partitionRestaurantProducts,
  filterRestaurantByCategorySlug,
  resolveRestaurantCuisineIcons,
  resolveRestaurantCuratedTabs,
  resolveRestaurantPromoBanners,
  resolveRestaurantTrustPillars,
  formatRestaurantStoreName,
} from '@/lib/storefront/restaurantStorefront';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';

const TRUST_ICONS = {
  delivery: Bike,
  fresh: UtensilsCrossed,
  cashback: Wallet,
  stock: Shield,
  support: Shield,
};

/**
 * Tenant-aware elevated restaurant homepage sections.
 */
export function RestaurantHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  accent = '#603cba',
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
  const promoBanners = resolveRestaurantPromoBanners(settings, products, businessDomain, businessCategory);
  const trustPillars = resolveRestaurantTrustPillars(settings, businessDomain);
  const curatedTabs = resolveRestaurantCuratedTabs(settings, categories);
  const displayName = formatRestaurantStoreName(storeName);
  const isDemo = isDemoStoreDomain(businessDomain);
  const orderModes = config.orderModes || RESTAURANT_ORDER_MODES;
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
      {config.showOrderModes !== false && (
        <section className="border-b border-violet-50 bg-white py-4 lg:hidden">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6">
            <div className="grid grid-cols-3 gap-2">
              {orderModes.map((mode) => (
                <Link
                  key={mode.id}
                  href={productsUrl}
                  className="flex flex-col items-center gap-1 rounded-xl border border-violet-100 bg-violet-50/50 px-2 py-3 text-center active:scale-[0.98]"
                >
                  <span className="text-[11px] font-semibold text-violet-950">{mode.label}</span>
                  <span className="text-[10px] text-stone-500">{mode.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.showCuisineCarousel !== false && cuisineIcons.length > 0 && (
        <section className="border-b border-violet-50 bg-white pb-6 pt-3 sm:pb-10 sm:pt-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <h2 className={cn(STORE_SECTION_HEADING, 'mb-3 text-stone-900 lg:mb-5')}>Browse the menu</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible md:grid-cols-6 lg:grid-cols-12">
              {cuisineIcons.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="group flex w-[88px] shrink-0 flex-col items-center gap-2 sm:w-auto"
                >
                  <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-violet-100 shadow-sm transition group-active:scale-[0.97] sm:h-20 sm:w-20 lg:group-hover:border-violet-300 lg:group-hover:shadow-md">
                    {cat.image ? (
                      <SmartProductImage src={cat.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-violet-100 text-xs font-semibold text-violet-800">
                        {cat.label?.slice(0, 2)?.toUpperCase() || '•'}
                      </div>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-violet-950/50 to-transparent" aria-hidden />
                  </div>
                  <span className="line-clamp-2 text-center text-[11px] font-semibold leading-tight text-stone-700">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-violet-50 bg-[#f2f2f2] py-3 sm:py-4">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
            {trustPillars.map((pillar) => {
              const Icon = TRUST_ICONS[pillar.id] || Shield;
              return (
                <div
                  key={pillar.id}
                  className="flex min-w-[72%] shrink-0 items-center gap-2 rounded-xl border border-violet-100/80 bg-white/90 px-3 py-2.5 text-xs font-semibold text-violet-950 sm:min-w-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-violet-700 shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    {pillar.label}
                    {pillar.desc ? (
                      <span className="hidden font-normal text-stone-500 lg:block">{pillar.desc}</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {config.showSuperPicks !== false && superPicks.length > 0 && (
        <StoreProductRail
          title={featuredTitle}
          subtitle={featuredSubtitle}
          href={`${productsUrl}?sort=featured`}
          linkLabel="View all"
          products={superPicks}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-white"
        />
      )}

      {promoBanners.length > 0 && (
        <section className="bg-[#f2f2f2] py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {promoBanners.map((banner) => {
                const isPurple = banner.tone === 'purple';
                const isRed = banner.tone === 'red';
                return (
                  <Link
                    key={banner.id}
                    href={`${productsUrl}${banner.href}`}
                    className={cn(
                      'group relative flex min-h-[148px] items-end overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:min-h-[188px] sm:p-6',
                      isPurple ? 'border-violet-900/20 bg-violet-950' : isRed ? 'border-red-200 bg-red-50' : 'border-violet-100 bg-white'
                    )}
                  >
                    {banner.image ? (
                      <SmartProductImage
                        src={banner.image}
                        alt=""
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : null}
                    <div
                      className={cn(
                        'absolute inset-0',
                        isPurple ? 'bg-gradient-to-r from-violet-950/90 via-violet-900/70 to-violet-900/30' : 'bg-gradient-to-r from-white/95 via-white/80 to-white/40'
                      )}
                      aria-hidden
                    />
                    <div className="relative z-10 max-w-[75%]">
                      <p className={cn('text-[10px] font-semibold uppercase tracking-wider', isPurple ? 'text-violet-200' : 'text-violet-700')}>
                        {displayName}
                      </p>
                      <h3 className={cn('mt-1 text-lg font-semibold sm:text-xl', isPurple ? 'text-white' : 'text-stone-900')}>
                        {banner.title}
                      </h3>
                      <p className={cn('mt-1 text-xs sm:text-sm', isPurple ? 'text-white/85' : 'text-stone-600')}>
                        {banner.subtitle}
                      </p>
                      <span
                        className={cn(
                          'mt-3 inline-flex items-center gap-1 text-xs font-semibold',
                          isPurple ? 'text-violet-200' : 'text-violet-700'
                        )}
                      >
                        Order now
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
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
          className="bg-white"
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
          className="bg-[#f2f2f2]"
        />
      )}

      {curatedTabs.length > 0 && (
        <section className="border-t border-violet-50 bg-white py-8 sm:py-12">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={cn(STORE_SECTION_HEADING, 'text-stone-900')}>Explore the menu</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {businessDescription?.slice(0, 80) || 'Curated dishes by category'}
                </p>
              </div>
              {curatedTabs.length > 1 && (
                <div className="flex gap-1 overflow-x-auto rounded-full border border-violet-100 bg-violet-50/50 p-1 scrollbar-hide">
                  {curatedTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4',
                        activeTab === tab.id ? 'bg-violet-600 text-white shadow-sm' : 'text-violet-900 hover:bg-white'
                      )}
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
              <p className="text-sm text-stone-500">No items in this section yet. Browse the full menu to see everything available.</p>
            )}
          </div>
        </section>
      )}

      {config.showRewardsCta && (
        <section className="border-t border-violet-100 bg-violet-950 py-10 sm:py-14">
          <div className="mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
            <Sparkles className="mx-auto h-8 w-8 text-violet-300" aria-hidden />
            <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              {isDemo ? 'Earn e-Cash on every order' : 'Rewards on every order'}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-violet-200">
              Recommend {displayName} to friends and earn rewards on qualifying orders. Terms apply.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`${storeBase}/contact`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-50"
              >
                <Star className="h-4 w-4" aria-hidden />
                Join & earn
              </Link>
              <Link
                href={productsUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-900"
              >
                Browse menu
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      {config.showDeliveryInfo !== false && (
        <section className="border-t border-violet-50 bg-[#f2f2f2] py-8">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Clock, title: 'Opening hours', desc: businessHours },
                { icon: Bike, title: 'Delivery & pickup', desc: 'Order online for delivery or collection' },
                { icon: Shield, title: 'Secure checkout', desc: 'Pay with your preferred method at checkout' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-violet-100 bg-white p-5 text-center">
                  <item.icon className="mx-auto h-6 w-6 text-violet-600" aria-hidden />
                  <h3 className="mt-2 text-sm font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-stone-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
