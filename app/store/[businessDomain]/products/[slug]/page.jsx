import { notFound } from 'next/navigation';
import { fetchBusinessByDomain } from '@/lib/storefront/fetchBusinessByDomain';
import { getProductBySlug, getRelatedProducts } from '@/lib/actions/storefront/products';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { ProductInfo } from '@/components/storefront/ProductInfo';
import { ProductPurchasePanel } from '@/components/storefront/ProductPurchasePanel';
import { RelatedProducts } from '@/components/storefront/RelatedProducts';
import { ProductReviews } from '@/components/storefront/ProductReviews';
import { ProductBreadcrumbs } from '@/components/storefront/ProductBreadcrumbs';
import { ProductTabs } from '@/components/storefront/ProductTabs';
import { Truck, Shield, RotateCcw } from 'lucide-react';
import { resolveStorefrontCurrency } from '@/lib/storefront/storefrontRegional';
import { formatCurrency } from '@/lib/currency';
import { getOpenGraphProductImageUrl, getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { buildProductJsonLd } from '@/lib/storefront/jsonLd';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { DealershipProductActions } from '@/components/storefront/sections/dealership/DealershipProductActions';

export async function generateMetadata({ params }) {
  const { businessDomain, slug } = await params;
  const result = await fetchBusinessByDomain(businessDomain);
  
  if (!result.success) {
    return { title: 'Product Not Found' };
  }
  
  const productResult = await getProductBySlug(result.business.id, slug);
  
  if (!productResult.success) {
    return { title: 'Product Not Found' };
  }
  
  const { product } = productResult;
  const ogPrimary = getOpenGraphProductImageUrl(product, result.business.category);

  const ogImage = ogPrimary
    ? [{ url: ogPrimary, width: 800, height: 800, alt: product.name }]
    : result.business.logo_url && result.business.logo_url.startsWith('https://')
      ? [{ url: result.business.logo_url }]
      : [];

  const desc =
    typeof product.description === 'string'
      ? product.description.replace(/<[^>]+>/g, '').trim().slice(0, 160)
      : '';

  return {
    title: `${product.name} | ${result.business.business_name}`,
    description: desc || `Buy ${product.name} at ${result.business.business_name}`,
    openGraph: {
      title: product.name,
      description: desc || `Buy ${product.name}`,
      images: ogImage,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: desc || `Buy ${product.name}`,
      ...(ogImage.length ? { images: ogImage.map((i) => i.url) } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { businessDomain, slug } = await params;
  
  // Validate business
  const businessResult = await fetchBusinessByDomain(businessDomain);
  if (!businessResult.success) {
    notFound();
  }
  
  const { business, settings } = businessResult;

  // Fetch product at page level so notFound() never fires inside <Suspense>
  const productResult = await getProductBySlug(business.id, slug);
  if (!productResult.success) {
    notFound();
  }

  const { product } = productResult;

  // Fetch related products
  const relatedResult = await getRelatedProducts(business.id, product.id, 8);
  const relatedProducts = relatedResult.success ? relatedResult.products : [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ProductContent 
        product={product}
        relatedProducts={relatedProducts}
        businessDomain={businessDomain}
        settings={settings}
        business={business}
      />
    </div>
  );
}

function ProductContent({ product, relatedProducts, businessDomain, settings, business }) {
  const storeCurrency = resolveStorefrontCurrency(settings, business);
  const catalogImage = getEffectiveProductImageUrl(product, business.category);
  const productLd = buildProductJsonLd({
    business,
    businessDomain,
    product,
    currency: storeCurrency,
  });

  // Prepare images array, merchant uploads first; else name-aware catalog fallback
  const images =
    product.images?.length > 0
      ? product.images
      : product.image_url?.trim()
        ? [{ url: product.image_url.trim(), alt: product.name }]
        : catalogImage
          ? [{ url: catalogImage, alt: product.name }]
          : [];
  
  const threshold = settings?.freeShippingThreshold || 2000;
  const returnDays = settings?.returnPolicyDays || 7;
  const isDealership = isAutoDealershipStore(business.category);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {productLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
      ) : null}
      {/* Breadcrumbs */}
      <ProductBreadcrumbs 
        businessDomain={businessDomain}
        category={product.category_name}
        categorySlug={product.category_slug}
        productName={product.name}
      />
      
      {/* Main Product Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
          {/* Product Gallery */}
          <div className="space-y-4">
            <ProductGallery images={images} productName={product.name} placeholderUrl={catalogImage} />
          </div>
          
          {/* Product Info */}
          <div className="space-y-6">
            <ProductInfo 
              product={product}
              businessDomain={businessDomain}
            />
            
            <ProductPurchasePanel
              product={product}
              businessDomain={businessDomain}
            />

            {isDealership ? (
              <DealershipProductActions
                product={product}
                businessDomain={businessDomain}
                business={business}
                settings={settings}
                currency={storeCurrency}
              />
            ) : null}
            
            {/* Trust Badges, dynamic from store settings */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-900">Free Shipping</p>
                  <p className="text-xs text-gray-500">Over {formatCurrency(Number(threshold), storeCurrency)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-900">Secure Payment</p>
                  <p className="text-xs text-gray-500">100% safe</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-900">Easy Returns</p>
                  <p className="text-xs text-gray-500">{returnDays}-day policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Details Tabs, client component with real interactivity */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-12">
        <ProductTabs
          product={product}
          freeShippingThreshold={threshold}
          returnPolicyDays={returnDays}
          currency={storeCurrency}
        />
      </div>
      
      {/* Reviews Section */}
      {product.enable_reviews !== false && (
        <div className="mb-12">
          <ProductReviews 
            productId={product.id}
            businessDomain={businessDomain}
            initialRating={product.rating}
            reviewCount={product.review_count}
          />
        </div>
      )}
      
      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mb-12">
          <RelatedProducts 
            products={relatedProducts}
            businessDomain={businessDomain}
            title="You May Also Like"
          />
        </div>
      )}
    </div>
  );
}
