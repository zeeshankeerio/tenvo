import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Integrations',
  description:
    'Connect TENVO with payments (JazzCash, EasyPaisa, Stripe), couriers, sales channels, and accounting tools. One operations hub with integrations that match your plan.',
  path: '/integrations',
  keywords: [
    'ERP integrations',
    'POS payment integrations Pakistan',
    'ecommerce integrations',
    'QuickBooks Xero integration',
  ],
});

export default function IntegrationsLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Integrations', url: `${site}/integrations` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
