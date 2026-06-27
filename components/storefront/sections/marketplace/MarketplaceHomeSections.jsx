'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ArrowRight, Shield, Percent, Calendar,
  Gauge, Circle, Sparkles, Battery, Droplet, MessageSquare, Newspaper,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { STORE_VEHICLE_RAIL_TRACK_CLASS, STORE_PRODUCT_RAIL_ITEM_CLASS } from '@/lib/utils/storefrontProductRail';
import { AutoBrandMarquee } from '@/components/storefront/sections/shared/AutoBrandMarquee';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { resolveAutomotiveTileImage } from '@/lib/storefront/storefrontImagePlaceholders';
import { MarketplaceMarketingBanners } from './MarketplaceMarketingBanners';
import {
  MARKETPLACE_POPULAR_BRANDS,
  MARKETPLACE_ALL_BRANDS,
  MARKETPLACE_BODY_TYPES,
  MARKETPLACE_USED_QUICK_LINKS,
  MARKETPLACE_ESHOP_CATEGORIES,
  MARKETPLACE_ARTICLES,
  MARKETPLACE_PROMOTIONS,
  MARKETPLACE_FORUM_TOPICS,
  MARKETPLACE_BLOG_POSTS,
  MARKETPLACE_UTILITY_ICONS,
  MARKETPLACE_BLUE,
  getMarketplaceResources,
  getMarketplaceConfig,
  getMarketplaceMarketingBanners,
  partitionMarketplaceInventory,
} from '@/lib/storefront/autoMarketplace';

const RESOURCE_ICONS = {
  shield: Shield,
  percent: Percent,
  calendar: Calendar,
  chart: Gauge,
  gauge: Gauge,
  circle: Circle,
};

const ESHOP_ICONS = {
  circle: Circle,
  sparkles: Sparkles,
  battery: Battery,
  wiper: ChevronRight,
  speaker: MessageSquare,
  droplet: Droplet,
};

function SectionHeader({ title, href, linkLabel = 'View All', accent = '#E30613' }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">{title}</h2>
      {href ? (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-semibold sm:text-sm" style={{ color: accent }}>
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function HorizontalCarousel({ children, className }) {
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

  const scroll = (dir) => trackRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });

  return (
    <div className={className}>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canLeft}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canRight}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div ref={trackRef} className={STORE_VEHICLE_RAIL_TRACK_CLASS}>
        {children}
      </div>
    </div>
  );
}

function MarketplaceVehicleCard({ product, businessDomain, businessCategory, currency, base, accent, className }) {
  const href = `${base}/products/${product.slug || product.id}`;
  const make = product.domain_data?.vehiclemake || product.brand || '';
  const model = product.domain_data?.vehiclemodel || '';
  const title = make && model ? `${make} ${model}` : product.name;
  const price = Number(product.display_price ?? product.price ?? 0);
  const imageSrc = getEffectiveProductImageUrl(product, businessCategory || 'auto-marketplace');
  const isRental = String(product.domain_data?.condition || '').toLowerCase() === 'rental';

  return (
    <Link
      href={href}
      className={cn(
        'group overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg',
        STORE_PRODUCT_RAIL_ITEM_CLASS,
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-neutral-100">
        <SmartProductImage
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          fallbackSrc={resolveAutomotiveTileImage(`${make} ${model}` || product.name)}
          placeholderLabel={title}
        />
        {product.is_featured ? (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            style={{ backgroundColor: accent }}
          >
            Featured
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="text-base font-semibold tabular-nums" style={{ color: accent }}>
          {formatCurrency(price, currency)}
          {isRental ? <span className="text-xs font-normal text-neutral-500"> /day</span> : null}
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-neutral-900">{title}</p>
        {product.domain_data?.modelyear ? (
          <p className="mt-0.5 text-xs text-neutral-500">{product.domain_data.modelyear}</p>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Sgcarmart-style marketplace homepage sections below the hero.
 */
export function MarketplaceHomeSections({
  businessDomain,
  businessCategory = 'auto-marketplace',
  products = [],
  currency = 'SGD',
  accent = '#E30613',
  base,
  settings = {},
}) {
  const storeBase = base || `/store/${businessDomain}`;
  const productsUrl = `${storeBase}/products`;
  const cfg = getMarketplaceConfig(settings);
  const resources = getMarketplaceResources(storeBase);
  const marketingBanners = getMarketplaceMarketingBanners(storeBase, settings);
  const secondary = MARKETPLACE_BLUE;

  const [brandTab, setBrandTab] = useState('popular');
  const [usedTab, setUsedTab] = useState('popular');
  const [newTab, setNewTab] = useState('popular');

  const { newCars, used, rental, parts } = partitionMarketplaceInventory(products);
  const brandList = brandTab === 'all' ? MARKETPLACE_ALL_BRANDS : MARKETPLACE_POPULAR_BRANDS;

  const filterByBody = (list, bodyKeyword) => {
    if (!bodyKeyword) return list;
    const kw = bodyKeyword.toLowerCase();
    return list.filter((p) => {
      const body = String(p?.domain_data?.bodytype || '').toLowerCase();
      const fuel = String(p?.domain_data?.fueltype || '').toLowerCase();
      if (kw === 'electric') return fuel.includes('electric');
      if (kw === 'hybrid') return fuel.includes('hybrid');
      if (kw === 'luxury') return body.includes('luxury');
      return body.includes(kw);
    });
  };

  const usedDisplay = usedTab === 'luxury'
    ? filterByBody(used, 'luxury')
    : usedTab === 'type'
      ? used
      : used;

  const newDisplay = newTab === 'launches'
    ? newCars.slice().sort((a, b) => String(b.domain_data?.modelyear || '').localeCompare(String(a.domain_data?.modelyear || '')))
    : newTab === 'type'
      ? newCars
      : newCars;

  return (
    <>
      {cfg.showMarketingBanners && marketingBanners.length > 0 ? (
        <MarketplaceMarketingBanners
          banners={marketingBanners}
          accent={accent}
          secondary={secondary}
          overlap
          className="-mt-10 sm:-mt-14"
        />
      ) : null}

      {/* Explore Car Brands */}
      <section className="border-b border-neutral-100 bg-white py-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Explore Car Brands" href={productsUrl} accent={accent} />
          <div className="mb-5 flex gap-2">
            {['popular', 'all'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBrandTab(tab)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-bold uppercase',
                  brandTab === tab ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <AutoBrandMarquee
            brands={brandList}
            productsUrl={productsUrl}
            variant="marketplace"
            layout="grid"
            accent={accent}
            viewAllLabel="View all brands"
            className="mb-2"
          />
        </div>
      </section>

      {/* Explore Used Cars */}
      <section className="bg-neutral-50 py-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Explore Used Cars" href={`${productsUrl}?condition=pre-owned`} accent={accent} />
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { id: 'popular', label: 'Popular' },
              { id: 'luxury', label: 'Luxury' },
              { id: 'type', label: 'By Type' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setUsedTab(tab.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-bold uppercase',
                  usedTab === tab.id ? 'text-white' : 'bg-white text-neutral-600 border border-neutral-200'
                )}
                style={usedTab === tab.id ? { backgroundColor: accent } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {usedDisplay.length > 0 ? (
            <HorizontalCarousel>
              {usedDisplay.slice(0, 12).map((p) => (
                <MarketplaceVehicleCard key={p.id} product={p} businessDomain={businessDomain} businessCategory={businessCategory} currency={currency} base={storeBase} accent={accent} />
              ))}
            </HorizontalCarousel>
          ) : (
            <p className="py-6 text-center text-sm text-neutral-500">No used cars listed yet.</p>
          )}

          {usedTab === 'type' && (
            <div className="mt-6 flex flex-wrap gap-2">
              {MARKETPLACE_BODY_TYPES.map((t) => (
                <Link
                  key={t}
                  href={`${productsUrl}?condition=pre-owned&body=${encodeURIComponent(t)}`}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-[#E30613]"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MARKETPLACE_USED_QUICK_LINKS.map((link) => (
              <Link
                key={link.id}
                href={`${productsUrl}${link.hrefSuffix}`}
                className="rounded-lg border border-neutral-200 bg-white p-3 text-center text-xs font-semibold text-neutral-800 transition hover:border-neutral-900 hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore New Cars */}
      <section className="border-b border-neutral-100 bg-white py-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Explore New Cars" href={`${productsUrl}?condition=new`} accent={accent} />
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { id: 'popular', label: 'Popular' },
              { id: 'launches', label: 'Launches' },
              { id: 'type', label: 'By Type' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNewTab(tab.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold uppercase transition',
                  newTab === tab.id ? 'text-white shadow-sm' : 'bg-neutral-100 text-neutral-600'
                )}
                style={newTab === tab.id ? { backgroundColor: accent } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {newDisplay.length > 0 ? (
            <HorizontalCarousel>
              {newDisplay.slice(0, 12).map((p) => (
                <MarketplaceVehicleCard key={p.id} product={p} businessDomain={businessDomain} businessCategory={businessCategory} currency={currency} base={storeBase} accent={accent} />
              ))}
            </HorizontalCarousel>
          ) : (
            <p className="py-6 text-center text-sm text-neutral-500">No new cars listed yet.</p>
          )}

          {newTab === 'type' && (
            <div className="mt-6 flex flex-wrap gap-2">
              {MARKETPLACE_BODY_TYPES.map((t) => (
                <Link
                  key={t}
                  href={`${productsUrl}?condition=new&body=${encodeURIComponent(t)}`}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Valuation CTA */}
      <section className="bg-neutral-50 py-8">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <Link
            href={`${storeBase}/contact?sell=1`}
            className="group flex flex-col overflow-hidden rounded-2xl bg-neutral-900 sm:flex-row sm:items-stretch"
          >
            <div className="relative min-h-[140px] flex-1 p-6 sm:p-8">
              <Gauge className="mb-3 h-8 w-8 text-[#ffd700]" />
              <h3 className="text-xl font-semibold text-white sm:text-2xl">Free car valuation</h3>
              <p className="mt-2 max-w-lg text-sm text-white/85">
                Get the true value of your car. Sell or trade-in with confidence through our portal partners.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#ffd700]">
                Get valuation <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="relative hidden min-h-[140px] w-full sm:block sm:w-[38%] lg:w-[32%]">
              <SmartProductImage
                src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80&auto=format&fit=crop"
                alt=""
                fill
                className="object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/40 to-transparent" />
            </div>
          </Link>
        </div>
      </section>

      {/* Explore Rental Cars */}
      <section className="border-b border-neutral-100 bg-white py-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Explore Rental Cars" href={`${productsUrl}?condition=rental`} accent={accent} />
          {rental.length > 0 ? (
            <>
              <HorizontalCarousel>
                {rental.slice(0, 8).map((p) => (
                  <MarketplaceVehicleCard key={p.id} product={p} businessDomain={businessDomain} businessCategory={businessCategory} currency={currency} base={storeBase} accent={accent} />
                ))}
              </HorizontalCarousel>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Daily rental', href: `${productsUrl}?condition=rental` },
                  { label: 'P-plate friendly', href: `${productsUrl}?condition=rental&search=P-plate` },
                  { label: 'Monthly lease', href: `${productsUrl}?condition=rental&search=Monthly` },
                  { label: 'Commercial vans', href: `${productsUrl}?condition=rental&body=Van` },
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-center text-xs font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-neutral-500">No rental cars listed yet.</p>
          )}
        </div>
      </section>

      {/* New Car Promotions */}
      <section className="bg-neutral-50 py-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeader title="New Car Promotions" href={`${productsUrl}?condition=new`} linkLabel="View promo" accent={accent} />
          <div className="hidden gap-4 lg:grid lg:grid-cols-3">
            {MARKETPLACE_PROMOTIONS.slice(0, 6).map((promo) => (
              <Link
                key={promo.id}
                href={promo.href || productsUrl}
                className="group overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-[16/9]">
                  <SmartProductImage
                    src={promo.image}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    fallbackSrc={resolveAutomotiveTileImage(promo.title)}
                  />
                  {promo.badge ? (
                    <span
                      className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {promo.badge}
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-neutral-900">{promo.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{promo.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="lg:hidden">
            <HorizontalCarousel>
              {MARKETPLACE_PROMOTIONS.map((promo) => (
                <Link
                  key={promo.id}
                  href={promo.href || productsUrl}
                  className="w-[280px] shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm sm:w-[320px]"
                >
                  <div className="relative aspect-[16/9]">
                    <SmartProductImage src={promo.image} alt="" fill className="object-cover" fallbackSrc={resolveAutomotiveTileImage(promo.title)} />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-neutral-900">{promo.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{promo.subtitle}</p>
                  </div>
                </Link>
              ))}
            </HorizontalCarousel>
          </div>
        </div>
      </section>

      {/* Resources */}
      {cfg.showArticles !== false && (
        <section id="resources" className="border-b border-neutral-100 bg-white py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <SectionHeader title="Resources" href={`${storeBase}#resources`} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((res) => {
                const Icon = RESOURCE_ICONS[res.icon] || Shield;
                return (
                  <Link
                    key={res.id}
                    href={res.href}
                    className="group flex gap-4 rounded-lg border border-neutral-100 bg-neutral-50 p-4 transition hover:border-[#003DA5] hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#003DA5]/10 text-[#003DA5]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">{res.title}</h3>
                      <p className="mt-1 text-sm text-neutral-600">{res.subtitle}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#E30613] opacity-0 transition group-hover:opacity-100">
                        Learn more <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {MARKETPLACE_UTILITY_ICONS.map((util) => (
                <Link
                  key={util.id}
                  href={`${storeBase}${util.hrefSuffix}`}
                  className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-[#E30613] hover:text-[#E30613]"
                >
                  {util.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* e-Shop */}
      {cfg.showEShop !== false && (
        <section id="eshop" className="bg-neutral-50 py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <SectionHeader title="e-Shop" href={`${productsUrl}?category=tyres`} />
            <div className="mb-6 flex flex-wrap gap-3">
              {MARKETPLACE_ESHOP_CATEGORIES.map((cat) => {
                const Icon = ESHOP_ICONS[cat.icon] || Circle;
                return (
                  <Link
                    key={cat.id}
                    href={`${productsUrl}?category=${encodeURIComponent(cat.slug)}`}
                    className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center transition hover:border-[#E30613]"
                  >
                    <Icon className="h-5 w-5 text-[#003DA5]" />
                    <span className="text-xs font-semibold text-neutral-800">{cat.label}</span>
                  </Link>
                );
              })}
            </div>

            {parts.length > 0 ? (
              <ProductGrid
                products={parts}
                catalogPool={products}
                businessDomain={businessDomain}
                showResultsCount={false}
                density="showcase"
                layout="rail"
              />
            ) : (
              <p className="py-6 text-center text-sm text-neutral-500">Parts & accessories coming soon.</p>
            )}
          </div>
        </section>
      )}

      {/* Articles */}
      {cfg.showArticles !== false && (
        <section id="articles" className="border-b border-neutral-100 bg-white py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <SectionHeader title="Articles" href={`${storeBase}#articles`} />
            <div className="mb-6 overflow-hidden rounded-lg">
              <Link href={MARKETPLACE_ARTICLES[0]?.href || '#'} className="group relative block aspect-[21/9] bg-neutral-900">
                <SmartProductImage src={MARKETPLACE_ARTICLES[0]?.image} alt="" fill className="object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#ffd700]">Featured</p>
                  <h3 className="mt-1 text-xl font-bold text-white sm:text-2xl">{MARKETPLACE_ARTICLES[0]?.title}</h3>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/85">{MARKETPLACE_ARTICLES[0]?.excerpt}</p>
                </div>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MARKETPLACE_ARTICLES.slice(1).map((article) => (
                <article key={article.id} className="overflow-hidden rounded-lg border border-neutral-100 bg-white">
                  <div className="relative aspect-[16/10]">
                    <SmartProductImage src={article.image} alt="" fill className="object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-semibold uppercase text-neutral-400">{article.date}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-bold text-neutral-900">{article.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Forum + Blog */}
      {cfg.showForum !== false && (
        <section id="forum" className="bg-neutral-50 py-10">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#003DA5]" />
                  <h2 className="text-lg font-bold text-neutral-900">Forum</h2>
                </div>
                <ul className="space-y-3">
                  {MARKETPLACE_FORUM_TOPICS.map((topic) => (
                    <li key={topic.id}>
                      <Link
                        href={topic.href}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 transition hover:border-[#003DA5]"
                      >
                        <span className="text-sm font-medium text-neutral-900">{topic.title}</span>
                        <span className="text-xs text-neutral-500">{topic.replies} replies</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={`${storeBase}/contact`} className="mt-4 inline-flex text-sm font-bold text-[#E30613]">
                  Visit Forum <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-[#003DA5]" />
                  <h2 className="text-lg font-bold text-neutral-900">Blog</h2>
                </div>
                <ul className="space-y-3">
                  {MARKETPLACE_BLOG_POSTS.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={post.href}
                        className="block rounded-lg border border-neutral-200 bg-white px-4 py-3 transition hover:border-[#003DA5]"
                      >
                        <p className="text-sm font-medium text-neutral-900">{post.title}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{post.date}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
