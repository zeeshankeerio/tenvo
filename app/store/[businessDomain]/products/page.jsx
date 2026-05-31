import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { getProducts, getCategories } from '@/lib/actions/storefront/products';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductFilters } from '@/components/storefront/ProductFilters';
import { SearchBar } from '@/components/storefront/SearchBar';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';
import { SortDropdown, ActiveFilters, ViewToggle } from '@/components/storefront/ProductsToolbar';

export async function generateMetadata({ params, searchParams }) {
  const { businessDomain } = await params;
  const sp = await searchParams;
  const result = await getBusinessByDomain(businessDomain);

  if (!result.success) {
    return { title: 'Store Not Found' };
  }

  const { business } = result;
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
    ? `Search: ${search} — ${business.business_name}`
    : onSale
      ? `On sale — ${business.business_name}`
      : catSlug
        ? `${categoryTitle} — ${business.business_name}`
        : `Shop all products — ${business.business_name}`;

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
  const businessResult = await getBusinessByDomain(businessDomain);
  if (!businessResult.success) {
    notFound();
  }

  const { business } = businessResult;

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
    page: parseInt(sp?.page || '1', 10) || 1,
    limit: 24,
  };
  const view = typeof sp?.view === 'string' ? sp.view : 'grid';

  // Fetch categories for filters
  const categoriesResult = await getCategories(business.id);
  const categories = categoriesResult.success ? categoriesResult.categories : [];

  const categoryMeta = filters.category ? categories.find((c) => c.slug === filters.category) : null;
  const heroTitle = filters.search
    ? `Search results for “${filters.search}”`
    : filters.onSale
      ? 'On sale'
      : filters.sort === 'newest'
        ? 'New arrivals'
        : categoryMeta
          ? categoryMeta.name
          : 'All products';
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
            {filters.search
              ? `Found listings across ${business.business_name}. Use filters to narrow results.`
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
            <Suspense fallback={<ProductsSkeleton count={12} />}>
              <ProductGridContent 
                businessId={business.id}
                businessDomain={businessDomain}
                filters={filters}
                view={view}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

async function ProductGridContent({ businessId, businessDomain, filters, view = 'grid' }) {
  const result = await getProducts(businessId, filters);
  
  if (!result.success) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load products</p>
      </div>
    );
  }
  
  const { products, total, hasMore } = result;
  
  return (
    <ProductGrid 
      products={products}
      total={total}
      hasMore={hasMore}
      businessDomain={businessDomain}
      currentPage={filters.page}
      filters={filters}
      view={view}
    />
  );
}


