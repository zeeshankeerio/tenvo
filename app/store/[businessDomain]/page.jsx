import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { getProducts, getCategories } from '@/lib/actions/storefront/products';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';
import { getDomainConfig, getStoreAccentColor } from '@/lib/config/storefrontDomains';
import {
  Truck, Shield, RotateCcw, Star, Zap, Leaf, Clock, Gift,
  Lock, Tag, ArrowRight, ChevronRight, Package, Sparkles,
  ShoppingBag, TrendingUp, Heart, BadgePercent
} from 'lucide-react';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Store Not Found' };
  const { business } = result;
  return {
    title: `${business.business_name} — Online Store`,
    description: business.description || `Shop online at ${business.business_name}. Browse our collection of quality products.`,
    keywords: `${business.business_name}, online store, shop, ${business.city || ''}`,
    openGraph: {
      title: business.business_name,
      description: business.description,
      images: business.logo_url ? [{ url: business.logo_url }] : [],
    },
  };
}

// ─── Icon map for trust badges ────────────────────────────────────────────────
const BADGE_ICONS = {
  truck: Truck, shield: Shield, refresh: RotateCcw, star: Star,
  zap: Zap, leaf: Leaf, clock: Clock, gift: Gift, lock: Lock,
  tag: Tag, user: Shield, package: Package,
};

export default async function StoreHomePage({ params }) {
  const { businessDomain } = await params;

  const businessResult = await getBusinessByDomain(businessDomain);
  if (!businessResult.success) notFound();

  const { business, settings } = businessResult;

  if (businessResult.settings?.is_storefront_enabled === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Store Temporarily Unavailable</h1>
          <p className="text-gray-500">This store is currently not accepting orders. Please check back later.</p>
        </div>
      </div>
    );
  }

  const domainCfg = getDomainConfig(business.category);
  const accent = getStoreAccentColor(settings, business.category);
  const accentDark = domainCfg.accentDark;
  const accentLight = domainCfg.accentLight;

  // Fetch data in parallel — no hard inStock filter so all inventory items show
  const [featuredResult, newArrivalsResult, categoriesResult, onSaleResult, popularResult] = await Promise.all([
    getProducts(business.id, { limit: 8, sort: 'featured' }),
    getProducts(business.id, { limit: 8, sort: 'newest' }),
    getCategories(business.id),
    getProducts(business.id, { limit: 4, onSale: true }),
    getProducts(business.id, { limit: 4, sort: 'popularity' }),
  ]);

  const featuredProducts = featuredResult.success ? featuredResult.products : [];
  const newArrivals = newArrivalsResult.success ? newArrivalsResult.products : [];
  const categories = categoriesResult.success ? categoriesResult.categories : [];
  const onSaleProducts = onSaleResult.success ? onSaleResult.products : [];
  const popularProducts = popularResult.success ? popularResult.products : [];

  const heroImage = business.cover_image_url || domainCfg.heroImage;
  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Announcement Banner ─────────────────────────────────────────────── */}
      <div
        className="text-white text-center py-2.5 px-4 text-sm font-medium"
        style={{ backgroundColor: accent }}
      >
        <span className="inline-flex items-center gap-2">
          <Zap className="w-4 h-4" />
          {settings?.announcement || domainCfg.bannerText}
          <Zap className="w-4 h-4" />
        </span>
      </div>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: '520px' }}>
        {/* Background */}
        <div className="absolute inset-0">
          {heroImage ? (
            <img
              src={heroImage}
              alt={business.business_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }} className="w-full h-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-2xl">
            {/* Store badge */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: accent }}>
                  {business.business_name?.charAt(0)}
                </div>
              )}
              <span className="text-white/90 text-sm font-medium">{business.business_name}</span>
              {business.is_verified && (
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">✓ Verified</span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-4">
              {settings?.heroTitle || domainCfg.heroTagline}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 leading-relaxed">
              {business.description || domainCfg.heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/store/${businessDomain}/products`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg shadow-2xl transition-all hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: accent }}
              >
                <ShoppingBag className="w-5 h-5" />
                {domainCfg.ctaLabel}
              </Link>
              {categories.length > 0 && (
                <Link
                  href={`/store/${businessDomain}/products?category=${categories[0]?.slug}`}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg bg-white/15 backdrop-blur-sm border border-white/30 hover:bg-white/25 transition-all"
                >
                  Browse Categories
                  <ChevronRight className="w-5 h-5" />
                </Link>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 mt-10">
              {[
                { label: `${featuredResult.total || featuredProducts.length}+ Products`, icon: Package },
                { label: `Free Shipping over Rs. ${freeShippingThreshold.toLocaleString()}`, icon: Truck },
                { label: `${returnDays}-Day Returns`, icon: RotateCcw },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 text-white/80 text-sm">
                  <stat.icon className="w-4 h-4" />
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating product preview cards (desktop only) */}
        {featuredProducts.length >= 2 && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3">
            {featuredProducts.slice(0, 2).map((product) => (
              <Link
                key={product.id}
                href={`/store/${businessDomain}/products/${product.slug || product.id}`}
                className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 w-64"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm font-bold" style={{ color: accent }}>
                    Rs. {Number(product.price).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Category Chips ───────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide">
              <Link
                href={`/store/${businessDomain}/products`}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border-2 text-white"
                style={{ backgroundColor: accent, borderColor: accent }}
              >
                <ShoppingBag className="w-4 h-4" />
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/store/${businessDomain}/products?category=${cat.slug}`}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:border-current transition-all bg-white"
                  style={{ '--hover-color': accent }}
                >
                  {cat.image_url && (
                    <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  )}
                  {cat.name}
                  {cat.product_count > 0 && (
                    <span className="text-xs text-gray-400">({cat.product_count})</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust Badges ─────────────────────────────────────────────────────── */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {domainCfg.trustBadges.map((badge, i) => {
              const Icon = BADGE_ICONS[badge.icon] || Shield;
              return (
                <div key={i} className="flex items-center gap-4 group">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: accentLight }}
                  >
                    <Icon className="w-6 h-6" style={{ color: accent }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{badge.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{badge.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Category Cards Grid ──────────────────────────────────────────────── */}
      {categories.length >= 3 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Shop by Category</h2>
              <p className="text-gray-500 text-sm mt-1">Find exactly what you're looking for</p>
            </div>
            <Link
              href={`/store/${businessDomain}/products`}
              className="flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all"
              style={{ color: accent }}
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat, i) => {
              // Curated fallback images per index
              const fallbackImages = [
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=300&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80&auto=format&fit=crop',
              ];
              const imgSrc = cat.image_url || fallbackImages[i % fallbackImages.length];

              return (
                <Link
                  key={cat.id}
                  href={`/store/${businessDomain}/products?category=${cat.slug}`}
                  className="group relative overflow-hidden rounded-2xl aspect-square bg-gray-100 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <img
                    src={imgSrc}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight">{cat.name}</p>
                    {cat.product_count > 0 && (
                      <p className="text-white/70 text-xs mt-0.5">{cat.product_count} items</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured Products ────────────────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: accentLight }}>
                <Star className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">{domainCfg.featuredSectionTitle}</h2>
                <p className="text-gray-500 text-sm">Handpicked just for you</p>
              </div>
            </div>
            <Link
              href={`/store/${businessDomain}/products?sort=featured`}
              className="flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all"
              style={{ color: accent }}
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <Suspense fallback={<ProductsSkeleton count={8} />}>
            <ProductGrid products={featuredProducts} businessDomain={businessDomain} />
          </Suspense>
        </section>
      )}

      {/* ── Promotional Banner ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-12"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-bold">Special Offer</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Free Shipping on Orders Over Rs. {freeShippingThreshold.toLocaleString()}
              </h3>
              <p className="text-white/80">
                Shop more, save more. No promo code needed.
              </p>
            </div>
            <Link
              href={`/store/${businessDomain}/products`}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
              style={{ color: accent }}
            >
              Shop Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── New Arrivals ─────────────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: accentLight }}>
                <Zap className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">{domainCfg.newArrivalsSectionTitle}</h2>
                <p className="text-gray-500 text-sm">Fresh additions to our collection</p>
              </div>
            </div>
            <Link
              href={`/store/${businessDomain}/products?sort=newest`}
              className="flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all"
              style={{ color: accent }}
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <Suspense fallback={<ProductsSkeleton count={8} />}>
            <ProductGrid products={newArrivals} businessDomain={businessDomain} />
          </Suspense>
        </section>
      )}

      {/* ── On Sale Section ──────────────────────────────────────────────────── */}
      {onSaleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <BadgePercent className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">On Sale</h2>
                <p className="text-gray-500 text-sm">Limited time deals — grab them before they're gone</p>
              </div>
            </div>
            <Link
              href={`/store/${businessDomain}/products?onSale=true`}
              className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:gap-2 transition-all"
            >
              View All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <Suspense fallback={<ProductsSkeleton count={4} />}>
            <ProductGrid products={onSaleProducts} businessDomain={businessDomain} />
          </Suspense>
        </section>
      )}

      {/* ── Why Shop With Us ─────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-b py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Why Shop With Us?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              We're committed to giving you the best shopping experience possible.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: 'Secure Shopping',
                desc: 'Your data and payments are always protected with bank-level encryption.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                icon: Truck,
                title: 'Fast Delivery',
                desc: `Free shipping on orders over Rs. ${freeShippingThreshold.toLocaleString()}. Express options available.`,
                color: 'bg-green-50 text-green-600',
              },
              {
                icon: RotateCcw,
                title: `${returnDays}-Day Returns`,
                desc: 'Not satisfied? Return it within the return window, no questions asked.',
                color: 'bg-orange-50 text-orange-600',
              },
              {
                icon: Heart,
                title: 'Customer First',
                desc: 'Our support team is available to help you with any questions or concerns.',
                color: 'bg-pink-50 text-pink-600',
              },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className={`w-16 h-16 rounded-3xl ${item.color} flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Store Info Strip ─────────────────────────────────────────────────── */}
      {(business.phone || business.email || business.city) && (
        <section className="bg-gray-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={business.business_name} className="h-10 w-auto object-contain" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                    style={{ backgroundColor: accent }}
                  >
                    {business.business_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-white">{business.business_name}</p>
                  {business.city && <p className="text-gray-400 text-sm">{business.city}{business.country ? `, ${business.country}` : ''}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="hover:text-white transition-colors">
                    📞 {business.phone}
                  </a>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`} className="hover:text-white transition-colors">
                    ✉️ {business.email}
                  </a>
                )}
              </div>

              <Link
                href={`/store/${businessDomain}/products`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{ backgroundColor: accent }}
              >
                <ShoppingBag className="w-4 h-4" />
                Start Shopping
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Best Sellers ─────────────────────────────────────────────────────── */}
      {popularProducts.length > 0 && onSaleProducts.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: accentLight }}>
                <TrendingUp className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Best Sellers</h2>
                <p className="text-gray-500 text-sm">Our most popular products</p>
              </div>
            </div>
            <Link
              href={`/store/${businessDomain}/products?sort=popularity`}
              className="flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all"
              style={{ color: accent }}
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<ProductsSkeleton count={4} />}>
            <ProductGrid products={popularProducts} businessDomain={businessDomain} />
          </Suspense>
        </section>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {featuredProducts.length === 0 && newArrivals.length === 0 && popularProducts.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: accentLight }}>
            <Package className="w-12 h-12" style={{ color: accent }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Products Coming Soon</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {business.business_name} is setting up their store. Check back soon for amazing products!
          </p>
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              Contact Us
            </a>
          )}
        </section>
      )}

    </div>
  );
}
