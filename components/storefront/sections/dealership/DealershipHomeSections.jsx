'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ChevronLeft, ChevronRight, ArrowRight, Phone,
  Truck, Star, Clock,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { DealershipVehicleRail } from './DealershipVehicleRail';
import { DealershipBookingStrip } from './DealershipBookingStrip';
import { AutoBrandMarquee } from '@/components/storefront/sections/shared/AutoBrandMarquee';
import {
  DEALERSHIP_PRICE_BANDS,
  DEALERSHIP_MODELS_BY_BRAND,
  DEALERSHIP_INVENTORY_CATEGORIES,
  partitionShowroomCatalog,
  resolveDealershipPriceBand,
  buildDealershipNewsroomFromProducts,
  buildDealershipStoriesFromProducts,
  getDealershipStorefrontConfig,
  isTenvoVehiclesShowroomProfile,
} from '@/lib/storefront/autoDealership';
import { resolveTenvoVehiclesMarketingBanners } from '@/lib/storefront/tenvoVehiclesTemplate';
import { DealershipMarketingBanners } from './DealershipMarketingBanners';
import {
  getDealershipBookingStripItems,
  getDealershipInventoryTabs,
  getDealershipUnifiedServices,
  filterSaleExcludingBestSellers,
} from '@/lib/storefront/dealershipBooking';
import { getTenantMeetingUrl, shouldOfferTenantMeetingLink } from '@/lib/storefront/storefrontBooking';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import {
  resolveAutomotiveTileImage,
  resolveBodyTypeTileImage,
  resolveDealershipBannerFallback,
} from '@/lib/storefront/storefrontImagePlaceholders';

function CarouselSection({ title, subtitle, children, className, id, href, linkLabel = 'View all' }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [children, update]);

  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <section id={id} className={cn('py-10 sm:py-14', className)}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {href ? (
              <Link href={href} className="hidden text-xs font-bold uppercase tracking-wide text-neutral-700 hover:text-neutral-900 sm:inline-flex sm:items-center sm:gap-1">
                {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scroll(-1)}
                disabled={!canLeft}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:border-neutral-900 disabled:opacity-30"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                disabled={!canRight}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 transition hover:border-neutral-900 disabled:opacity-30"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        <div ref={trackRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {children}
        </div>
      </div>
    </section>
  );
}

function AccessoryCard({ product, businessDomain, businessCategory, currency, accent }) {
  const href = `/store/${businessDomain}/products/${product.slug || product.id}`;
  const price = Number(product.display_price ?? product.price ?? 0);
  const compare = Number(product.compare_price) || 0;
  const onSale = compare > price;
  const discount = onSale ? Math.round(((compare - price) / compare) * 100) : 0;
  const imageSrc = getEffectiveProductImageUrl(product, businessCategory);

  return (
    <Link
      href={href}
      className="w-[200px] shrink-0 snap-start overflow-hidden rounded-lg border border-neutral-100 bg-white transition hover:shadow-md sm:w-[220px]"
    >
      <div className="relative aspect-square bg-neutral-50">
        <SmartProductImage src={imageSrc} alt={product.name} fill className="object-cover" placeholderLabel={product.name} />
        {onSale ? (
          <span className="absolute left-2 top-2 rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {discount}% off
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">{product.name}</h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold tabular-nums text-neutral-900">
            {formatCurrency(price, currency, { maximumFractionDigits: 0 })}
          </span>
          {onSale ? (
            <span className="text-xs text-neutral-400 line-through tabular-nums">
              {formatCurrency(compare, currency, { maximumFractionDigits: 0 })}
            </span>
          ) : null}
        </div>
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          View product <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function BrowseTile({ label, href, image, tileKey }) {
  const tileImage = image || resolveBodyTypeTileImage(tileKey, label) || resolveAutomotiveTileImage(label);
  return (
    <Link
      href={href}
      className="group relative flex h-24 min-w-[120px] shrink-0 snap-start flex-col items-center justify-end overflow-hidden rounded-lg border border-neutral-200 bg-neutral-800 p-3 text-center sm:h-28 sm:min-w-[140px]"
    >
      <SmartProductImage
        src={tileImage}
        alt=""
        fill
        className="object-cover opacity-50 transition group-hover:scale-105 group-hover:opacity-60"
        fallbackSrc={resolveAutomotiveTileImage(label)}
      />
      <span className="relative text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">{label}</span>
    </Link>
  );
}

/**
 * Vehicle dealership homepage (Tenvo Vehicles template + VINCAR profile).
 */
export function DealershipHomeSections({
  businessDomain,
  businessCategory,
  business = {},
  settings = {},
  products = [],
  currency = 'PKR',
  accent = '#111827',
  base,
}) {
  const router = useRouter();
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const tenvo = isTenvoVehiclesShowroomProfile(business, settings);
  const cfg = getDealershipStorefrontConfig({ ...business, settings });
  const marketingBanners = useMemo(
    () => (cfg.showMarketingBanners ? resolveTenvoVehiclesMarketingBanners(storeBase, settings) : []),
    [cfg.showMarketingBanners, storeBase, settings]
  );

  const [vehicleTab, setVehicleTab] = useState('all');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [priceBand, setPriceBand] = useState('');

  const showroom = useMemo(() => partitionShowroomCatalog(products), [products]);
  const inventoryTabs = useMemo(() => getDealershipInventoryTabs(showroom), [showroom]);
  const activeVehicleTab = inventoryTabs.find((t) => t.id === vehicleTab) || inventoryTabs[0];
  const vehicleTabProducts = activeVehicleTab?.items || [];
  const bookingItems = useMemo(
    () => getDealershipBookingStripItems(storeBase, business, settings),
    [storeBase, business, settings]
  );
  const tenantMeetingUrl = useMemo(() => {
    if (!shouldOfferTenantMeetingLink(business, businessCategory, settings)) return null;
    return getTenantMeetingUrl(business, settings);
  }, [business, businessCategory, settings]);
  const unifiedServices = useMemo(
    () => getDealershipUnifiedServices(storeBase, business, settings),
    [storeBase, business, settings]
  );
  const saleProducts = useMemo(
    () => filterSaleExcludingBestSellers(showroom.onSale, showroom.bestSellers),
    [showroom.onSale, showroom.bestSellers]
  );
  const highlightItems = useMemo(() => {
    const news = buildDealershipNewsroomFromProducts(products, storeBase);
    const stories = buildDealershipStoriesFromProducts(products, storeBase);
    const merged = [...news, ...stories];
    const seen = new Set();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 8);
  }, [products, storeBase]);

  const brandGrid = cfg.brands;
  const priceBands = cfg.priceBands;
  const modelOptions = useMemo(() => {
    if (!brand || tenvo) return [];
    return DEALERSHIP_MODELS_BY_BRAND[brand] || [];
  }, [brand, tenvo]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category && category !== 'All Categories') params.set('category', category);
    if (brand) params.set('brand', brand);
    if (model && !tenvo) params.set('search', model);
    if (model && tenvo) params.set('body', model);
    const band = priceBands.find((b) => b.id === priceBand);
    if (band?.min != null) params.set('minPrice', String(band.min));
    if (band?.max != null) params.set('maxPrice', String(band.max));
    if (!tenvo) {
      const legacy = resolveDealershipPriceBand(priceBand);
      if (legacy.minPrice != null) params.set('minPrice', String(legacy.minPrice));
      if (legacy.maxPrice != null) params.set('maxPrice', String(legacy.maxPrice));
    }
    router.push(`${productsUrl}?${params.toString()}`);
  };

  const callHref = cfg.uanTel ? `tel:${cfg.uanTel}` : `${storeBase}/contact`;

  return (
    <>
      {tenvo && marketingBanners.length > 0 ? (
        <div className="relative z-10 -mt-12 px-4 sm:-mt-14 lg:-mt-16 lg:px-8">
          <DealershipMarketingBanners banners={marketingBanners} accent={accent} overlap />
        </div>
      ) : null}

      {tenvo && cfg.showTrustStrip ? (
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3 text-xs text-neutral-600 sm:gap-x-8 sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
              {cfg.trustStrip?.hours || '10 am - 07 pm'}
            </span>
            {cfg.uan ? (
              <a href={callHref} className="inline-flex items-center gap-2 font-semibold text-neutral-900 hover:underline">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                UAN: {cfg.uan}
              </a>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
              {cfg.trustStrip?.shippingLabel || 'Nationwide shipping'}
            </span>
            <span className="inline-flex items-center gap-2">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {cfg.trustStrip?.ratingLabel || '4.5+ Google ratings'}
            </span>
          </div>
        </section>
      ) : null}

      {/* Search & brands */}
      <section className={cn('border-b border-neutral-100 bg-white', tenvo ? 'py-8 sm:py-10' : 'py-10 sm:py-14')}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl lg:text-3xl">
            {tenvo ? 'Find your next car' : 'Find your dream car'}
          </h2>
          {tenvo ? (
            <p className="mb-5 text-center text-sm text-neutral-500">{cfg.tagline}</p>
          ) : null}

          <form
            onSubmit={handleSearch}
            className="mx-auto mb-6 max-w-4xl rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">All categories</option>
                  {(tenvo
                    ? ['All Cars', 'New Cars', 'Used Cars', 'Luxury', 'Auto Store', 'Car Care', 'PPF', 'Conversions']
                    : DEALERSHIP_INVENTORY_CATEGORIES
                  ).map((c) => (
                    <option key={c} value={c === 'All Categories' ? '' : c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Brand</span>
                <select
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setModel('');
                  }}
                  className="w-full rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">All brands</option>
                  {brandGrid.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </label>
              {!tenvo ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Model</span>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                    disabled={!brand}
                  >
                    <option value="">Any model</option>
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Body type</span>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">Any body</option>
                    {cfg.bodyTypes.map((b) => (
                      <option key={b.id} value={b.filter}>{b.label}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Price</span>
                <select
                  value={priceBand}
                  onChange={(e) => setPriceBand(e.target.value)}
                  className="w-full rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm"
                >
                  {priceBands.map((band) => (
                    <option key={band.id || 'any'} value={band.id}>{band.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-center sm:mt-4">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-auto"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </form>

          {tenvo && cfg.bodyTypes.length > 0 ? (
            <div className="mx-auto mb-6 flex max-w-4xl flex-wrap justify-center gap-2">
              {cfg.bodyTypes.map((b) => (
                <Link
                  key={b.id}
                  href={`${productsUrl}?body=${encodeURIComponent(b.filter)}`}
                  className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
                >
                  {b.label}
                </Link>
              ))}
            </div>
          ) : null}

          <AutoBrandMarquee
            brands={brandGrid}
            productsUrl={productsUrl}
            variant="dealership"
            accent={accent}
            layout={tenvo ? 'grid' : 'marquee'}
            className="mb-0"
          />
        </div>
      </section>

      <DealershipBookingStrip
        items={bookingItems}
        accent={accent}
        contactHref={`${storeBase}/contact`}
        meetingUrl={tenantMeetingUrl || undefined}
      />

      {inventoryTabs.length > 0 ? (
        <section className="border-y border-neutral-100 bg-white py-10 sm:py-14" id="inventory">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Vehicle inventory</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Browse new, used, luxury, and imported listings in one place
                </p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
                {inventoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVehicleTab(tab.id)}
                    className={cn(
                      'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition',
                      vehicleTab === tab.id ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-800'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <DealershipVehicleRail
              products={vehicleTabProducts.slice(0, 10)}
              businessDomain={businessDomain}
              businessCategory={businessCategory}
              currency={currency}
              accent={accent}
              variant={tenvo ? 'showroom' : 'dealership'}
              callPhone={cfg.uanTel || undefined}
              callLabel={cfg.uan ? `Call now - ${cfg.uan}` : 'Call now'}
              storeBase={storeBase}
              meetingUrl={tenantMeetingUrl || undefined}
            />

            <div className="mt-8 text-center">
              <Link
                href={`${productsUrl}${activeVehicleTab?.id === 'used' ? '?condition=pre-owned' : activeVehicleTab?.id === 'new' ? '?condition=new' : ''}`}
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-900"
              >
                View all {activeVehicleTab?.label?.toLowerCase() || 'inventory'} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {tenvo && showroom.bestSellers.length > 0 ? (
        <CarouselSection
          title="Top trending products"
          subtitle="Best sellers from our auto store"
          className="bg-neutral-50"
          id="best-sellers"
          href={`${productsUrl}?category=Auto+Store`}
        >
          {showroom.bestSellers.slice(0, 10).map((product) => (
            <AccessoryCard
              key={product.id || product.sku}
              product={product}
              businessDomain={businessDomain}
              businessCategory={businessCategory}
              currency={currency}
              accent={accent}
            />
          ))}
        </CarouselSection>
      ) : null}

      {tenvo && saleProducts.length > 0 ? (
        <CarouselSection
          title="Sale"
          subtitle="Limited-time offers not shown in best sellers"
          className="bg-neutral-50"
          id="sale"
          href={`${productsUrl}?sale=1`}
        >
          {saleProducts.slice(0, 10).map((product) => (
            <AccessoryCard
              key={product.id || product.sku}
              product={product}
              businessDomain={businessDomain}
              businessCategory={businessCategory}
              currency={currency}
              accent={accent}
            />
          ))}
        </CarouselSection>
      ) : null}

      {!tenvo ? (
        <>
          <section className="bg-neutral-50 py-10 sm:py-14">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
              <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-neutral-900">Browse cars</h2>
              <p className="mb-8 text-center text-sm text-neutral-500">Filter by engine size, brand, or body type</p>
              <div className="space-y-6">
                {cfg.engineSizes.length > 0 ? (
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">Engine size</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {cfg.engineSizes.map((size) => (
                        <BrowseTile
                          key={size}
                          label={size}
                          href={`${productsUrl}?search=${encodeURIComponent(size)}`}
                          tileKey={size}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">Body type</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {cfg.bodyTypes.map((b) => (
                      <BrowseTile
                        key={b.id}
                        label={b.label}
                        href={`${productsUrl}?body=${encodeURIComponent(b.filter)}`}
                        tileKey={b.id}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {cfg.popularCategories.length > 0 ? (
            <section className="bg-white py-10 sm:py-14">
              <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-neutral-900">Popular categories</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {cfg.popularCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`${productsUrl}?${cat.hrefQuery}`}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:border-neutral-900 hover:bg-white sm:text-sm"
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {/* Services grid */}
      <section id="services" className={cn('border-y border-neutral-100 bg-white', tenvo ? 'py-8 sm:py-12' : 'py-10 sm:py-14')}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            {tenvo ? 'Your all-in-one automotive hub' : 'Your One-Stop Automotive Hub'}
          </h2>
          <p className="mb-10 text-center text-sm text-neutral-500 sm:text-base">
            {tenvo
              ? 'New & used cars, modifications, PPF, car care, and nationwide parts delivery.'
              : 'Sales, finance, insurance, and after-sales, everything under one roof.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unifiedServices.map((svc) => (
              <Link
                key={svc.id}
                href={svc.href}
                className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-lg border border-neutral-100 bg-neutral-900 p-5 text-white transition hover:shadow-lg sm:min-h-[220px] sm:p-6"
              >
                <SmartProductImage
                  src={svc.image}
                  alt=""
                  fill
                  className="object-cover opacity-50 transition duration-500 group-hover:scale-105 group-hover:opacity-60"
                  fallbackSrc={resolveAutomotiveTileImage(svc.id)}
                />
                <div className="relative">
                  <h3 className="text-lg font-semibold">{svc.title}</h3>
                  <p className="mt-1 text-sm text-white/80">{svc.subtitle}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/90 opacity-0 transition group-hover:opacity-100">
                    Learn more <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {highlightItems.length > 0 ? (
        <CarouselSection
          title="News & highlights"
          subtitle="New arrivals, showroom updates, and customer stories"
          className="bg-neutral-50"
          id="newsroom"
        >
          {highlightItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="w-[280px] shrink-0 snap-start overflow-hidden rounded-lg border border-neutral-100 bg-white transition hover:shadow-md sm:w-[320px]"
            >
              <article>
                <div className="relative aspect-[16/10] bg-neutral-100">
                  <SmartProductImage
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover"
                    fallbackSrc={resolveDealershipBannerFallback(0)}
                    placeholderLabel={item.title}
                  />
                </div>
                <div className="p-4">
                  {item.date ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{item.date}</p>
                  ) : null}
                  <h3 className="mt-1 line-clamp-2 text-base font-semibold text-neutral-900">{item.title}</h3>
                  {item.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{item.excerpt}</p>
                  ) : null}
                </div>
              </article>
            </Link>
          ))}
        </CarouselSection>
      ) : null}

      <section className={cn('bg-white', tenvo ? 'py-8 sm:py-12' : 'py-10 sm:py-16')}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {cfg.welcomeTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              {tenvo
                ? 'Pakistan\'s first private SSS dealership. From your first test drive to modifications and nationwide parts delivery, trusted since 1979.'
                : 'From your first test drive to registration and beyond, we pair authorised brand partnerships with transparent pricing, in-house finance, and certified pre-owned programmes.'}
            </p>
            <Link
              href={`${storeBase}/contact`}
              className="mt-6 inline-flex items-center gap-2 rounded-sm bg-neutral-900 px-8 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
            >
              About us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {tenvo && cfg.aboutBlocks.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
              {cfg.aboutBlocks.map((block) => (
                <article key={block.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-5 sm:p-6">
                  <h3 className="text-lg font-semibold text-neutral-900">{block.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">{block.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="relative mt-10 aspect-[21/9] overflow-hidden rounded-lg">
              <SmartProductImage
                src="https://images.unsplash.com/photo-1533473359331-0135ef1b58dd?w=1600&q=85&auto=format&fit=crop"
                alt="Family lifestyle with car"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
