import { notFound } from 'next/navigation';
import DomainPackageSolutionsPage from '@/components/marketing/solutions/DomainPackageSolutionsPage';
import { getDomainPackageBySlug, listDomainPackages } from '@/lib/config/domainPackages';
import { getDomainPackageSolutionsContent } from '@/lib/marketing/domainPackageSolutionsContent';

export function generateStaticParams() {
  return listDomainPackages().map((pkg) => ({ slug: pkg.slug }));
}

/**
 * @param {{ params: Promise<{ slug: string }> }} props
 */
export default async function DomainPackageSolutionPage({ params }) {
  const { slug } = await params;
  const pkg = getDomainPackageBySlug(slug);
  const content = getDomainPackageSolutionsContent(slug);
  if (!pkg || !content) notFound();
  return <DomainPackageSolutionsPage pkg={pkg} content={content} />;
}
