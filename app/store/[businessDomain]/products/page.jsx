import { Suspense } from 'react';
import { notFound } from 'next/navigation';
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
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    return { title: 'Store Not Found' };
  }
  
  const { business } = result;
  const category = searchParams.category;
  
  return {
    title: category 
      ? `${category} - ${business.business_name}` 
      : `Products - ${business.business_name}`,
    description: `Browse products from ${business.business_name}`,
  };
}

export default async function ProductsPage({ params, searchParams }) {
  const { businessDomain } = await params;
  
  // Validate business
  const businessResult = await getBusinessByDomain(businessDomain);
  if (!businessResult.success) {
    notFound();
  }
  
  const { business } = businessResult;
  
  // Parse filters from search params
  const filters = {
    category: searchParams.category,
    minPrice: searchParams.minPrice ? parseFloat(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : undefined,
    search: searchParams.search,
    sort: searchParams.sort || 'featured',
    inStock: searchParams.inStock === 'true' ? true : undefined,
    onSale: searchParams.onSale === 'true',
    featured: searchParams.featured === 'true' ? 'only' : undefined,
    page: parseInt(searchParams.page || '1'),
    limit: 24,
  };
  const view = searchParams.view || 'grid';
  
  // Fetch categories for filters
  const categoriesResult = await getCategories(business.id);
  const categories = categoriesResult.success ? categoriesResult.categories : [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {filters.search ? `Search: "${filters.search}"` : 'All Products'}
          </h1>
          <p className="text-gray-600">
            Browse our collection of quality products
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


