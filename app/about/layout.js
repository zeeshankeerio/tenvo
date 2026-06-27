import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export const metadata = buildMarketingMetadata({
  title: 'About TENVO',
  description:
    'Learn about TENVO, the operations platform from Mindscape Analytics LLC. Mission, team, Pakistan-first launch depth, and global roadmap for inventory, POS, and commerce.',
  path: '/about',
  keywords: ['about TENVO', 'Mindscape Analytics', 'business software company', 'ERP Pakistan'],
});

export default function AboutLayout({ children }) {
  const site = getSiteUrl();
  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'About', url: `${site}/about` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
