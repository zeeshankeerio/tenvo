import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Features',
  description:
    'Explore TENVO features: multi-warehouse inventory, POS, branded storefront, orders, accounting, CRM, and industry presets. One hub instead of stitched global apps.',
  path: '/features',
  keywords: [
    'inventory management features',
    'POS features',
    'online storefront builder',
    'multi-warehouse ERP',
    'business operations platform',
  ],
});

export default function FeaturesLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Features', url: `${site}/features` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
