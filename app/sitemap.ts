import type { MetadataRoute } from 'next';
import { caseStudies } from '@/lib/marketing/case-studies';
import { MARKETING_SITEMAP_ROUTES } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  const marketing = MARKETING_SITEMAP_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const caseStudyPages = caseStudies.map((cs) => ({
    url: `${base}/case-studies/${cs.slug}`,
    lastModified: cs.publishedDate ? new Date(cs.publishedDate) : lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [...marketing, ...caseStudyPages];
}
