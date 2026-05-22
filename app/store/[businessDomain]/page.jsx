import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { getProducts, getCategories } from '@/lib/actions/storefront/products';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import { ProductsSkeleton } from '@/components/storefront/LoadingSkeletons';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    return { title: 'Store Not Found' };
  }
  
  const { business } = result;
  
  return {
    title: `${business.business_name} - Online Store`,
    description: business.description || `Shop online at ${business.business_name}. Browse our collection of quality products.`,
    keywords: business.keywords || 'online store, shop, ecommerce',
    openGraph: {
      title: business.business_name,
      description: business.description,
      images: business.logo_url ? [{ url: business.logo_url }] : [],
    },
  };
}

export default async function StoreHomePage({ params }) {
  const { businessDomain } = await params;
  
  // Validate business
  const businessResult = await getBusinessByDomain(businessDomain);
  if (!businessResult.success) {
    notFound();
  }
  
  const { business, settings } = businessResult;
  
  // Check if store is enabled - getBusinessByDomain already validates this
  // but we double-check here for safety
  if (business.is_storefront_enabled === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Temporarily Unavailable</h1>
          <p className="text-gray-600">
            This store is currently not accepting orders. Please check back later.
          </p>
        </div>
      </div>
    );
  }
  
  // Fetch featured products
  const productsResult = await getProducts(business.id, {
    limit: 12,
    featured: true,
    inStock: true,
  });
  const featuredProducts = productsResult.success ? productsResult.products : [];
  
  // Fetch all categories
  const categoriesResult = await getCategories(business.id);
  const categories = categoriesResult.success ? categoriesResult.categories : [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center"
        style={{ 
          backgroundImage: business.cover_image_url 
            ? `url(${business.cover_image_url})` 
            : 'linear-gradient(to right, #2563eb, #1d4ed8)',
          minHeight: '400px'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {business.business_name}
            </h1>
            <p className="text-xl text-white text-opacity-90 max-w-2xl mx-auto mb-8">
              {business.description || `Welcome to our online store. Browse our collection of quality products.`}
            </p>
            <a 
              href={`/store/${businessDomain}/products`}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors"
            >
              Shop Now
            </a>
          </div>
        </div>
      </div>
      
      {/* Category Navigation */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <CategoryNav 
            categories={categories} 
            activeCategory={null}
            businessDomain={businessDomain}
          />
        </div>
      </div>
      
      {/* Featured Products Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <a 
            href={`/store/${businessDomain}/products`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </a>
        </div>
        
        <Suspense fallback={<ProductsSkeleton count={6} />}>
          {featuredProducts.length > 0 ? (
            <ProductGrid 
              products={featuredProducts} 
              businessDomain={businessDomain}
            />
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <p className="text-gray-500 text-lg">No featured products available yet.</p>
              <a 
                href={`/store/${businessDomain}/products`}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse All Products
              </a>
            </div>
          )}
        </Suspense>
      </div>
      
      {/* Trust Badges */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Quality Products</h3>
              <p className="text-sm text-gray-500 mt-1">Handpicked for you</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Best Prices</h3>
              <p className="text-sm text-gray-500 mt-1">Competitive rates</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Fast Shipping</h3>
              <p className="text-sm text-gray-500 mt-1">Quick delivery</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Easy Returns</h3>
              <p className="text-sm text-gray-500 mt-1">{settings?.returnPolicyDays || 7}-day policy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
