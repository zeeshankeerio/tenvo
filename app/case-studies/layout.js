import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Customer case studies',
  description:
    'See how businesses use TENVO for inventory, POS, and operations: retail chains, textile manufacturing, and pharmacy workflows.',
  path: '/case-studies',
  keywords: ['TENVO case studies', 'ERP success stories', 'inventory software results'],
});

export default function CaseStudiesLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Case studies', url: `${site}/case-studies` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
