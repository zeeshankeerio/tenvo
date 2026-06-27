import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { VERTICAL_COUNT } from '@/lib/marketing/capabilities';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'Industries and verticals',
  description: `Industry presets for ${VERTICAL_COUNT}+ verticals: retail, restaurant, pharmacy, automotive, manufacturing, and more. TENVO adapts inventory, POS, and storefront workflows to your trade.`,
  path: '/industries',
  keywords: [
    'industry ERP',
    'retail inventory software',
    'restaurant POS Pakistan',
    'pharmacy inventory',
    'vertical SaaS',
  ],
});

export default function IndustriesLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Industries', url: `${site}/industries` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
