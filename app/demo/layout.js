import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Book a demo',
  description:
    'Schedule a live TENVO demo: inventory, POS, storefront, and accounting in one walkthrough. See vertical presets for retail, restaurant, pharmacy, automotive, and more.',
  path: '/demo',
  keywords: ['TENVO demo', 'ERP demo Pakistan', 'inventory software demo', 'book a demo'],
});

export default function DemoLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Demo', url: `${site}/demo` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
