import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { buildStoreJsonLd, buildStoreWebSiteJsonLd } from '@/lib/storefront/jsonLd';
import { StoreProviders } from '@/components/storefront/StoreProviders';
import { StoreHeader } from '@/components/storefront/StoreHeader';
import { PharmacySiteHeader } from '@/components/storefront/pharmacy/PharmacySiteHeader';
import { PharmacyChromeProvider } from '@/components/storefront/pharmacy/PharmacyChromeContext';
import { PharmacyMobileBottomNav } from '@/components/storefront/pharmacy/PharmacyMobileBottomNav';
import { StoreFooter } from '@/components/storefront/StoreFooter';
import { LiveChat } from '@/components/storefront/LiveChat';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { BackToTop } from '@/components/storefront/BackToTop';
import { StoreMobileBottomNav } from '@/components/storefront/mobile/StoreMobileBottomNav';
import { StoreThemeStyles } from '@/components/storefront/StoreThemeStyles';
import { StorefrontAnalyticsBeacon } from '@/components/storefront/StorefrontAnalyticsBeacon';
import { isLuxuryFashionStore } from '@/lib/storefront/luxuryFashion';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { isAutoMarketplaceStore } from '@/lib/storefront/autoMarketplace';
import { isPharmacyElevatedStore } from '@/lib/storefront/pharmacyStorefront';
import { isSupermarketElevatedStore } from '@/lib/storefront/supermarketStorefront';
import { isRestaurantElevatedStore } from '@/lib/storefront/restaurantStorefront';
import { isFitnessElevatedStore } from '@/lib/storefront/fitnessStorefront';
import { FitnessSiteHeader } from '@/components/storefront/fitness/FitnessSiteHeader';
import { FitnessChromeProvider } from '@/components/storefront/fitness/FitnessChromeContext';
import { FitnessMobileBottomNav } from '@/components/storefront/fitness/FitnessMobileBottomNav';
import { SupermarketSiteHeader } from '@/components/storefront/supermarket/SupermarketSiteHeader';
import { SupermarketChromeProvider } from '@/components/storefront/supermarket/SupermarketChromeContext';
import { RestaurantSiteHeader } from '@/components/storefront/restaurant/RestaurantSiteHeader';
import { RestaurantChromeProvider } from '@/components/storefront/restaurant/RestaurantChromeContext';
import { RestaurantMobileBottomNav } from '@/components/storefront/restaurant/RestaurantMobileBottomNav';
import { TENVO_VEHICLES_METADATA } from '@/lib/storefront/tenvoVehiclesAssets';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  
  if (!result.success) {
    return {
      title: 'Store Not Found',
    };
  }
  
  const business = result.business;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const dealershipStore = isAutoDealershipStore(business.category);

  let title = `${business.business_name}, Online Store`;
  let description = business.description || `Shop online at ${business.business_name}`;
  let keywords = business.keywords || 'online store, shop, ecommerce';
  let ogImage = business.logo_url?.startsWith('https://') ? business.logo_url : undefined;

  if (dealershipStore) {
    title = `${business.business_name}, ${TENVO_VEHICLES_METADATA.titleSuffix}`;
    description = business.description || TENVO_VEHICLES_METADATA.description;
    keywords = business.keywords || TENVO_VEHICLES_METADATA.keywords;
    ogImage =
      business.cover_image_url?.startsWith('https://')
        ? business.cover_image_url
        : ogImage;
  }

  const meta = {
    title,
    description,
    keywords,
    openGraph: {
      title: business.business_name,
      description,
      type: 'website',
      url: base ? `${base.replace(/\/$/, '')}/store/${business.domain}` : undefined,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    robots: { index: true, follow: true },
  };

  if (base) {
    try {
      meta.metadataBase = new URL(base);
    } catch {
      /* ignore invalid NEXT_PUBLIC_APP_URL */
    }
  }

  return meta;
}

export default async function StoreLayout({ children, params }) {
  const { businessDomain } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  
  if (!result.success) {
    notFound();
  }
  
  const { business, settings, categories, plan } = result;
  const luxuryStore = isLuxuryFashionStore(business.category);
  const dealershipStore = isAutoDealershipStore(business.category);
  const marketplaceStore = isAutoMarketplaceStore(business.category);
  const pharmacyStore = isPharmacyElevatedStore(business.category);
  const supermarketStore = isSupermarketElevatedStore(business.category);
  const restaurantStore = isRestaurantElevatedStore(business.category);
  const fitnessStore = isFitnessElevatedStore(business.category);
  const portalStore = dealershipStore || marketplaceStore;

  const storeJsonLd = buildStoreJsonLd({ business, businessDomain: business.domain });
  const webSiteJsonLd = buildStoreWebSiteJsonLd({ business, businessDomain: business.domain });

  const storeChrome = (
    <div
      className={cn(
        'min-h-screen',
        fitnessStore && 'relative',
        fitnessStore ? 'bg-black' : restaurantStore ? 'bg-zinc-100' : portalStore || pharmacyStore || supermarketStore ? 'bg-white' : luxuryStore ? 'bg-stone-50' : 'bg-slate-50'
      )}
      data-store-theme
      {...(luxuryStore ? { 'data-store-luxury': '' } : {})}
      {...(dealershipStore ? { 'data-store-dealership': '' } : {})}
      {...(marketplaceStore ? { 'data-store-marketplace': '' } : {})}
      {...(pharmacyStore ? { 'data-store-pharmacy': '' } : {})}
      {...(supermarketStore ? { 'data-store-supermarket': '' } : {})}
      {...(restaurantStore ? { 'data-store-restaurant': '' } : {})}
      {...(fitnessStore ? { 'data-store-fitness': '' } : {})}
    >
      <a
        href="#store-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      {storeJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
      ) : null}
      {webSiteJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
      ) : null}
      {pharmacyStore ? (
        <Suspense fallback={<div className="h-[108px] border-b border-emerald-100 bg-white md:h-[132px]" aria-hidden />}>
          <PharmacySiteHeader business={business} settings={settings} />
        </Suspense>
      ) : supermarketStore ? (
        <Suspense fallback={<div className="h-[120px] border-b border-orange-100 bg-white md:h-[148px]" aria-hidden />}>
          <SupermarketSiteHeader business={business} settings={settings} />
        </Suspense>
      ) : restaurantStore ? (
        <Suspense fallback={<div className="h-[120px] border-b border-zinc-200 bg-white md:h-[132px]" aria-hidden />}>
          <RestaurantSiteHeader business={business} settings={settings} />
        </Suspense>
      ) : fitnessStore ? (
        <Suspense fallback={null}>
          <FitnessSiteHeader business={business} settings={settings} categories={categories} />
        </Suspense>
      ) : (
        <StoreHeader
          business={business}
          categories={categories}
          settings={settings}
        />
      )}

      <main
        id="store-main"
        className={cn(
          restaurantStore ? 'min-h-0 p-0' : 'min-h-[calc(100vh-300px)]',
          'lg:pb-0',
          pharmacyStore
            ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]'
            : supermarketStore
              ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]'
              : restaurantStore
                ? 'pb-[calc(3rem+env(safe-area-inset-bottom))]'
                : fitnessStore
                  ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'
                  : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
        )}
        tabIndex={-1}
      >
        {children}
      </main>

      <StoreFooter
        business={business}
        settings={settings}
      />

      {pharmacyStore ? <PharmacyMobileBottomNav /> : restaurantStore ? <RestaurantMobileBottomNav /> : fitnessStore ? <FitnessMobileBottomNav /> : <StoreMobileBottomNav />}

      <CartDrawer />
      <LiveChat />
      <BackToTop />
    </div>
  );

  return (
    <StoreProviders business={business} settings={settings} categories={categories} plan={plan}>
      <StoreThemeStyles business={business} settings={settings} />
      <StorefrontAnalyticsBeacon businessDomain={business.domain} businessId={business.id} />
      {pharmacyStore ? (
        <PharmacyChromeProvider>{storeChrome}</PharmacyChromeProvider>
      ) : supermarketStore ? (
        <SupermarketChromeProvider>{storeChrome}</SupermarketChromeProvider>
      ) : restaurantStore ? (
        <RestaurantChromeProvider>{storeChrome}</RestaurantChromeProvider>
      ) : fitnessStore ? (
        <FitnessChromeProvider>{storeChrome}</FitnessChromeProvider>
      ) : (
        storeChrome
      )}
    </StoreProviders>
  );
}
