import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { guardStorefrontBusiness } from '@/lib/storefront/guardStorefrontBusiness';
import { getProducts, getCategories } from '@/lib/actions/storefront/products';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductFilters } from '@/components/storefront/ProductFilters';
import { SearchBar } from '@/components/storefront/SearchBar';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';
import { SortDropdown, ActiveFilters, ViewToggle } from '@/components/storefront/ProductsToolbar';
import { isDemoStoreDomain } from '@/lib/storefront/elevatedStorefrontTenant';
import {
  isFitnessElevatedStore,
  filterFitnessShopCategories,
  buildFitnessShopCatalog,
  paginateFitnessShopCatalog,
  isFitnessBookableCategory,
} from '@/lib/storefront/fitnessStorefront';
import { isRestaurantElevatedStore, resolveRestaurantTheme } from '@/lib/storefront/restaurantStorefront';
import { isPharmacyElevatedStore } from '@/lib/storefront/pharmacyStorefront';
import {
  buildPharmacyShopCatalog,
  paginatePharmacyShopCatalog,
} from '@/lib/dataLab/pharmacySeedHelpers';
import { PharmacyShopLayout } from '@/components/storefront/pharmacy/PharmacyShopLayout';
import {
  buildRestaurantShopCatalog,
  paginateRestaurantShopCatalog,
  enrichRestaurantCategoriesWithSeedImages,
} from '@/lib/dataLab/restaurantSeedHelpers';
import { RestaurantMenuLayout } from '@/components/storefront/restaurant/RestaurantMenuLayout';
import { RestaurantMenuCatalog } from '@/components/storefront/restaurant/RestaurantMenuCatalog';

export async function generateMetadata({ params, searchParams }) {
  const { businessDomain } = await params;
  const sp = await searchParams;
  const result = await fetchBusinessByDomain(businessDomain);

  if (!result.success) {
    return { title: 'Store Not Found' };
  }

  const { business } = result;
  const restaurantStore = isRestaurantElevatedStore(business.category);
  const catSlug = typeof sp?.category === 'string' ? sp.category : undefined;
  let categoryTitle = catSlug;
  if (catSlug) {
    const cats = await getCategories(business.id);
    if (cats.success) {
      categoryTitle = cats.categories.find((c) => c.slug === catSlug)?.name || catSlug;
    }
  }

  const search = typeof sp?.search === 'string' ? sp.search : undefined;
  const onSale = sp?.onSale === 'true';

  const title = search
    ? `Search: ${search}, ${business.business_name}`
    : onSale
      ? `On sale, ${business.business_name}`
      : catSlug
        ? `${categoryTitle}, ${business.business_name}`
        : restaurantStore
          ? `Menu, ${business.business_name}`
          : `Shop all products, ${business.business_name}`;

  return {
    title,
    description:
      business.description ||
      `Browse products from ${business.business_name}. Secure checkout and fast delivery.`,
    robots: { index: true, follow: true },
  };
}

export default async function ProductsPage({ params, searchParams }) {
  const { businessDomain } = await params;
  const sp = await searchParams;

  // Validate business
  const businessResult = guardStorefrontBusiness(await fetchBusinessByDomain(businessDomain));
  if (!businessResult) return null;

  const { business, settings: storeSettings = {} } = businessResult;
  const fitnessStore = isFitnessElevatedStore(business.category);
  const restaurantStore = isRestaurantElevatedStore(business.category);
  const pharmacyStore = isPharmacyElevatedStore(business.category);

  // Parse filters from search params
  const filters = {
    category: typeof sp?.category === 'string' ? sp.category : undefined,
    minPrice: sp?.minPrice ? parseFloat(sp.minPrice) : undefined,
    maxPrice: sp?.maxPrice ? parseFloat(sp.maxPrice) : undefined,
    search: typeof sp?.search === 'string' ? sp.search : undefined,
    sort: typeof sp?.sort === 'string' ? sp.sort : 'featured',
    inStock: sp?.inStock === 'true' ? true : undefined,
    onSale: sp?.onSale === 'true',
    featured: sp?.featured === 'true' ? 'only' : undefined,
    brand: typeof sp?.brand === 'string' ? sp.brand : undefined,
    model: typeof sp?.model === 'string' ? sp.model : undefined,
    year: typeof sp?.year === 'string' ? sp.year : undefined,
    engine: typeof sp?.engine === 'string' ? sp.engine : undefined,
    engineNo: typeof sp?.engineNo === 'string' ? sp.engineNo : undefined,
    vehicleClass: typeof sp?.class === 'string' ? sp.class : undefined,
    vehicleType: typeof sp?.vehicleType === 'string' ? sp.vehicleType : undefined,
    searchMode: typeof sp?.searchMode === 'string' ? sp.searchMode : undefined,
    body: typeof sp?.body === 'string' ? sp.body : undefined,
    fuel: typeof sp?.fuel === 'string' ? sp.fuel : undefined,
    condition: typeof sp?.condition === 'string' ? sp.condition : undefined,
    fabric: typeof sp?.fabric === 'string' ? sp.fabric : undefined,
    sourcing: typeof sp?.sourcing === 'string' ? sp.sourcing : undefined,
    size: typeof sp?.size === 'string' ? sp.size : undefined,
    otcOnly: sp?.otc === 'true',
    rxOnly: sp?.rx === 'true',
    page: parseInt(sp?.page || '1', 10) || 1,
    limit: 24,
  };
  const view = typeof sp?.view === 'string' ? sp.view : 'grid';

  // Fetch categories for filters
  const categoriesResult = await getCategories(business.id);
  const categoriesRaw = categoriesResult.success ? categoriesResult.categories : [];
  const categories = fitnessStore
    ? filterFitnessShopCategories(categoriesRaw)
    : restaurantStore
      ? enrichRestaurantCategoriesWithSeedImages(categoriesRaw)
      : categoriesRaw;

  const categoryMeta = filters.category ? categories.find((c) => c.slug === filters.category) : null;
  const bookableCategoryRequested =
    fitnessStore &&
    filters.category &&
    isFitnessBookableCategory({ slug: filters.category, name: categoryMeta?.name || filters.category });
  const heroTitle = filters.search
    ? filters.searchMode === 'partNumber'
      ? `Part number: ${filters.search}`
      : filters.searchMode === 'partSize'
        ? `Part size: ${filters.search}`
        : filters.searchMode === 'plate'
          ? `Plate: ${filters.search}`
          : filters.searchMode === 'vin'
            ? `VIN / chassis: ${filters.search}`
            : `Search results for “${filters.search}”`
    : filters.brand && filters.model
      ? `Parts for ${filters.brand} ${filters.model}`
      : filters.brand
        ? `Shop ${filters.brand}`
        : filters.fabric
          ? `${filters.fabric} collection`
          : filters.sourcing
            ? `${filters.sourcing.charAt(0).toUpperCase()}${filters.sourcing.slice(1)} fashion`
            : filters.onSale
          ? 'On sale'
          : filters.sort === 'newest'
            ? 'New arrivals'
            : categoryMeta
              ? categoryMeta.name
              : restaurantStore
                ? 'Full menu'
                : pharmacyStore
                  ? 'Shop medicines'
                  : 'All products';

  if (restaurantStore) {
    const settings = storeSettings;
    const theme = resolveRestaurantTheme(settings);
    const accent = theme.accent;
    const storeBase = `/store/${businessDomain}`;
    const menuTitle = filters.search
      ? `Results for “${filters.search}”`
      : filters.onSale
        ? 'Deals & offers'
        : categoryMeta
          ? categoryMeta.name
          : filters.sort === 'popularity'
            ? 'Popular dishes'
            : 'Our menu';

    return (
      <RestaurantMenuLayout
        storeBase={storeBase}
        categories={categories}
        settings={settings}
        businessDomain={businessDomain}
        accent={accent}
        title={menuTitle}
      >
        <Suspense fallback={<ProductsSkeleton count={9} density="default" />}>
          <RestaurantMenuContent
            businessId={business.id}
            businessDomain={businessDomain}
            filters={filters}
            view={view}
            accent={accent}
          />
        </Suspense>
      </RestaurantMenuLayout>
    );
  }

  if (pharmacyStore) {
    const storeBase = `/store/${businessDomain}`;
    const accent = storeSettings?.theme?.accent || '#16a34a';
    const pharmacySubtitle = filters.rxOnly
      ? 'Prescription medicines — upload a valid Rx to place an order.'
      : filters.otcOnly
        ? 'Over-the-counter medicines, vitamins, and wellness products you can add to cart.'
        : `Browse OTC and prescription medicines from ${business.business_name}. Rx items require upload before checkout.`;

    return (
      <PharmacyShopLayout
        businessDomain={businessDomain}
        settings={storeSettings}
        accent={accent}
        title={heroTitle}
        subtitle={pharmacySubtitle}
        storeBase={storeBase}
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-64 lg:shrink-0">
            <div className="sticky top-28 space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Browse</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`${storeBase}/products`}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                  >
                    All
                  </Link>
                  <Link
                    href={`${storeBase}/products?otc=true`}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                  >
                    OTC only
                  </Link>
                  <Link
                    href={`${storeBase}/products?rx=true`}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                  >
                    Prescription
                  </Link>
                  <Link
                    href={`${storeBase}/products?onSale=true`}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                  >
                    Deals
                  </Link>
                </div>
              </div>
              <ProductFilters
                filters={filters}
                categories={categories}
                businessDomain={businessDomain}
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <SearchBar businessDomain={businessDomain} initialQuery={filters.search} />
              </div>
              <div className="flex items-center gap-2">
                <SortDropdown currentSort={filters.sort} businessDomain={businessDomain} />
                <ViewToggle currentView={view} businessDomain={businessDomain} />
              </div>
            </div>
            <ActiveFilters filters={filters} businessDomain={businessDomain} />
            <Suspense fallback={<ProductsSkeleton count={12} density="catalog" />}>
              <ProductGridContent
                businessId={business.id}
                businessDomain={businessDomain}
                filters={filters}
                view={view}
                pharmacyStore={pharmacyStore}
                businessCategory={business.category}
              />
            </Suspense>
          </main>
        </div>
      </PharmacyShopLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link href={`/store/${businessDomain}`} className="inline-flex items-center gap-1 hover:text-gray-800">
              <Home className="w-3.5 h-3.5" aria-hidden />
              Store home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" aria-hidden />
            <span className="text-gray-800 font-medium">Products</span>
            {categoryMeta && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" aria-hidden />
                <span className="text-gray-800 font-medium truncate max-w-[12rem] sm:max-w-xs">{categoryMeta.name}</span>
              </>
            )}
          </nav>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{heroTitle}</h1>
          <p className="text-gray-600">
            {bookableCategoryRequested
              ? 'Memberships and personal training are booked from the gym homepage, not the supplement shop.'
              : filters.search
                ? `Found listings across ${business.business_name}. Use filters to narrow results.`
                : fitnessStore
                  ? `Supplements, nutrition, and gym gear from ${business.business_name}. Memberships and training sessions are booked separately.`
                  : `Shop the catalog at ${business.business_name}. Prices and availability update in real time.`}
          </p>
        </div>
      </div>
      
      {/* Category Navigation */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <CategoryNav 
            categories={categories} 
            activeCategory={filters.category}
            businessDomain={businessDomain}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-40">
              <ProductFilters 
                filters={filters}
                categories={categories}
                businessDomain={businessDomain}
              />
            </div>
          </aside>
          
          {/* Product Grid */}
          <main className="flex-1">
            {/* Search and Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <SearchBar 
                  businessDomain={businessDomain}
                  initialQuery={filters.search}
                />
              </div>
              <div className="flex items-center gap-2">
                <SortDropdown 
                  currentSort={filters.sort}
                  businessDomain={businessDomain}
                />
                <ViewToggle currentView={view} businessDomain={businessDomain} />
              </div>
            </div>
            
            {/* Active Filters */}
            <ActiveFilters 
              filters={filters}
              businessDomain={businessDomain}
            />
            
            {/* Products */}
            <Suspense fallback={<ProductsSkeleton count={12} density="catalog" />}>
              <ProductGridContent
                businessId={business.id}
                businessDomain={businessDomain}
                filters={filters}
                view={view}
                fitnessStore={fitnessStore}
                bookableCategoryRequested={bookableCategoryRequested}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

async function RestaurantMenuContent({
  businessId,
  businessDomain,
  filters,
  view = 'grid',
  accent,
}) {
  const menuFilters = {
    ...filters,
    sort: filters.sort === 'featured' && !filters.category && !filters.search ? 'popularity' : filters.sort,
  };

  if (isDemoStoreDomain(businessDomain)) {
    const catalogResult = await getProducts(businessId, {
      page: 1,
      limit: 500,
      sort: 'popularity',
    });

    if (!catalogResult.success) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center">
          <p className="text-sm text-zinc-500">Could not load the menu. Please try again.</p>
        </div>
      );
    }

    const { products, total, hasMore } = paginateRestaurantShopCatalog(
      catalogResult.products,
      menuFilters,
      businessDomain
    );

    return (
      <RestaurantMenuCatalog
        products={products}
        total={total}
        hasMore={hasMore}
        businessDomain={businessDomain}
        currentPage={filters.page}
        view={view}
        accent={accent}
      />
    );
  }

  const result = await getProducts(businessId, menuFilters);

  if (!result.success) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-12 text-center">
        <p className="text-sm text-zinc-500">Could not load the menu. Please try again.</p>
      </div>
    );
  }

  const { products: rawProducts, total, hasMore } = result;
  const products = buildRestaurantShopCatalog(rawProducts, businessDomain);

  return (
    <RestaurantMenuCatalog
      products={products}
      total={total}
      hasMore={hasMore}
      businessDomain={businessDomain}
      currentPage={filters.page}
      view={view}
      accent={accent}
    />
  );
}

async function ProductGridContent({
  businessId,
  businessDomain,
  filters,
  view = 'grid',
  fitnessStore = false,
  pharmacyStore = false,
  businessCategory = '',
  bookableCategoryRequested = false,
}) {
  if (bookableCategoryRequested) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-600">
          Memberships and training sessions are not sold through the supplement catalog.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/store/${businessDomain}#memberships`}
            className="inline-flex items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-rose-400"
          >
            View memberships
          </Link>
          <Link
            href={`/store/${businessDomain}#training`}
            className="inline-flex items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-rose-400"
          >
            View training
          </Link>
          <Link
            href={`/store/${businessDomain}/products`}
            className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Shop supplements
          </Link>
        </div>
      </div>
    );
  }

  if (pharmacyStore && isDemoStoreDomain(businessDomain)) {
    const catalogResult = await getProducts(businessId, {
      page: 1,
      limit: 500,
      sort: 'popularity',
    });

    if (!catalogResult.success) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load products</p>
        </div>
      );
    }

    const merged = buildPharmacyShopCatalog(catalogResult.products, businessDomain, businessCategory);
    const { products, total, hasMore } = paginatePharmacyShopCatalog(merged, filters);

    return (
      <ProductGrid
        products={products}
        total={total}
        hasMore={hasMore}
        businessDomain={businessDomain}
        currentPage={filters.page}
        filters={filters}
        view={view}
        density="catalog"
      />
    );
  }

  if (fitnessStore && isDemoStoreDomain(businessDomain)) {
    const catalogResult = await getProducts(businessId, {
      fitnessShopCatalog: true,
      page: 1,
      limit: 500,
      sort: 'popularity',
    });

    if (!catalogResult.success) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load products</p>
        </div>
      );
    }

    const merged = buildFitnessShopCatalog(catalogResult.products, businessDomain);
    const { products, total, hasMore } = paginateFitnessShopCatalog(merged, filters);

    return (
      <ProductGrid
        products={products}
        total={total}
        hasMore={hasMore}
        businessDomain={businessDomain}
        currentPage={filters.page}
        filters={filters}
        view={view}
        density="catalog"
      />
    );
  }

  const result = await getProducts(businessId, {
    ...filters,
    fitnessShopCatalog: fitnessStore || undefined,
  });

  if (!result.success) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load products</p>
      </div>
    );
  }

  let { products, total, hasMore } = result;

  if (pharmacyStore) {
    products = buildPharmacyShopCatalog(products, businessDomain, businessCategory);
    if (filters.rxOnly || filters.otcOnly || filters.onSale) {
      const paged = paginatePharmacyShopCatalog(products, filters);
      products = paged.products;
      total = paged.total;
      hasMore = paged.hasMore;
    }
  }

  return (
    <ProductGrid
      products={products}
      total={total}
      hasMore={hasMore}
      businessDomain={businessDomain}
      currentPage={filters.page}
      filters={filters}
      view={view}
      density="catalog"
    />
  );
}


