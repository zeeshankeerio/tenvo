import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema, getPricingAggregateOfferSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Pricing and plans',
  description:
    'Compare TENVO plans for inventory, POS, storefront, and accounting. Free tier to start; paid tiers for multi-warehouse, CRM, manufacturing, and enterprise. Transparent limits at www.tenvo.store.',
  path: '/pricing',
  keywords: [
    'TENVO pricing',
    'ERP pricing Pakistan',
    'inventory software cost',
    'POS subscription',
    'business software plans',
  ],
});

export default function PricingLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getPricingAggregateOfferSchema(),
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Pricing', url: `${site}/pricing` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
