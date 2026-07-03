import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';
import { INDUSTRY_PLANS_NAV } from '@/lib/marketing/domainPackageNav';

export const metadata = buildMarketingMetadata({
  title: 'Industry Plans — vertical commerce suites',
  description: INDUSTRY_PLANS_NAV.hubDescription,
  path: INDUSTRY_PLANS_NAV.hubPath,
  keywords: [
    'industry plans',
    'vertical commerce suite',
    'clothing ERP',
    'pharmacy POS',
    'auto parts inventory',
    'vehicle showroom software',
    'furniture commerce',
    'TENVO Pakistan',
  ],
});

export default function IndustryPlansLayout({ children }) {
  const site = getSiteUrl();

  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: INDUSTRY_PLANS_NAV.hubTitle, url: `${site}${INDUSTRY_PLANS_NAV.hubPath}` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
