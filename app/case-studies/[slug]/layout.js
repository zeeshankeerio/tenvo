import { MarketingJsonLd } from '@/components/marketing/MarketingJsonLd';
import { getCaseStudy } from '@/lib/marketing/case-studies';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import { getArticleSchema, getBreadcrumbSchema } from '@/lib/marketing/structured-data';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cs = getCaseStudy(slug);
  if (!cs) {
    return buildMarketingMetadata({
      title: 'Case study not found',
      description: 'This case study could not be found.',
      path: `/case-studies/${slug}`,
      noIndex: true,
    });
  }
  return buildMarketingMetadata({
    title: `${cs.company} case study`,
    description: cs.summary,
    path: `/case-studies/${slug}`,
    type: 'article',
    keywords: ['TENVO case study', cs.industry, cs.company],
  });
}

export default async function CaseStudyDetailLayout({ children, params }) {
  const { slug } = await params;
  const cs = getCaseStudy(slug);
  const site = getSiteUrl();

  if (!cs) return children;

  return (
    <>
      <MarketingJsonLd
        schemas={[
          getArticleSchema(cs),
          getBreadcrumbSchema([
            { name: 'Home', url: `${site}/` },
            { name: 'Case studies', url: `${site}/case-studies` },
            { name: cs.company, url: `${site}/case-studies/${slug}` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
