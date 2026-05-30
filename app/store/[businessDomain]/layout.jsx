import { notFound } from 'next/navigation';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { StoreProviders } from '@/components/storefront/StoreProviders';
import { StoreHeader } from '@/components/storefront/StoreHeader';
import { StoreFooter } from '@/components/storefront/StoreFooter';
import { LiveChat } from '@/components/storefront/LiveChat';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { BackToTop } from '@/components/storefront/BackToTop';

export async function generateMetadata({ params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    return {
      title: 'Store Not Found',
    };
  }
  
  const business = result.business;
  
  return {
    title: `${business.business_name} - Online Store`,
    description: business.description || `Shop online at ${business.business_name}`,
    keywords: business.keywords || 'online store, shop, ecommerce',
    openGraph: {
      title: business.business_name,
      description: business.description,
      type: 'website',
      images: business.logo_url?.startsWith('https://') ? [{ url: business.logo_url }] : [],
    },
  };
}

export default async function StoreLayout({ children, params }) {
  const { businessDomain } = await params;
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    notFound();
  }
  
  const { business, settings, categories } = result;
  
  return (
    <StoreProviders business={business} settings={settings} categories={categories}>
      <div className="min-h-screen bg-gray-50">
        <StoreHeader 
          business={business} 
          categories={categories}
          settings={settings}
        />
        
        <main className="min-h-[calc(100vh-300px)]">
          {children}
        </main>
        
        <StoreFooter 
          business={business}
          settings={settings}
        />
        
        {/* Floating Elements */}
        <CartDrawer />
        <LiveChat businessId={business.id} />
        <BackToTop />
      </div>
    </StoreProviders>
  );
}
