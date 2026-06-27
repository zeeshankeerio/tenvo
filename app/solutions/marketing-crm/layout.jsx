import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Marketing, CRM and growth',
  description:
    'Campaigns, loyalty, CRM, quotations, and analytics in the same hub as inventory, POS, and finance. TENVO growth tools without a separate marketing stack.',
  path: '/solutions/marketing-crm',
  keywords: ['marketing CRM ERP', 'loyalty program software', 'campaign management SMB'],
});

export default function MarketingCrmLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Marketing & CRM', url: `${site}/solutions/marketing-crm` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
