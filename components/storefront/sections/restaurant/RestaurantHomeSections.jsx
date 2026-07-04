'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bike,
  Clock,
  Sparkles,
  Star,
  Shield,
  UtensilsCrossed,
  Headphones,
  Leaf,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { resolveSpotlightBannerImage } from '@/lib/storefront/storefrontImagePlaceholders';
import { StoreProductRail } from '@/components/storefront/StoreProductRail';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import { formatCurrency } from '@/lib/currency';
import {
  getRestaurantConfig,
  RESTAURANT_ORDER_MODES,
  partitionRestaurantProducts,
  filterRestaurantByCategorySlug,
  resolveRestaurantCuisineIcons,
  resolveRestaurantCuratedTabs,
  resolveRestaurantPromoBanners,
  resolveRestaurantTrustPillars,
  resolveRestaurantUpperPromoTiles,
  formatRestaurantStoreName,
} from '@/lib/storefront/restaurantStorefront';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import { useRestaurantChromeOptional } from '@/components/storefront/restaurant/RestaurantChromeContext';

const TRUST_ICONS = {
  delivery: Bike,
  fresh: Leaf,
  cashback: Sparkles,
  support: Headphones,
  stock: UtensilsCrossed,
  default: Shield,
};

function PromoTileRow({ tiles, className }) {
  if (!tiles.length) return null;
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4', className)}>
      {tiles.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className="group relative aspect-[11/4] overflow-hidden rounded-lg border border-stone-100 bg-stone-100 shadow-sm transition hover:shadow-md"
        >
          <SmartProductImage
            src={tile.image}
            alt={tile.title || ''}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          {tile.title ? (
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950/70 via-violet-900/25 to-transparent" aria-hidden />
          ) : null}
          {tile.title ? (
            <span className="absolute bottom-2 left-2 right-2 text-xs font-semibold text-white sm:text-sm">
              {tile.title}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

/**
 * Tenant-aware elevated restaurant homepage sections.
 */
export function RestaurantHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  currency = 'PKR',
  accent = '#603cba',
  base,
  settings = {},
  storeName = '',
  businessDescription = '',
  freeShippingThreshold = 0,
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
  const trustPillars = config.showTrustStrip !== false
    ? resolveRestaurantTrustPillars(settings, businessDomain)
    : [];
  const upperTiles = config.showUpperPromoTiles !== false
    ? resolveRestaurantUpperPromoTiles(settings, storeBase)
    : [];
  const curatedTabs = resolveRestaurantCuratedTabs(settings, categories);
  const displayName = formatRestaurantStoreName(storeName);
  const isDemo = isDemoStoreDomain(businessDomain);
  const orderModes = config.orderModes || RESTAURANT_ORDER_MODES;
  const restaurantChrome = useRestaurantChromeOptional();
  const featuredTitle = config.featuredRailTitle || 'Featured picks';
  const featuredSubtitle =
    config.featuredRailSubtitle || `Popular dishes from ${displayName}`;
  const businessHours =
    settings?.businessHours || settings?.contact?.businessHours || 'See contact page for hours';
  const creamBg = '#f2f2f2';

  const [activeTab, setActiveTab] = useState(curatedTabs[0]?.id || 'all');
  const activeTabDef = curatedTabs.find((t) => t.id === activeTab) || curatedTabs[0];
  const curatedProducts = activeTabDef
    ? filterRestaurantByCategorySlug(products, activeTabDef.slug).slice(0, 8)
    : [];

  return (
    <>
      {config.showOrderModes !== false && (
        <section className="border-b border-stone-100 bg-white py-4 lg:hidden">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6">
            <div className="grid grid-cols-3 gap-2">
              {orderModes.map((mode) => (
                <Link
                  key={mode.id}
                  href={`${productsUrl}?mode=${mode.id}`}
                  onClick={() => restaurantChrome?.setOrderMode?.(mode.id)}
                  className="flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center active:scale-[0.98]"
                  style={{ borderColor: `${accent}22`, backgroundColor: `${accent}0d` }}
                >
                  <span className="text-[11px] font-semibold text-stone-900">{mode.label}</span>
                  <span className="text-[10px] text-stone-500">{mode.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {trustPillars.length > 0 && (
        <section className="border-b border-stone-100 bg-white py-4 sm:py-5">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {trustPillars.map((pillar) => {
                const Icon = TRUST_ICONS[pillar.id] || TRUST_ICONS.default;
                return (
                  <div key={pillar.id} className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2.5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
                      style={{ color: accent }}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-stone-800 sm:text-xs">{pillar.label}</p>
                      {pillar.desc ? (
                        <p className="text-[10px] leading-tight text-stone-500">{pillar.desc}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {upperTiles.length > 0 && (
        <section className="border-b border-stone-100 bg-white py-5 sm:py-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <PromoTileRow tiles={upperTiles} />
          </div>
        </section>
      )}

      {config.showCuisineCarousel !== false && cuisineIcons.length > 0 && (
        <section className="border-b border-stone-100 bg-white pb-6 pt-3 sm:pb-10 sm:pt-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <h2 className={cn(STORE_SECTION_HEADING, 'mb-3 text-stone-900 lg:mb-5')}>Browse the menu</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible md:grid-cols-6 lg:grid-cols-12">
              {cuisineIcons.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="group flex w-[88px] shrink-0 flex-col items-center gap-2 sm:w-auto"
                >
                  <div
                    className="relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-stone-100 shadow-sm transition group-active:scale-[0.97] sm:h-20 sm:w-20 lg:group-hover:shadow-md"
                    style={{ borderColor: `${accent}33` }}
                  >
                    {cat.image ? (
                      <SmartProductImage src={cat.image} alt="" fill className="object-cover" />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-xs font-semibold"
                        style={{ backgroundColor: `${accent}18`, color: accent }}
                      >
                        {cat.label?.slice(0, 2)?.toUpperCase() || '•'}
                      </div>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />
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
        <section className="py-8 sm:py-10" style={{ backgroundColor: creamBg }}>
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {promoBanners.map((banner, bannerIndex) => {
                const isPurple = banner.tone === 'purple';
                const isRed = banner.tone === 'red';
                const imageSrc = resolveSpotlightBannerImage(banner, businessCategory, bannerIndex);
                return (
                  <Link
                    key={banner.id}
                    href={`${productsUrl}${banner.href}`}
                    className={cn(
                      'group relative flex min-h-[148px] items-end overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:min-h-[188px] sm:p-6',
                      isRed ? 'border-red-200 bg-neutral-900' : 'border-stone-200 bg-neutral-900'
                    )}
                  >
                    <SmartProductImage
                      src={imageSrc}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      fallbackSrc={resolveSpotlightBannerImage(banner, businessCategory, bannerIndex + 1)}
                    />
                    <div
                      className={cn(
                        'absolute inset-0',
                        isPurple || !isRed
                          ? 'bg-gradient-to-r from-violet-950/88 via-violet-900/52 to-violet-900/18'
                          : 'bg-gradient-to-r from-red-950/80 via-red-900/45 to-red-900/15'
                      )}
                      aria-hidden
                    />
                    <div className="relative z-10 max-w-[75%]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                        {displayName}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white sm:text-xl">{banner.title}</h3>
                      <p className="mt-1 text-xs text-white/85 sm:text-sm">{banner.subtitle}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-200">
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
        <section className="border-t border-stone-100 bg-white py-8 sm:py-12">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={cn(STORE_SECTION_HEADING, 'text-stone-900')}>Explore the menu</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {businessDescription?.slice(0, 80) || 'Curated dishes by category'}
                </p>
              </div>
              {curatedTabs.length > 1 && (
                <div className="flex gap-1 overflow-x-auto rounded-full border border-stone-100 bg-stone-50 p-1 scrollbar-hide">
                  {curatedTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4',
                        activeTab === tab.id ? 'text-white shadow-sm' : 'text-stone-700 hover:bg-white'
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
              <p className="text-sm text-stone-500">No items in this section yet. Browse the full menu to see everything available.</p>
            )}
          </div>
        </section>
      )}

      {config.showDeliveryBanner !== false && typeof freeShippingThreshold === 'number' && freeShippingThreshold > 0 && (
        <section className="py-6 sm:py-8" style={{ backgroundColor: creamBg }}>
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div
              className="flex flex-col items-center justify-between gap-4 rounded-2xl px-6 py-6 text-white sm:flex-row sm:px-8 sm:py-8"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)` }}
            >
              <div>
                <h3 className="text-lg font-semibold sm:text-xl">
                  Free delivery on orders over {formatCurrency(freeShippingThreshold, currency, { maximumFractionDigits: 0 })}
                </h3>
                <p className="mt-1 text-sm text-white/85">Order more, save on delivery. No promo code needed.</p>
              </div>
              <Link
                href={productsUrl}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold transition hover:bg-white/95"
                style={{ color: accent }}
              >
                Order now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {config.showRewardsCta && (
        <section className="border-t border-stone-100 py-10 sm:py-14" style={{ backgroundColor: accent }}>
          <div className="mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
            <Sparkles className="mx-auto h-8 w-8 text-white/70" aria-hidden />
            <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              {isDemo ? 'Earn e-Cash on every order' : 'Rewards on every order'}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/80">
              Recommend {displayName} to friends and earn rewards on qualifying orders. Terms apply.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`${storeBase}/contact`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-white/95"
                style={{ color: accent }}
              >
                <Star className="h-4 w-4" aria-hidden />
                Join & earn
              </Link>
              <Link
                href={productsUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse menu
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      {config.showDeliveryInfo !== false && (
        <section className="border-t border-stone-100 py-8" style={{ backgroundColor: creamBg }}>
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Clock, title: 'Opening hours', desc: businessHours },
                { icon: Bike, title: 'Delivery & pickup', desc: 'Order online for delivery or collection' },
                { icon: Shield, title: 'Secure checkout', desc: 'Pay with your preferred method at checkout' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-stone-100 bg-white p-5 text-center">
                  <item.icon className="mx-auto h-6 w-6" style={{ color: accent }} aria-hidden />
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
