import { notFound } from 'next/navigation';
import { getBusinessByDomain } from '@/lib/actions/storefront/business';
import { buildStoreJsonLd, buildStoreWebSiteJsonLd } from '@/lib/storefront/jsonLd';
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
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();

  const meta = {
    title: `${business.business_name} — Online Store`,
    description: business.description || `Shop online at ${business.business_name}`,
    keywords: business.keywords || 'online store, shop, ecommerce',
    openGraph: {
      title: business.business_name,
      description: business.description,
      type: 'website',
      url: base ? `${base.replace(/\/$/, '')}/store/${business.domain}` : undefined,
      images: business.logo_url?.startsWith('https://') ? [{ url: business.logo_url }] : [],
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
  const result = await getBusinessByDomain(businessDomain);
  
  if (!result.success) {
    notFound();
  }
  
  const { business, settings, categories, plan } = result;

  const storeJsonLd = buildStoreJsonLd({ business, businessDomain: business.domain });
  const webSiteJsonLd = buildStoreWebSiteJsonLd({ business, businessDomain: business.domain });

  return (
    <StoreProviders business={business} settings={settings} categories={categories} plan={plan}>
      <div className="min-h-screen bg-gray-50">
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
        <StoreHeader 
          business={business} 
          categories={categories}
          settings={settings}
        />
        
        <main id="store-main" className="min-h-[calc(100vh-300px)]" tabIndex={-1}>
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
