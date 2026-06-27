import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Why TENVO',
  description:
    'Why choose TENVO over stitched spreadsheets and disconnected apps? One platform for inventory, POS, storefront, orders, and accounting with Pakistan-first depth.',
  path: '/why-tenvo',
  keywords: [
    'why TENVO',
    'TENVO vs competitors',
    'all-in-one business software',
    'ERP alternative Pakistan',
  ],
});

export default function WhyTenvoLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Why TENVO', url: `${site}/why-tenvo` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
