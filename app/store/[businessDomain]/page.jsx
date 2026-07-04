import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { getProducts, getCategories } from '@/lib/actions/storefront/products';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { getDomainConfig, getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { getMergedStorefrontHero } from '@/lib/storefront/mergeHero';
import { getStoreHomeCopy } from '@/lib/storefront/storeCopy';
import { getDomainLanding } from '@/lib/storefront/domainLanding';
import { getHeroPreset, usesFinderHero } from '@/lib/storefront/heroPresets';
import { isImmersiveFinderHero, resolveStorefrontCurrency } from '@/lib/storefront/storefrontRegional';
import { isPharmacyElevatedStore, formatPharmacyStoreName, getPharmacyHeroSlides, resolvePharmacyQuickSearchTerms } from '@/lib/storefront/pharmacyStorefront';
import { isFurnitureElevatedStore, formatFurnitureStoreName, getFurnitureHeroSlides, resolveFurnitureQuickSearchTerms } from '@/lib/storefront/furnitureStorefront';
import { isRestaurantElevatedStore, formatRestaurantStoreName, getRestaurantHeroSlides, resolveRestaurantQuickSearchTerms } from '@/lib/storefront/restaurantStorefront';
import { isFitnessElevatedStore, formatFitnessStoreName, getFitnessHeroSlides, resolveFitnessHeroQuickLinks, resolveFitnessShowcaseProducts } from '@/lib/storefront/fitnessStorefront';
import { resolveSupermarketShowcaseProducts } from '@/lib/dataLab/supermarketSeedHelpers';
import { resolveRestaurantShowcaseProducts } from '@/lib/dataLab/restaurantSeedHelpers';
import {
  isSupermarketElevatedStore,
  formatSupermarketStoreName,
  getSupermarketHeroSlides,
  resolveSupermarketQuickSearchTerms,
} from '@/lib/storefront/supermarketStorefront';
import { getTenantMeetingUrl, shouldOfferTenantMeetingLink } from '@/lib/storefront/storefrontBooking';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { TENVO_VEHICLES_METADATA } from '@/lib/storefront/tenvoVehiclesAssets';
import { isAutoMarketplaceStore } from '@/lib/storefront/autoMarketplace';
import { resolveStoreContact } from '@/lib/storefront/businessContact';
import { StoreBuyerSupportStrip } from '@/components/storefront/StoreBuyerSupportStrip';
import { DomainHeroRouter } from '@/components/storefront/sections/DomainHeroRouter';
import { DomainQuickActions } from '@/components/storefront/sections/DomainQuickActions';
import { DomainDealStrip } from '@/components/storefront/sections/DomainDealStrip';
import { DomainEditorialSpotlight } from '@/components/storefront/sections/DomainEditorialSpotlight';
import { StoreMarketingSections } from '@/components/storefront/sections/StoreMarketingSections';
import { TopCollectionsCarousel } from '@/components/storefront/sections/TopCollectionsCarousel';
import { TopPicksSection } from '@/components/storefront/sections/TopPicksSection';
import { FashionDepartmentSections } from '@/components/storefront/sections/fashion/FashionDepartmentSections';
import { FashionCircleShowcase } from '@/components/storefront/sections/fashion/FashionCircleShowcase';
import { StoreReveal } from '@/components/storefront/effects/StoreReveal';
import { trimToShowcaseRows } from '@/lib/storefront/showcaseProducts';
import { ensureRailProducts } from '@/lib/utils/storefrontProductRail';
import { buildTopCollections, getTopCollectionsTitle } from '@/lib/storefront/topCollections';
import { buildTopPicksProducts } from '@/lib/storefront/topPicks';
import { buildFashionHomeSections } from '@/lib/storefront/fashionHomeSections';
import { getFashionEditorialConfig } from '@/lib/storefront/fashionEditorial';
import { DealershipHomeSections } from '@/components/storefront/sections/dealership/DealershipHomeSections';
import { MarketplaceHomeSections } from '@/components/storefront/sections/marketplace/MarketplaceHomeSections';
import { PharmacyHomeSections } from '@/components/storefront/sections/pharmacy/PharmacyHomeSections';
import { FurnitureHomeSections } from '@/components/storefront/sections/furniture/FurnitureHomeSections';
import { RestaurantHomeSections } from '@/components/storefront/sections/restaurant/RestaurantHomeSections';
import { FitnessHomeSections } from '@/components/storefront/sections/fitness/FitnessHomeSections';
import { SupermarketHomeSections } from '@/components/storefront/sections/supermarket/SupermarketHomeSections';
import { SupermarketFeedLayout } from '@/components/storefront/supermarket/SupermarketFeedLayout';
import { AutoPartsHomeSections } from '@/components/storefront/sections/autoparts/AutoPartsHomeSections';
import { isAutoPartsStore } from '@/lib/storefront/autoParts';
import { cn } from '@/lib/utils';
import {
  Truck, RotateCcw,
  ArrowRight, ChevronRight, Package, Sparkles,
  ShoppingBag
} from 'lucide-react';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  if (!result.success) return { title: 'Store Not Found' };
  const { business } = result;
  const storeName = isPharmacyElevatedStore(business.category)
    ? formatPharmacyStoreName(business.business_name)
    : isFurnitureElevatedStore(business.category)
      ? formatFurnitureStoreName(business.business_name)
      : isRestaurantElevatedStore(business.category)
        ? formatRestaurantStoreName(business.business_name)
        : isFitnessElevatedStore(business.category)
          ? formatFitnessStoreName(business.business_name)
          : business.business_name;

  let description = business.description;
  let keywords = `${storeName}, online store, ${business.city || 'Pakistan'}`;

  if (isPharmacyElevatedStore(business.category)) {
    description = description || `Shop genuine medicines and wellness products at ${storeName}. Browse OTC, vitamins, personal care, and more.`;
    keywords = `${storeName}, online pharmacy, medicines${business.city ? `, ${business.city}` : ''}`;
  } else if (isAutoDealershipStore(business.category)) {
    description = description || TENVO_VEHICLES_METADATA.description;
    keywords = business.keywords || TENVO_VEHICLES_METADATA.keywords;
  } else if (isAutoMarketplaceStore(business.category)) {
    description = description || `Search new and used cars, rentals, and auto parts at ${storeName}.`;
    keywords = `${storeName}, cars, used cars, auto marketplace, ${business.city || 'Singapore'}`;
  } else if (isFurnitureElevatedStore(business.category)) {
    description = description || `Shop modern sofas, beds, dining sets, and storage at ${storeName}.`;
    keywords = `${storeName}, furniture store, sofas, beds${business.city ? `, ${business.city}` : ''}`;
  } else if (isRestaurantElevatedStore(business.category)) {
    description = description || `Order fresh meals and catering from ${storeName}. Browse the live menu with delivery and pickup options.`;
    keywords = `${storeName}, online menu, food ordering${business.city ? `, ${business.city}` : ''}`;
  } else if (isFitnessElevatedStore(business.category)) {
    description = description || `Train wild at ${storeName}. Shop supplements, memberships, and book personal training online.`;
    keywords = `${storeName}, gym, fitness, supplements${business.city ? `, ${business.city}` : ''}`;
  } else if (isSupermarketElevatedStore(business.category)) {
    description = description || `Shop fresh groceries and daily essentials at ${storeName}. Same-day delivery on pantry staples, produce, and household favourites.`;
    keywords = `${storeName}, online grocery, supermarket${business.city ? `, ${business.city}` : ''}`;
  } else {
    description = description || `Shop online at ${storeName}.`;
  }

  return {
    title: `${storeName}, Online Store`,
    description,
    keywords,
    openGraph: {
      title: business.business_name,
      description: business.description,
      type: 'website',
      images: business.logo_url?.startsWith('https://') ? [{ url: business.logo_url }] : [],
    },
  };
}

function StoreSectionHeader({ title, subtitle, href, accent, linkLabel = 'View all' }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <h2 className="store-heading truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 text-xs font-bold sm:text-sm"
          style={{ color: accent }}
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

export default async function StoreHomePage({ params }) {
  const { businessDomain } = await params;

  const businessResult = await getBusinessByDomain(businessDomain);
  if (!businessResult.success) notFound();

  const { business, settings } = businessResult;
  const storeCurrency = resolveStorefrontCurrency(settings, business);
  const domainCfg = getDomainConfig(business.category);
  const accent = getStoreAccentColor(settings, business.category);
  const accentDark = domainCfg.accentDark;
  const accentLight = domainCfg.accentLight;
  const hero = getMergedStorefrontHero({ settings, domainCfg, business });
  const landing = getDomainLanding(business.category, businessDomain, settings, business);
  const heroPreset = getHeroPreset(business.category, businessDomain, settings, business);
  const immersiveHero = usesFinderHero(business.category);
  const finderHero = isImmersiveFinderHero(heroPreset.type);
  const editorialHero = heroPreset.type === 'fashion-editorial';
  const dealershipHero = heroPreset.type === 'auto-dealership';
  const marketplaceHero = heroPreset.type === 'auto-marketplace';
  const pharmacyElevatedHero = heroPreset.type === 'pharmacy-elevated';
  const furnitureElevatedHero = heroPreset.type === 'furniture-elevated';
  const restaurantElevatedHero = heroPreset.type === 'restaurant-elevated';
  const fitnessElevatedHero = heroPreset.type === 'fitness-elevated';
  const supermarketElevatedHero = heroPreset.type === 'supermarket-elevated';
  const autoPartsHero = finderHero && isAutoPartsStore(business.category);
  const skipHomeNavSections = finderHero || editorialHero || dealershipHero || marketplaceHero || pharmacyElevatedHero || furnitureElevatedHero || restaurantElevatedHero || fitnessElevatedHero || supermarketElevatedHero;
  const copy = getStoreHomeCopy(business, domainCfg, landing);
  const contact = resolveStoreContact({ business, settings });

  const needsCatalogBackfill = !editorialHero && !dealershipHero && !marketplaceHero && !autoPartsHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero;

  const [featuredResult, newArrivalsResult, categoriesResult, onSaleResult, topCatalogResult, catalogSnapshotResult, dealershipCatalogResult, marketplaceCatalogResult, pharmacyCatalogResult, furnitureCatalogResult, restaurantCatalogResult, fitnessCatalogResult, supermarketCatalogResult, autoPartsCatalogResult, catalogBackfillResult] = await Promise.all([
    getProducts(business.id, { limit: 12, sort: 'featured' }),
    getProducts(business.id, { limit: 16, sort: 'newest' }),
    getCategories(business.id),
    getProducts(business.id, { limit: 12, onSale: true }),
    editorialHero
      ? getProducts(business.id, { limit: 40, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    editorialHero
      ? getProducts(business.id, { limit: 80, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    dealershipHero
      ? getProducts(business.id, { limit: 24, sort: 'featured' })
      : Promise.resolve({ success: false, products: [] }),
    marketplaceHero
      ? getProducts(business.id, { limit: 40, sort: 'featured' })
      : Promise.resolve({ success: false, products: [] }),
    pharmacyElevatedHero
      ? getProducts(business.id, { limit: 48, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    furnitureElevatedHero
      ? getProducts(business.id, { limit: 48, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    restaurantElevatedHero
      ? getProducts(business.id, { limit: 48, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    fitnessElevatedHero
      ? getProducts(business.id, { limit: 48, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    supermarketElevatedHero
      ? getProducts(business.id, { limit: 48, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
    autoPartsHero
      ? getProducts(business.id, { limit: 48, sort: 'featured' })
      : Promise.resolve({ success: false, products: [] }),
    needsCatalogBackfill
      ? getProducts(business.id, { limit: 12, sort: 'popularity' })
      : Promise.resolve({ success: false, products: [] }),
  ]);

  const featuredProducts = featuredResult.success ? featuredResult.products : [];
  const newArrivalsRaw = newArrivalsResult.success ? newArrivalsResult.products : [];
  const categories = categoriesResult.success ? categoriesResult.categories : [];
  const onSaleProductsRaw = onSaleResult.success ? onSaleResult.products : [];

  const featuredIds = new Set(featuredProducts.map((p) => p.id));
  const newArrivals = newArrivalsRaw.filter((p) => !featuredIds.has(p.id));
  const homepagePriorIds = new Set([...featuredIds, ...newArrivals.map((p) => p.id)]);
  const onSaleProducts = onSaleProductsRaw.filter((p) => !homepagePriorIds.has(p.id)).slice(0, 12);
  const popularityBackfill = catalogBackfillResult.success ? catalogBackfillResult.products : newArrivalsRaw;
  const featuredForRow = needsCatalogBackfill
    ? buildTopPicksProducts(featuredProducts, popularityBackfill, 12)
    : featuredProducts;
  const featuredRow = trimToShowcaseRows(
    ensureRailProducts(featuredForRow, popularityBackfill, 6, 12),
    6,
    1
  );
  const onSaleRow = trimToShowcaseRows(
    ensureRailProducts(onSaleProducts, popularityBackfill, 6, 12),
    6,
    1
  );
  const newArrivalsRow = trimToShowcaseRows(newArrivals, 6, 2);

  const catalogTotal = featuredResult.total ?? newArrivalsResult.total ?? featuredProducts.length;
  const showNewArrivals = newArrivals.length > 0 && catalogTotal > featuredProducts.length;

  const heroImage = business.cover_image_url || domainCfg.heroImage;
  const freeShippingThreshold = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays ?? 7;
  const categoryFallbackImage = domainCfg.categoryImages?.default || domainCfg.heroImage;
  const topCollections = editorialHero && topCatalogResult.success
    ? buildTopCollections({
        products: topCatalogResult.products,
        categories,
        businessDomain,
        businessCategory: business.category,
      })
    : [];
  const topCollectionsTitle = getTopCollectionsTitle(business.country || settings?.contact?.country);
  const topPicksProducts = editorialHero
    ? buildTopPicksProducts(
        featuredProducts,
        topCatalogResult.success ? topCatalogResult.products : [],
        12
      )
    : [];
  const fashionConfig = editorialHero ? getFashionEditorialConfig(settings) : null;
  const fashionDepartments = editorialHero
    ? (() => {
        const built = buildFashionHomeSections({
          businessDomain,
          businessCategory: business.category,
          categories,
          products: catalogSnapshotResult.success ? catalogSnapshotResult.products : [],
          newArrivalProducts: newArrivalsRaw,
          offerProducts: onSaleProductsRaw,
        });
        if (!built || !fashionConfig) return built;
        return {
          ...built,
          unstitched: {
            ...built.unstitched,
            title: fashionConfig.unstitchedTitle || built.unstitched.title,
            show: built.unstitched.show && fashionConfig.showUnstitched,
          },
          readyToWear: {
            ...built.readyToWear,
            title: fashionConfig.readyToWearTitle || built.readyToWear.title,
            show: built.readyToWear.show && fashionConfig.showReadyToWear,
          },
          accessories: {
            ...built.accessories,
            title: fashionConfig.accessoriesTitle || built.accessories.title,
            show: built.accessories.show && fashionConfig.showAccessories,
          },
          offers: {
            ...built.offers,
            title: fashionConfig.offersTitle || built.offers.title,
            show: built.offers.show && fashionConfig.showOffers,
          },
          newArrivals: {
            ...built.newArrivals,
            title: fashionConfig.newArrivalsTitle || built.newArrivals.title,
            show: built.newArrivals.show && fashionConfig.showNewArrivals,
          },
        };
      })()
    : null;

  const pharmacyProducts = pharmacyCatalogResult.success
    ? pharmacyCatalogResult.products
    : buildTopPicksProducts(featuredProducts, popularityBackfill, 48);

  const furnitureProducts = furnitureCatalogResult.success
    ? furnitureCatalogResult.products
    : buildTopPicksProducts(featuredProducts, popularityBackfill, 48);

  const restaurantProducts = resolveRestaurantShowcaseProducts(
    restaurantCatalogResult.success
      ? restaurantCatalogResult.products
      : buildTopPicksProducts(featuredProducts, popularityBackfill, 48),
    businessDomain,
    business.category
  );

  const fitnessProducts = resolveFitnessShowcaseProducts(
    fitnessCatalogResult.success
      ? fitnessCatalogResult.products
      : buildTopPicksProducts(featuredProducts, popularityBackfill, 48),
    businessDomain
  );

  const supermarketProducts = resolveSupermarketShowcaseProducts(
    supermarketCatalogResult.success
      ? supermarketCatalogResult.products
      : buildTopPicksProducts(featuredProducts, popularityBackfill, 48),
    businessDomain,
    business.category
  );

  const restaurantStoreName = formatRestaurantStoreName(business.business_name);
  const fitnessStoreName = formatFitnessStoreName(business.business_name);
  const pharmacyStoreName = formatPharmacyStoreName(business.business_name);
  const furnitureStoreName = formatFurnitureStoreName(business.business_name);
  const supermarketStoreName = formatSupermarketStoreName(business.business_name);
  const coverImageUrl = business.cover_image_url?.startsWith('http') ? business.cover_image_url : null;

  const tenantMeetingUrl = shouldOfferTenantMeetingLink(business, business.category, settings)
    ? getTenantMeetingUrl(business, settings)
    : null;

  const immersiveHeroPreset = fitnessElevatedHero
    ? {
        ...heroPreset,
        settings,
        storeName: fitnessStoreName,
        businessCategory: business.category,
        meetingUrl: tenantMeetingUrl || undefined,
        coverImage: coverImageUrl,
        country: business.country || settings?.contact?.country || null,
        categories,
        quickLinks: resolveFitnessHeroQuickLinks(
          heroPreset.base,
          settings,
          fitnessProducts,
          categories,
          businessDomain
        ),
        slides: getFitnessHeroSlides(heroPreset.base, settings, {
          storeName: fitnessStoreName,
          businessDomain,
          businessDescription: business.description || settings?.description,
          coverImage: coverImageUrl,
          products: fitnessProducts,
        }),
      }
    : supermarketElevatedHero
    ? {
        ...heroPreset,
        settings,
        storeName: supermarketStoreName,
        businessCategory: business.category,
        contactCity: business.city || settings?.contact?.city || null,
        quickSearchTerms: resolveSupermarketQuickSearchTerms(
          settings,
          supermarketProducts,
          categories,
          businessDomain,
          business.category
        ),
        slides: getSupermarketHeroSlides(heroPreset.base, settings, {
          storeName: supermarketStoreName,
          businessDomain,
          businessCategory: business.category,
          businessDescription: business.description || settings?.description,
          coverImage: coverImageUrl,
          products: supermarketProducts,
        }),
      }
    : restaurantElevatedHero
    ? {
        ...heroPreset,
        settings,
        storeName: restaurantStoreName,
        businessCategory: business.category,
        quickSearchTerms: resolveRestaurantQuickSearchTerms(settings, restaurantProducts, categories),
        slides: getRestaurantHeroSlides(heroPreset.base, settings, {
          storeName: restaurantStoreName,
          businessDomain,
          businessDescription: business.description || settings?.description,
          coverImage: coverImageUrl,
          products: restaurantProducts,
        }),
      }
    : pharmacyElevatedHero
      ? {
          ...heroPreset,
          settings,
          storeName: pharmacyStoreName,
          businessCategory: business.category,
          quickSearchTerms: resolvePharmacyQuickSearchTerms(settings, pharmacyProducts, categories, businessDomain),
          slides: getPharmacyHeroSlides(heroPreset.base, settings, {
            storeName: pharmacyStoreName,
            businessDomain,
            businessDescription: business.description || settings?.description,
            coverImage: coverImageUrl,
            products: pharmacyProducts,
          }),
        }
      : furnitureElevatedHero
        ? {
            ...heroPreset,
            settings,
            storeName: furnitureStoreName,
            businessCategory: business.category,
            quickSearchTerms: resolveFurnitureQuickSearchTerms(settings, furnitureProducts, categories, businessDomain),
            slides: getFurnitureHeroSlides(heroPreset.base, settings, {
              storeName: furnitureStoreName,
              businessDomain,
              businessDescription: business.description || settings?.description,
              coverImage: coverImageUrl,
              products: furnitureProducts,
            }),
          }
        : editorialHero
          ? { ...heroPreset, hideRating: fashionConfig ? !fashionConfig.showHeroRating : false }
          : heroPreset;

  const autoPartsProducts = autoPartsCatalogResult.success
    ? autoPartsCatalogResult.products
    : buildTopPicksProducts(featuredProducts, popularityBackfill, 48);

  return (
    <div className={cn(
      'min-h-screen antialiased selection:bg-slate-200',
      fitnessElevatedHero
        ? 'bg-black text-white'
        : editorialHero
          ? 'bg-stone-50 text-slate-900'
          : dealershipHero || marketplaceHero || pharmacyElevatedHero || furnitureElevatedHero || restaurantElevatedHero || supermarketElevatedHero || autoPartsHero
            ? restaurantElevatedHero
              ? 'bg-zinc-50 text-zinc-900'
              : 'bg-white text-slate-900'
            : 'bg-slate-50 text-slate-900'
    )}>

      {/* ── Announcement Banner ─────────────────────────────────────────────── */}
      {hero.banner && !editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero ? (
        <div
          className="md:hidden text-white text-center py-2 px-4 text-xs font-medium truncate"
          style={{ backgroundColor: accent }}
        >
          {hero.banner}
        </div>
      ) : null}

      {supermarketElevatedHero ? (
        <SupermarketFeedLayout
          storeBase={heroPreset.base}
          settings={settings}
          businessDomain={businessDomain}
          accent={accent}
        >
          <DomainHeroRouter
            preset={{ ...immersiveHeroPreset, contactCity: contact.city || settings?.contact?.city || business.city }}
            businessDomain={businessDomain}
            accent={accent}
            accentDark={accentDark}
          />
          <StoreMarketingSections
            sections={settings?.pageSections}
            businessDomain={businessDomain}
            accent={accent}
            placement="after-hero"
          />
          <SupermarketHomeSections
            businessDomain={businessDomain}
            businessCategory={business.category}
            categories={categories}
            products={supermarketProducts}
            currency={storeCurrency}
            accent={accent}
            base={heroPreset.base}
            settings={settings}
            storeName={supermarketStoreName}
            freeShippingThreshold={freeShippingThreshold}
          />
        </SupermarketFeedLayout>
      ) : immersiveHero ? (
        <>
        <DomainHeroRouter
          preset={{ ...immersiveHeroPreset, contactCity: contact.city || settings?.contact?.city || business.city }}
          businessDomain={businessDomain}
          accent={accent}
          accentDark={accentDark}
        />
        <StoreMarketingSections
          sections={settings?.pageSections}
          businessDomain={businessDomain}
          accent={accent}
          placement="after-hero"
        />
        </>
      ) : (
      /* ── Hero Section (general retail) ─────────────────────────────────── */
      <section className="relative overflow-hidden min-h-[240px] sm:min-h-[380px] lg:min-h-[520px] store-hero">
        {/* Background */}
        <div className="absolute inset-0">
          {heroImage ? (
            <SmartProductImage
              src={heroImage}
              alt={business.business_name}
              fill
              className="object-cover"
            />
          ) : (
            <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)` }} className="w-full h-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/25" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-4 sm:mb-6 max-w-full">
              {business.logo_url ? (
                <SmartProductImage src={business.logo_url} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover" width={20} height={20} />
              ) : (
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold"
                  style={{ backgroundColor: accent }}>
                  {business.business_name?.charAt(0)}
                </div>
              )}
              <span className="text-white/90 text-xs sm:text-sm font-medium truncate">{business.business_name}</span>
              {business.is_verified && (
                <span className="hidden sm:inline bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Verified</span>
              )}
            </div>

            <h1 className="store-heading store-heading--inverse text-2xl sm:text-5xl lg:text-6xl font-black leading-tight mb-2 sm:mb-4 tracking-tight">
              {hero.title}
            </h1>
            {hero.subtitle ? (
              <p className="store-hero-subtitle text-sm sm:text-xl mb-4 sm:mb-8 leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-none">
                {hero.subtitle}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link
                href={`/store/${businessDomain}/products`}
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white text-sm sm:text-lg shadow-xl transition-all active:scale-[0.98] sm:hover:scale-105"
                style={{ backgroundColor: accent }}
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                {copy.heroCta}
              </Link>
              {categories.length > 0 && (
                <Link
                  href={`/store/${businessDomain}/products?category=${categories[0]?.slug}`}
                  className="hidden sm:inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg bg-white/15 backdrop-blur-sm border border-white/30 hover:bg-white/25 transition-all"
                >
                  Browse Categories
                  <ChevronRight className="w-5 h-5" />
                </Link>
              )}
            </div>

            {/* Quick stats, desktop only (mobile: footer / policies) */}
            <div className="hidden sm:flex flex-wrap gap-6 mt-10">
              {[
                { label: `${featuredResult.total || featuredProducts.length}+ Products`, icon: Package },
                {
                  label: `Free shipping over ${formatCurrency(freeShippingThreshold, storeCurrency)}`,
                  icon: Truck,
                },
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
            {featuredProducts.slice(0, 2).map((product) => {
              const previewSrc = getEffectiveProductImageUrl(product, business.category);
              return (
              <Link
                key={product.id}
                href={`/store/${businessDomain}/products/${product.slug || product.id}`}
                className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 w-64"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  {previewSrc ? (
                    <SmartProductImage
                      src={previewSrc}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm font-bold" style={{ color: accent }}>
                    {formatCurrency(Number(product.price), storeCurrency)}
                  </p>
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </section>
      )}

      {!immersiveHero && !supermarketElevatedHero ? (
        <StoreMarketingSections
          sections={settings?.pageSections}
          businessDomain={businessDomain}
          accent={accent}
          placement="after-hero"
        />
      ) : null}

      {dealershipHero && dealershipCatalogResult.success && (
        <DealershipHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          business={business}
          settings={settings}
          products={dealershipCatalogResult.products}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
        />
      )}

      {marketplaceHero && marketplaceCatalogResult.success && (
        <MarketplaceHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          products={marketplaceCatalogResult.products}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
          settings={settings}
        />
      )}

      {autoPartsHero && autoPartsProducts.length > 0 && (
        <AutoPartsHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          products={autoPartsProducts}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
          settings={settings}
        />
      )}

      {pharmacyElevatedHero && (
        <PharmacyHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          categories={categories}
          products={pharmacyProducts}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
          settings={settings}
          storeName={pharmacyStoreName}
          businessDescription={business.description || settings?.description}
          country={business.country || settings?.contact?.country}
        />
      )}

      {furnitureElevatedHero && (
        <FurnitureHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          categories={categories}
          products={furnitureProducts}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
          settings={settings}
          storeName={furnitureStoreName}
          businessDescription={business.description || settings?.description}
        />
      )}

      {restaurantElevatedHero && (
        <RestaurantHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          categories={categories}
          products={restaurantProducts}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
          settings={settings}
          storeName={restaurantStoreName}
          businessDescription={business.description || settings?.description}
          freeShippingThreshold={freeShippingThreshold}
        />
      )}

      {fitnessElevatedHero && (
        <FitnessHomeSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          business={business}
          categories={categories}
          products={fitnessProducts}
          currency={storeCurrency}
          accent={accent}
          base={heroPreset.base}
          settings={settings}
          storeName={fitnessStoreName}
          businessDescription={business.description || settings?.description}
          country={business.country || settings?.contact?.country}
        />
      )}

      {editorialHero && fashionConfig?.showTopCollections && topCollections.length > 0 && (
        <StoreReveal enabled={fashionConfig.animations}>
          <TopCollectionsCarousel title={topCollectionsTitle} items={topCollections} autoScroll={fashionConfig.animations !== false} />
        </StoreReveal>
      )}

      {editorialHero && fashionConfig?.showTopPicks && topPicksProducts.length >= 2 && (
        <StoreReveal enabled={fashionConfig.animations}>
          <TopPicksSection
            products={topPicksProducts}
            businessDomain={businessDomain}
            businessCategory={business.category}
            autoScroll={fashionConfig.animations}
            accent={accent}
          />
        </StoreReveal>
      )}

      {editorialHero && fashionDepartments && (
        <FashionDepartmentSections
          sections={fashionDepartments}
          businessDomain={businessDomain}
          editorialSpotlight={fashionConfig?.showEditorialSpotlight ? landing.spotlights?.[0] : null}
          accent={accent}
          accentDark={accentDark}
          canonical={landing.canonical}
          animations={fashionConfig ? fashionConfig.animations : true}
          renderReadyToWear={false}
        />
      )}

      {/* ── Category Chips (skip when parts finder already shows shortcuts) ─ */}
      {categories.length > 0 && !skipHomeNavSections && (
        <section className="bg-white border-b shadow-sm">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3 sm:py-4 scrollbar-hide">
              <Link
                href={`/store/${businessDomain}/products`}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all border-2 text-white"
                style={{ backgroundColor: accent, borderColor: accent }}
              >
                <ShoppingBag className="w-4 h-4" />
                All Products
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/store/${businessDomain}/products?category=${cat.slug}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:border-current transition-all bg-white"
                  style={{ '--hover-color': accent }}
                >
                  {cat.image_url && (
                    <div className="relative w-4 h-4 rounded-full overflow-hidden">
                      <SmartProductImage src={cat.image_url} alt="" fill className="object-cover" />
                    </div>
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

      {/* ── Domain quick actions (hidden for parts finder, panel covers this) ─ */}
      {!skipHomeNavSections && (
      <DomainQuickActions
        actions={landing.quickActions}
        accent={accent}
        accentLight={accentLight}
      />
      )}

      {!editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && !autoPartsHero && (
        <DomainDealStrip dealStrip={landing.dealStrip} accent={accent} accentDark={accentDark} />
      )}

      <StoreMarketingSections
        sections={settings?.pageSections}
        businessDomain={businessDomain}
        accent={accent}
        placement="mid-page"
      />

      {/* ── Category Cards Grid (tablet+) ─────────────────────────────────── */}
      {categories.length >= 3 && !skipHomeNavSections && (
        <section className="hidden sm:block mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="store-heading text-2xl font-extrabold tracking-tight text-slate-900">
                {copy.categoryHeading}
              </h2>
              <p className="text-slate-500 text-sm mt-1">Find exactly what you are looking for</p>
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
            {categories.slice(0, 6).map((cat) => {
              // Curated fallback images per index
              const imgSrc = cat.image_url || categoryFallbackImage;

              return (
                <Link
                  key={cat.id}
                  href={`/store/${businessDomain}/products?category=${cat.slug}`}
                  className="group relative overflow-hidden rounded-2xl aspect-square bg-gray-100 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <SmartProductImage
                    src={imgSrc}
                    alt={cat.name}
                    fill
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

      {/* ── Featured / primary catalog ───────────────────────────────────── */}
      {featuredRow.length > 0 && !editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && !autoPartsHero && (
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-10">
          <StoreSectionHeader
            title={copy.featuredTitle}
            subtitle={copy.featuredSubtitle}
            href={`/store/${businessDomain}/products?sort=featured`}
            accent={accent}
            linkLabel="Shop all"
          />
          <Suspense fallback={<ProductsSkeleton count={12} density="showcase" />}>
            <ProductGrid
              products={featuredRow}
              businessDomain={businessDomain}
              showResultsCount={false}
              density="showcase"
            />
          </Suspense>
        </section>
      )}

      {landing.spotlights?.[0] && !editorialHero && (
        <DomainEditorialSpotlight
          spotlight={landing.spotlights[0]}
          accent={accent}
          accentDark={accentDark}
          businessDomain={businessDomain}
          canonical={landing.canonical}
          variant={editorialHero ? 'editorial' : 'default'}
        />
      )}

      {/* ── Fallback primary grid when no featured flag ──────────────────── */}
      {featuredRow.length === 0 && newArrivalsRaw.length > 0 && !editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && !autoPartsHero && (
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-10">
          <StoreSectionHeader
            title={copy.shopAllTitle}
            subtitle={copy.shopAllSubtitle}
            href={`/store/${businessDomain}/products`}
            accent={accent}
          />
          <Suspense fallback={<ProductsSkeleton count={12} density="showcase" />}>
            <ProductGrid
              products={trimToShowcaseRows(newArrivalsRaw, 6, 2)}
              businessDomain={businessDomain}
              showResultsCount={false}
              density="showcase"
            />
          </Suspense>
        </section>
      )}

      {/* ── On Sale (retail grid). Editorial stores use the fashion Offers rail
             (FashionDepartmentSections) instead, so skip this to avoid a
             duplicate section and a retail-vs-editorial card clash. ───────── */}
      {onSaleRow.length >= 1 && !editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && !autoPartsHero && (
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-10">
          <StoreSectionHeader
            title={copy.onSaleTitle}
            subtitle={copy.onSaleSubtitle}
            href={`/store/${businessDomain}/products?onSale=true`}
            accent={accent}
            linkLabel="All deals"
          />
          <Suspense fallback={<ProductsSkeleton count={12} density="showcase" />}>
            <ProductGrid
              products={onSaleRow}
              catalogPool={popularityBackfill}
              businessDomain={businessDomain}
              showResultsCount={false}
              density="showcase"
            />
          </Suspense>
        </section>
      )}

      {/* ── Free shipping promo (desktop), skip on editorial (avoids 3rd accent banner) ─ */}
      {!editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && (
      <section className="hidden md:block mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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
                Free shipping on orders over {formatCurrency(freeShippingThreshold, storeCurrency)}
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
      )}

      <StoreMarketingSections
        sections={settings?.pageSections}
        businessDomain={businessDomain}
        accent={accent}
        placement="before-footer"
      />

      {/* ── Shop by category (Ready to Wear) — anchored just before the footer ─ */}
      {editorialHero && fashionDepartments?.readyToWear?.show && fashionDepartments.readyToWear.circles?.length > 0 && (
        <StoreReveal enabled={fashionConfig?.animations !== false}>
          <FashionCircleShowcase
            title={fashionDepartments.readyToWear.title}
            circles={fashionDepartments.readyToWear.circles}
            viewAllHref={fashionDepartments.readyToWear.viewAllHref}
            showDivider
            variant="muted"
            animate={fashionConfig?.animations !== false}
            accent={accent}
          />
        </StoreReveal>
      )}

      {/* ── New Arrivals (only when catalog has more beyond featured) ───────── */}
      {showNewArrivals && !editorialHero && !dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && (
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-10">
          <StoreSectionHeader
            title={copy.newArrivalsTitle}
            subtitle={copy.newArrivalsSubtitle}
            href={`/store/${businessDomain}/products?sort=newest`}
            accent={accent}
          />
          <Suspense fallback={<ProductsSkeleton count={12} density="showcase" />}>
            <ProductGrid
              products={newArrivalsRow}
              businessDomain={businessDomain}
              showResultsCount={false}
              density="showcase"
            />
          </Suspense>
        </section>
      )}

      {/* ── Mobile buyer support ───────────────────────────────────────────── */}
      {!dealershipHero && !marketplaceHero && !pharmacyElevatedHero && !furnitureElevatedHero && !restaurantElevatedHero && !fitnessElevatedHero && !supermarketElevatedHero && (
      <StoreBuyerSupportStrip businessDomain={businessDomain} accent={accent} />
      )}

      {featuredProducts.length === 0 &&
        newArrivalsRaw.length === 0 &&
        onSaleProducts.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ backgroundColor: accentLight }}>
            <Package className="w-8 h-8 sm:w-12 sm:h-12" style={{ color: accent }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{copy.emptyTitle}</h2>
          <p className="text-sm text-gray-500 mb-6 sm:mb-8 max-w-md mx-auto px-4">
            {copy.emptyBody}
          </p>
          {(contact.phone || contact.whatsappUrl) && (
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white sm:px-6 sm:py-3"
                  style={{ backgroundColor: accent }}
                >
                  Call {copy.storeName}
                </a>
              ) : null}
              <Link
                href={`/store/${businessDomain}/contact`}
                className="text-sm font-semibold hover:underline"
                style={{ color: accent }}
              >
                Contact us →
              </Link>
            </div>
          )}
          {!contact.phone && !contact.whatsappUrl && (
            <Link
              href={`/store/${businessDomain}/contact`}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white sm:px-6 sm:py-3"
              style={{ backgroundColor: accent }}
            >
              Contact {copy.storeName}
            </Link>
          )}
        </section>
      )}

    </div>
  );
}
