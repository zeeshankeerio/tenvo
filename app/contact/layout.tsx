import type { Metadata } from 'next';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { getSiteUrl } from '@/lib/marketing/site-url';
import {
  CONTACT_PAGE_FAQS,
  getBreadcrumbSchema,
  getContactWebPageSchema,
  getFAQSchema,
} from '@/lib/marketing/structured-data';

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Contact — sales, demos and support',
  description:
    'Reach TENVO for inventory, POS, storefront, and accounting questions; book a demo; billing and enterprise rollout. Built by Mindscape Analytics LLC (Sheridan, WY). Typical reply within one business day.',
  path: '/contact',
  keywords: [
    'contact TENVO',
    'TENVO support',
    'TENVO sales',
    'business operations software Pakistan',
    'inventory POS demo',
    'Mindscape Analytics LLC',
  ],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const site = getSiteUrl();
  const contactPageLd = getContactWebPageSchema();
  const faqLd = getFAQSchema(CONTACT_PAGE_FAQS);
  const breadcrumbLd = getBreadcrumbSchema([
    { name: 'Home', url: `${site}/` },
    { name: 'Contact', url: `${site}/contact` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      {children}
    </>
  );
}
