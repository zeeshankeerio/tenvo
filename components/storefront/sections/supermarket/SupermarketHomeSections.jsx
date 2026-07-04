'use client';

import Link from 'next/link';
import { ArrowRight, Leaf, Truck, ShieldCheck, Clock } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreProductRail } from '@/components/storefront/StoreProductRail';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import { formatCurrency } from '@/lib/currency';
import {
  getSupermarketConfig,
  partitionSupermarketProducts,
  resolveSupermarketBrands,
  resolveSupermarketCategoryIcons,
  resolveSupermarketHomeRails,
  resolveSupermarketMidPromoTiles,
  resolveSupermarketPromoTiles,
  resolveSupermarketTrustPillars,
  resolveSupermarketUpperPromoTiles,
  formatSupermarketStoreName,
} from '@/lib/storefront/supermarketStorefront';
import { SupermarketBrandsMarquee } from '@/components/storefront/sections/supermarket/SupermarketBrandsMarquee';

const TRUST_ICONS = { fresh: Leaf, delivery: Truck, prices: ShieldCheck, cod: ShieldCheck, default: Clock };

function SectionHeader({ title, href, accent, linkLabel = 'VIEW ALL' }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
      {title ? (
        <h2 className={cn(STORE_SECTION_HEADING, 'text-base text-slate-900 sm:text-lg')}>{title}</h2>
      ) : (
        <span />
      )}
      {href ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white transition hover:opacity-90 sm:text-xs"
          style={{ backgroundColor: accent }}
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

function PromoBannerRow({ tiles, className }) {
  if (!tiles.length) return null;
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4', className)}>
      {tiles.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className="group relative aspect-[11/4] overflow-hidden rounded-lg border border-slate-100 bg-slate-100 shadow-sm transition hover:shadow-md"
        >
          <SmartProductImage
            src={tile.image}
            alt={tile.title || ''}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </Link>
      ))}
    </div>
  );
}

/**
 * Naheed / DSM-style supermarket homepage feed sections.
 */
export function SupermarketHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  currency = 'PKR',
  accent = '#f97316',
  base,
  settings = {},
  storeName = '',
  freeShippingThreshold = 2000,
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const config = getSupermarketConfig(settings, businessDomain, businessCategory);
  const titles = config.sectionTitles;
  const displayName = formatSupermarketStoreName(storeName);
  const ctx = { categories, businessDomain, products, businessCategory };

  const partitioned = partitionSupermarketProducts(products);
  const categoryIcons = config.showAisleCarousel !== false
    ? resolveSupermarketCategoryIcons(settings, storeBase, ctx)
    : [];
  const brands = config.showBrandsRow !== false
    ? resolveSupermarketBrands(settings, storeBase)
    : [];
  const upperTiles = config.showUpperPromoTiles !== false
    ? resolveSupermarketUpperPromoTiles(settings, storeBase)
    : [];
  const midTiles = config.showMidPromoTiles !== false
    ? resolveSupermarketMidPromoTiles(settings, storeBase)
    : [];
  const promoTiles = config.showPromoBanners !== false
    ? resolveSupermarketPromoTiles(settings, storeBase)
    : [];
  const trustPillars = config.showTrustStrip !== false
    ? resolveSupermarketTrustPillars(settings, businessDomain)
    : [];
  const homeRails = config.showHomeRails !== false ? resolveSupermarketHomeRails(settings) : [];

  const railProducts = (partition) => {
    if (partition === 'deals') return partitioned.deals;
    if (partition === 'fresh') return partitioned.fresh;
    return partitioned.topSellers;
  };

  return (
    <div className="space-y-7 sm:space-y-9">
      {trustPillars.length > 0 && (
        <section className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {trustPillars.map((pillar) => {
              const Icon = TRUST_ICONS[pillar.id] || TRUST_ICONS.default;
              return (
                <div key={pillar.id} className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
                    style={{ color: accent }}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 sm:text-xs">{pillar.label}</p>
                    {pillar.desc ? (
                      <p className="text-[10px] leading-tight text-slate-500">{pillar.desc}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {categoryIcons.length > 0 && (
        <section>
          <SectionHeader
            title={titles.popularCategories}
            href={productsUrl}
            accent={accent}
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
            {categoryIcons.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className="group overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                  {cat.image ? (
                    <SmartProductImage
                      src={cat.image}
                      alt={cat.label || ''}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-orange-700">
                      {cat.label?.slice(0, 2)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 px-1.5 py-2 text-center text-[10px] font-semibold leading-tight text-slate-700 sm:text-[11px]">
                  {cat.label}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upperTiles.length > 0 && <PromoBannerRow tiles={upperTiles} />}

      {brands.length > 0 && (
        <section>
          <SectionHeader
            title={titles.trendingNow}
            href={productsUrl}
            accent={accent}
            linkLabel="View more"
          />
          <SupermarketBrandsMarquee brands={brands} autoScroll={config.brandsAutoScroll !== false} />
        </section>
      )}

      {promoTiles.length > 0 && (
        <section>
          <SectionHeader
            title={titles.shopByOffer}
            href={`${productsUrl}?onSale=true`}
            accent={accent}
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {promoTiles.map((tile) => (
              <Link
                key={tile.id}
                href={tile.href}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-100 bg-slate-900 shadow-sm transition hover:shadow-lg sm:aspect-[16/10]"
              >
                <SmartProductImage
                  src={tile.image}
                  alt={tile.title || ''}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm font-bold text-white">{tile.title}</p>
                  {tile.subtitle ? (
                    <p className="mt-0.5 text-[11px] text-white/85">{tile.subtitle}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {homeRails.map((rail, index) => {
        const items = railProducts(rail.partition);
        if (!items.length && !products.length) return null;
        const railHref = `${productsUrl}${rail.href?.startsWith('?') ? rail.href : `?${rail.href || 'onSale=true'}`}`;
        return (
          <div key={rail.id} className="space-y-7 sm:space-y-9">
            <StoreProductRail
              id={rail.id}
              title={rail.title}
              subtitle={rail.subtitle || `Curated picks from ${displayName}`}
              href={railHref}
              linkLabel="VIEW ALL"
              products={items}
              catalogPool={products}
              businessDomain={businessDomain}
              cardVariant="dense"
              className="rounded-lg border border-slate-100 bg-white px-3 py-5 shadow-sm sm:px-4 sm:py-6"
              accentColor={accent}
              autoScroll={config.homeRailsAutoScroll !== false}
            />
            {index === 1 && midTiles.length > 0 ? (
              <PromoBannerRow tiles={midTiles} />
            ) : null}
            {index === 3 && midTiles.length > 4 ? (
              <PromoBannerRow tiles={midTiles.slice(4)} />
            ) : null}
          </div>
        );
      })}

      {config.showDeliveryBanner !== false && freeShippingThreshold > 0 && (
        <section className="overflow-hidden rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50/30">
          <div className="flex flex-col items-center justify-between gap-4 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
            <div>
              <p className="text-sm font-bold text-slate-900">{config.deliveryBannerTitle}</p>
              <p className="mt-1 text-sm text-slate-600">
                Orders over {formatCurrency(freeShippingThreshold, currency)} qualify for free home delivery.
              </p>
            </div>
            <Link
              href={productsUrl}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              Start shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {config.showWeeklyEssentials && (
        <section className="rounded-lg bg-slate-900 py-8 text-white sm:py-10">
          <div className="px-4 text-center sm:px-6">
            <h2 className="text-lg font-bold sm:text-xl">{config.weeklyEssentialsTitle}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
              Restock milk, bread, rice, and pantry staples — checkout without an account.
            </p>
            <Link
              href={`${productsUrl}?onSale=true`}
              className="mt-5 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Browse weekly deals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
