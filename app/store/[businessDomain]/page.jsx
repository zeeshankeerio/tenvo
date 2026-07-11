import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { guardStorefrontBusiness } from '@/lib/storefront/guardStorefrontBusiness';
import {
  buildStoreHomeCatalogPlan,
  getStoreHomeCatalog,
  mapStoreHomeCatalogRails,
} from '@/lib/storefront/storeHomeCatalog';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { getDomainConfig, getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { getMergedStorefrontHero } from '@/lib/storefront/mergeHero';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
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
import { trimToShowcaseRows } from '@/lib/storefront/showcaseProducts';
import { ensureRailProducts } from '@/lib/utils/storefrontProductRail';
import { buildTopCollections, getTopCollectionsTitle } from '@/lib/storefront/topCollections';
import { buildTopPicksProducts } from '@/lib/storefront/topPicks';
import { buildFashionHomeSections } from '@/lib/storefront/fashionHomeSections';
import { getFashionEditorialConfig, isFashionEditorialStore, formatFashionStoreName, getFashionMetadataCopy } from '@/lib/storefront/fashionEditorial';
import { supportsFashionGulSections } from '@/lib/storefront/fashionGulSections';
import { FashionGulAhmedSections } from '@/components/storefront/sections/fashion/FashionGulAhmedSections';
import { LazyVerticalHomeSections } from '@/components/storefront/sections/LazyVerticalHomeSections';
import { RetailHomeHero } from '@/components/storefront/sections/RetailHomeHero';
import { StoreCatalogEmptyState } from '@/components/storefront/sections/StoreCatalogEmptyState';
import { resolveStorefrontHeroSlides } from '@/lib/storefront/heroSlides';
import { SupermarketHomeSections } from '@/components/storefront/sections/supermarket/SupermarketHomeSections';
import { SupermarketFeedLayout } from '@/components/storefront/supermarket/SupermarketFeedLayout';
import { isAutoPartsStore } from '@/lib/storefront/autoParts';
import { cn } from '@/lib/utils';
import {
  ArrowRight, Sparkles,
  ShoppingBag
} from 'lucide-react';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
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
          : isFashionEditorialStore(business.category)
            ? formatFashionStoreName(business.business_name)
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
  } else if (isFashionEditorialStore(business.category)) {
    const meta = getFashionMetadataCopy(business.category, business.city, storeName);
    description = description || meta.description;
    keywords = `${storeName}, ${meta.keywords}`;
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

  const businessResult = guardStorefrontBusiness(await fetchBusinessByDomain(businessDomain));
  if (!businessResult) return null;

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

  const catalogPlan = buildStoreHomeCatalogPlan({
    editorialHero,
    dealershipHero,
    marketplaceHero,
    pharmacyElevatedHero,
    furnitureElevatedHero,
    restaurantElevatedHero,
    fitnessElevatedHero,
    supermarketElevatedHero,
    autoPartsHero,
    needsCatalogBackfill,
    restaurantDemo: restaurantElevatedHero && isDemoStoreDomain(businessDomain),
  });

  const catalogBundle = await getStoreHomeCatalog(business.id, catalogPlan);
  const {
    featuredResult,
    newArrivalsResult,
    categoriesResult,
    onSaleResult,
    topCatalogResult,
    catalogSnapshotResult,
    dealershipCatalogResult,
    marketplaceCatalogResult,
    pharmacyCatalogResult,
    furnitureCatalogResult,
    restaurantCatalogResult,
    fitnessCatalogResult,
    supermarketCatalogResult,
    autoPartsCatalogResult,
    catalogBackfillResult,
  } = mapStoreHomeCatalogRails(catalogBundle, catalogPlan, {
    editorialHero,
    dealershipHero,
    marketplaceHero,
    pharmacyElevatedHero,
    furnitureElevatedHero,
    restaurantElevatedHero,
    fitnessElevatedHero,
    supermarketElevatedHero,
    autoPartsHero,
    needsCatalogBackfill,
  });

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

  const retailHeroSlides = resolveStorefrontHeroSlides(settings, [], {
    coverImage: business.cover_image_url || domainCfg.heroImage,
  });

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
  const fashionConfig = editorialHero
    ? getFashionEditorialConfig(settings, businessDomain, business.category)
    : null;
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

  const hasGenericRetailProducts =
    featuredProducts.length > 0 || newArrivalsRaw.length > 0 || onSaleProducts.length > 0;

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
          <StoreMarketingSections
            sections={settings?.pageSections}
            businessDomain={businessDomain}
            accent={accent}
            placement="mid-page"
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
          <StoreMarketingSections
            sections={settings?.pageSections}
            businessDomain={businessDomain}
            accent={accent}
            placement="before-footer"
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
        {skipHomeNavSections ? (
          <StoreMarketingSections
            sections={settings?.pageSections}
            businessDomain={businessDomain}
            accent={accent}
            placement="mid-page"
          />
        ) : null}
        </>
      ) : (
      <RetailHomeHero
        slides={retailHeroSlides}
        accent={accent}
        accentDark={accentDark}
        business={business}
        hero={hero}
        heroCta={copy.heroCta}
        businessDomain={businessDomain}
        businessCategory={business.category}
        categories={categories}
        featuredProducts={featuredProducts}
        productCount={featuredResult.total || featuredProducts.length}
        freeShippingThreshold={freeShippingThreshold}
        returnDays={returnDays}
        storeCurrency={storeCurrency}
      />
      )}

      {!immersiveHero && !supermarketElevatedHero ? (
        <StoreMarketingSections
          sections={settings?.pageSections}
          businessDomain={businessDomain}
          accent={accent}
          placement="after-hero"
        />
      ) : null}

      {skipHomeNavSections && !supermarketElevatedHero && !immersiveHero ? (
        <StoreMarketingSections
          sections={settings?.pageSections}
          businessDomain={businessDomain}
          accent={accent}
          placement="mid-page"
        />
      ) : null}

      {dealershipHero && dealershipCatalogResult.success && (
        <LazyVerticalHomeSections
          variant="dealership"
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
        <LazyVerticalHomeSections
          variant="marketplace"
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
        <LazyVerticalHomeSections
          variant="auto-parts"
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
        <LazyVerticalHomeSections
          variant="pharmacy"
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
        <LazyVerticalHomeSections
          variant="furniture"
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
        <LazyVerticalHomeSections
          variant="restaurant"
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
        <LazyVerticalHomeSections
          variant="fitness"
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

      {editorialHero && (
        <LazyVerticalHomeSections
          variant="fashion"
          businessDomain={businessDomain}
          businessCategory={business.category}
          products={catalogSnapshotResult.success ? catalogSnapshotResult.products : topPicksProducts}
          settings={settings}
          accent={accent}
          accentDark={accentDark}
          canonical={landing.canonical}
          storeName={business.business_name}
          businessDescription={business.description || settings?.description}
          country={business.country || settings?.contact?.country}
          topCollections={topCollections}
          topCollectionsTitle={topCollectionsTitle}
          topPicksProducts={topPicksProducts}
          fashionDepartments={fashionDepartments}
          editorialSpotlight={landing.spotlights?.[0]}
          categories={categories}
        />
      )}

      {skipHomeNavSections && !supermarketElevatedHero ? (
        <StoreMarketingSections
          sections={settings?.pageSections}
          businessDomain={businessDomain}
          accent={accent}
          placement="before-footer"
        />
      ) : null}

      {supportsFashionGulSections(business.category) && !editorialHero && (
        <FashionGulAhmedSections
          businessDomain={businessDomain}
          businessCategory={business.category}
          settings={settings}
          animations={getFashionEditorialConfig(settings, businessDomain, business.category).animations}
          categories={categories}
          products={catalogSnapshotResult.success ? catalogSnapshotResult.products : featuredProducts}
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

      {!skipHomeNavSections ? (
      <StoreMarketingSections
        sections={settings?.pageSections}
        businessDomain={businessDomain}
        accent={accent}
        placement="mid-page"
      />
      ) : null}

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

      {!skipHomeNavSections ? (
      <StoreMarketingSections
        sections={settings?.pageSections}
        businessDomain={businessDomain}
        accent={accent}
        placement="before-footer"
      />
      ) : null}

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

      {!skipHomeNavSections && !hasGenericRetailProducts ? (
        <StoreCatalogEmptyState
          businessDomain={businessDomain}
          accent={accent}
          accentLight={accentLight}
          title={copy.emptyTitle}
          body={copy.emptyBody}
          storeName={copy.storeName}
          contact={contact}
        />
      ) : null}

    </div>
  );
}
