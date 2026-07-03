'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell } from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreProductRail } from '@/components/storefront/StoreProductRail';
import { cn } from '@/lib/utils';
import { STORE_SECTION_HEADING } from '@/lib/utils/typography';
import {
  getPharmacyConfig,
  partitionPharmacyProducts,
  resolvePharmacyCategoryIcons,
  resolvePharmacyPromoBanners,
  resolvePharmacyCareByCondition,
  resolvePharmacyBrands,
  resolvePharmacySeoBlocks,
  formatPharmacyStoreName,
} from '@/lib/storefront/pharmacyStorefront';

function PharmacySeoBlock({ storeName, businessDescription, country, settings, businessDomain }) {
  const config = getPharmacyConfig(settings, businessDomain);
  if (!config.showSeoBlock) return null;
  const blocks = resolvePharmacySeoBlocks(storeName, businessDescription, country);
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="border-t border-emerald-100 bg-emerald-50/50 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className={cn(STORE_SECTION_HEADING, 'mb-6 text-slate-900')}>{blocks[0]?.title}</h2>
        <div className={cn('space-y-6', !expanded && 'max-h-[280px] overflow-hidden relative')}>
          {blocks.map((block) => (
            <div key={block.id}>
              {block.id !== 'about' && (
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{block.title}</h3>
              )}
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{block.body}</p>
            </div>
          ))}
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-50/95 to-transparent" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      </div>
    </section>
  );
}

/**
 * Tenant-aware pharmacy homepage sections.
 */
export function PharmacyHomeSections({
  businessDomain,
  businessCategory,
  categories = [],
  products = [],
  accent = '#16a34a',
  base,
  settings = {},
  storeName = '',
  businessDescription = '',
  country = '',
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const config = getPharmacyConfig(settings, businessDomain);
  const displayName = formatPharmacyStoreName(storeName);
  const ctx = { categories, businessDomain, products, businessCategory };

  const { topSelling, deals, featured } = partitionPharmacyProducts(products);
  const categoryIcons = resolvePharmacyCategoryIcons(settings, storeBase, ctx);
  const promoBanners = resolvePharmacyPromoBanners(settings, products, businessDomain, businessCategory);
  const careItems = resolvePharmacyCareByCondition(settings, storeBase, ctx);
  const brands = resolvePharmacyBrands(settings, products, businessDomain);
  const featuredTitle = config.featuredRailTitle || 'Top selling';
  const featuredSubtitle =
    config.featuredRailSubtitle || `Popular products from ${displayName}`;

  return (
    <>
      {categoryIcons.length > 0 && (
        <section className="border-b border-emerald-50 bg-white pb-6 pt-3 sm:pb-10 sm:pt-6 lg:pt-6">
          <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
            <h2 className={cn(STORE_SECTION_HEADING, 'mb-3 text-slate-900 lg:mb-5')}>Shop by category</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-10 lg:gap-4">
              {categoryIcons.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl border border-transparent p-1.5 text-center active:scale-[0.97] sm:gap-2 sm:p-0 lg:rounded-none lg:border-0 lg:p-0"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm transition group-active:border-emerald-300 sm:h-16 sm:w-16 sm:rounded-full lg:group-hover:border-emerald-300 lg:group-hover:shadow-md">
                    {cat.image ? (
                      <SmartProductImage src={cat.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-emerald-800">
                        {cat.label?.slice(0, 2)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-700 sm:text-xs">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {topSelling.length > 0 && (
        <StoreProductRail
          title={featuredTitle}
          subtitle={featuredSubtitle}
          href={`${productsUrl}?sort=popularity`}
          linkLabel="Shop all"
          products={topSelling}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-white"
        />
      )}

      {deals.length > 0 && (
        <StoreProductRail
          title="Deals & offers"
          subtitle="Save on vitamins, baby care, and personal care"
          href={`${productsUrl}?onSale=true`}
          products={deals}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-emerald-50/40"
        />
      )}

      {promoBanners.length > 0 && (
        <section className="bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {promoBanners.map((banner) => {
                const isGreen = banner.tone === 'green';
                return (
                  <Link
                    key={banner.id}
                    href={`${productsUrl}${banner.href}`}
                    className={cn(
                      'group relative flex min-h-[148px] items-end overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:min-h-[188px] sm:p-6',
                      isGreen ? 'border-emerald-800/30 bg-emerald-900' : 'border-emerald-100 bg-slate-50'
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
                        isGreen
                          ? 'bg-gradient-to-t from-emerald-950/95 via-emerald-900/70 to-emerald-800/35'
                          : 'bg-gradient-to-t from-white via-white/88 to-white/55'
                      )}
                      aria-hidden
                    />
                    <div className="relative z-10 max-w-[85%]">
                      <h3 className={cn('text-lg font-semibold sm:text-xl', isGreen ? 'text-white' : 'text-slate-900')}>
                        {banner.title}
                      </h3>
                      <p className={cn('mt-1 text-sm leading-snug', isGreen ? 'text-emerald-50/90' : 'text-slate-600')}>
                        {banner.subtitle}
                      </p>
                      <span
                        className={cn(
                          'mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-[gap] group-hover:gap-2',
                          isGreen ? 'text-white' : 'text-emerald-700'
                        )}
                      >
                        Shop now <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <StoreProductRail
          title="Featured products"
          subtitle={`Handpicked from ${displayName}`}
          href={`${productsUrl}?sort=featured`}
          products={featured}
          catalogPool={products}
          businessDomain={businessDomain}
          className="bg-white"
        />
      )}

      {careItems.length > 0 && (
        <section className="border-y border-emerald-50 bg-emerald-50/30 py-8 sm:py-12">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className={cn(STORE_SECTION_HEADING, 'text-slate-900')}>Shop by category</h2>
                <p className="mt-1 text-sm text-slate-500">Find products for common health needs</p>
              </div>
              <Link href={productsUrl} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {careItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href || `${productsUrl}?category=${encodeURIComponent(item.slug)}`}
                  className="group overflow-hidden rounded-xl border border-white bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-square">
                    {item.image ? (
                      <SmartProductImage src={item.image} alt="" fill className="object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-sm font-semibold text-emerald-800">
                        {item.label}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <p className="absolute bottom-2 left-2 right-2 text-center text-xs font-semibold text-white sm:text-sm">
                      {item.label}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.showBrandsRow && brands.length > 0 && (
        <section className="bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <h2 className={cn(STORE_SECTION_HEADING, 'mb-5 text-slate-900')}>Trusted brands</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`${productsUrl}?search=${encodeURIComponent(brand.name)}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 sm:text-sm"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {config.showRefillPromo && (
        <section className="bg-emerald-700 py-10 sm:py-12">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Monthly essentials</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Never run out of chronic care medicines</h2>
                <p className="mt-3 text-sm leading-relaxed text-emerald-100 sm:text-base">
                  Set refill reminders with our team. We notify you before your supply ends and help you reorder
                  with a valid prescription when required.
                </p>
              </div>
              <Link
                href={`${storeBase}/contact?refill=1`}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
              >
                <Bell className="h-4 w-4" aria-hidden />
                Set refill reminder
              </Link>
            </div>
          </div>
        </section>
      )}

      <PharmacySeoBlock
        storeName={storeName}
        businessDescription={businessDescription}
        country={country}
        settings={settings}
        businessDomain={businessDomain}
      />
    </>
  );
}
