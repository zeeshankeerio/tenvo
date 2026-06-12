import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/marketing/site-url';
import {
  CONTACT_PAGE_FAQS,
  getBreadcrumbSchema,
  getContactWebPageSchema,
  getFAQSchema,
} from '@/lib/marketing/structured-data';

export const metadata: Metadata = {
  title: 'Contact TENVO — sales, demos & support',
  description:
    'Reach TENVO for inventory, POS, storefront, and accounting questions; book a demo path; billing and enterprise rollout. Built by Mindscape Analytics LLC (Sheridan, WY). Typical reply within one business day.',
  keywords: [
    'contact TENVO',
    'TENVO support',
    'TENVO sales',
    'business operations software Pakistan',
    'inventory POS demo',
    'Mindscape Analytics LLC',
  ],
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact TENVO — sales, demos & support',
    description:
      'Message our team for pricing, demos, technical support, and partnerships. Parent company: Mindscape Analytics LLC.',
    url: '/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact TENVO',
    description:
      'Sales, billing, and support for TENVO — inventory, POS, storefront, and accounting in one platform.',
  },
  robots: { index: true, follow: true },
};

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
