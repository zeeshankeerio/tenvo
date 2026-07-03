import { notFound } from 'next/navigation';
import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getBreadcrumbSchema } from '@/lib/marketing/structured-data';
import { getDomainPackageBySlug, listDomainPackages } from '@/lib/config/domainPackages';
import { INDUSTRY_PLANS_NAV } from '@/lib/marketing/domainPackageNav';

export function generateStaticParams() {
  return listDomainPackages().map((pkg) => ({ slug: pkg.slug }));
}

/**
 * @param {{ params: Promise<{ slug: string }> }} props
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const pkg = getDomainPackageBySlug(slug);
  if (!pkg) {
    return buildMarketingMetadata({
      title: 'Solution not found',
      description: 'Domain commerce suite',
      path: `/solutions/${slug}`,
    });
  }
  return buildMarketingMetadata({
    title: pkg.name,
    description: pkg.summary,
    path: pkg.marketingPath,
    keywords: [
      pkg.name,
      ...pkg.verticals,
      'vertical commerce suite',
      'ERP Pakistan',
      'storefront POS',
    ],
  });
}

/**
 * @param {{ children: React.ReactNode, params: Promise<{ slug: string }> }} props
 */
export default async function DomainPackageSolutionLayout({ children, params }) {
  const { slug } = await params;
  const pkg = getDomainPackageBySlug(slug);
  if (!pkg) notFound();

  const site = getSiteUrl();
  const path = pkg.marketingPath || `/solutions/${slug}`;

  return (
    <>
      <MarketingJsonLd
        schemas={[
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: INDUSTRY_PLANS_NAV.hubTitle, url: `${site}${INDUSTRY_PLANS_NAV.hubPath}` },
            { name: pkg.name, url: `${site}${path}` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
