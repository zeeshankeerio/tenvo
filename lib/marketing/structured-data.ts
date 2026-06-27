/**
 * Structured Data (JSON-LD) for SEO
 * Following 2026 Schema.org best practices
 */

import { getSiteUrl } from '@/lib/marketing/site-url';
import { getSalesMeetingUrl } from '@/lib/marketing/salesLinks';
import { TENVO_PARENT_COMPANY } from '@/lib/marketing/tenvo-assistant-knowledge';

/** Minimal FAQ shape for FAQPage JSON-LD. */
export type FaqItem = {
  question: string;
  answer: string;
  id?: string;
  category?: string;
};

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type CaseStudyArticleInput = {
  title?: string;
  company?: string;
  summary: string;
  heroImage?: string;
  publishedDate?: string;
  modifiedDate?: string;
};

export type JsonLdObject = Record<string, unknown> & {
  '@context'?: string;
  '@type'?: string;
  '@id'?: string;
};

/** US display phone → ITU-T style for JSON-LD (keep in sync with TENVO_PARENT_COMPANY.phone) */
const parentTelephone = (() => {
  const d = TENVO_PARENT_COMPANY.phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) {
    return `+1-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return TENVO_PARENT_COMPANY.phone.replace(/\s/g, '');
})();

function getOrganizationSameAs(): string[] {
  const links = [
    TENVO_PARENT_COMPANY.website,
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN?.trim(),
    process.env.NEXT_PUBLIC_SOCIAL_TWITTER?.trim(),
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK?.trim(),
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE?.trim(),
  ].filter((link): link is string => Boolean(link));
  return [...new Set(links)];
}

export function getOrganizationSchema(): JsonLdObject {
  const site = getSiteUrl();
  const sameAs = getOrganizationSameAs();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    name: 'TENVO',
    legalName: 'Mindscape Analytics LLC',
    url: site,
    logo: {
      '@type': 'ImageObject',
      url: `${site}/tenvo.svg`,
      width: 512,
      height: 512,
    },
    image: `${site}/industrial_hero_image.png`,
    description:
      'TENVO is business operations software: inventory, warehouses, POS, branded storefront, orders, and accounting in one platform. Deep Pakistan fit at launch (FBR-aware positioning, Urdu, local payments); scaling globally. Parent: Mindscape Analytics LLC (Sheridan, WY, USA).',
    parentOrganization: {
      '@type': 'Organization',
      name: TENVO_PARENT_COMPANY.name,
      url: TENVO_PARENT_COMPANY.website,
      telephone: parentTelephone,
      email: TENVO_PARENT_COMPANY.email,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Sheridan',
        addressRegion: 'WY',
        addressCountry: 'US',
      },
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PK',
      addressLocality: 'Karachi',
      addressRegion: 'Sindh',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: `${site}/contact`,
        areaServed: ['PK', 'US', 'Worldwide'],
        availableLanguage: ['en', 'ur'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        url: getSalesMeetingUrl(),
        areaServed: ['PK', 'AE', 'SA', 'IN', 'US', 'Worldwide'],
        availableLanguage: ['en'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'corporate',
        url: TENVO_PARENT_COMPANY.contactPage,
        email: TENVO_PARENT_COMPANY.email,
        telephone: parentTelephone,
        areaServed: 'Worldwide',
      },
    ],
    foundingDate: '2023',
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function getWebSiteSchema(): JsonLdObject {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site}/#website`,
    name: 'TENVO',
    url: site,
    description:
      'Inventory, POS, branded storefront, orders, and accounting in one platform for growing businesses.',
    publisher: { '@id': `${site}/#organization` },
    inLanguage: ['en-PK', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site}/help?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getHomeWebPageSchema(): JsonLdObject {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${site}/#webpage`,
    url: site,
    name: 'TENVO — Inventory, POS, storefront, and accounting in one platform',
    isPartOf: { '@id': `${site}/#website` },
    about: { '@id': `${site}/#organization` },
    description:
      'Replace stitched apps with one connected platform for inventory, warehouses, POS, storefront, orders, and accounting.',
    inLanguage: 'en-PK',
  };
}

export function getSoftwareApplicationSchema(): JsonLdObject {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${site}/#software`,
    name: 'TENVO',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'ERP',
    operatingSystem: 'Web Browser',
    browserRequirements: 'Requires JavaScript. Modern evergreen browser.',
    url: site,
    description:
      'Inventory, POS, branded storefront, orders, accounting, and compliance-oriented workflows in one platform. Pakistan-first launch depth; global product roadmap.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PKR',
      description: 'Free trial available; paid tiers on the pricing page.',
      url: `${site}/pricing`,
    },
    featureList: [
      'Multi-warehouse inventory',
      'POS and hospitality workflows',
      'Branded online storefront',
      'Order fulfilment and courier integrations',
      'Accounting and compliance-oriented reporting',
      'Urdu-friendly UI positioning for local teams',
    ],
    provider: {
      '@type': 'Organization',
      name: TENVO_PARENT_COMPANY.name,
      url: TENVO_PARENT_COMPANY.website,
    },
  };
}

export function getPricingAggregateOfferSchema(): JsonLdObject {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'TENVO Business Operations Platform',
    description:
      'Subscription plans for inventory, POS, storefront, and accounting — from free trial to enterprise.',
    brand: { '@type': 'Brand', name: 'TENVO' },
    url: `${site}/pricing`,
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '99999',
      priceCurrency: 'PKR',
      offerCount: 5,
      url: `${site}/pricing`,
      availability: 'https://schema.org/InStock',
    },
  };
}

export const CONTACT_PAGE_FAQS: readonly FaqItem[] = [
  {
    id: 'contact-response-time',
    category: 'Support',
    question: 'How quickly will TENVO respond to my message?',
    answer:
      'We aim to reply to sales and general inquiries within one business day (Pakistan time on weekdays). Technical issues may be routed faster when you include order numbers, screenshots, and steps to reproduce.',
  },
  {
    id: 'contact-demo-vs-form',
    category: 'Sales',
    question: 'Should I use this form or book a demo?',
    answer:
      'Use this contact form for written questions, custom procurement, or when you need a paper trail. If you want a guided walkthrough of inventory, POS, storefront, and accounting flows in TENVO, book a live meeting from Pricing or our scheduler - we will tailor the session to your vertical.',
  },
  {
    id: 'contact-mindscape',
    category: 'Company',
    question: 'What is the relationship between TENVO and Mindscape Analytics?',
    answer:
      'TENVO is a Mindscape Analytics LLC product. Mindscape (mindscapeanalytics.com) provides enterprise AI and systems architecture; TENVO is the operations and commerce platform for growing businesses. Corporate and partnership contact details for Mindscape appear on this page.',
  },
  {
    id: 'contact-pricing-region',
    category: 'Billing',
    question: 'Where do I see current plan prices for my region?',
    answer:
      'Visit the Pricing page for list pricing and regional notes. If you need invoicing in a specific currency, tax registration on invoices, or a custom deployment, mention it in your message and we will route you to the right team.',
  },
  {
    id: 'contact-data-handling',
    category: 'Privacy',
    question: 'What happens to the information I submit?',
    answer:
      'Your message is used only to respond to your request and improve our service. We do not sell contact form data. For details on cookies, analytics, and legal bases, see the Privacy Policy linked in the site footer.',
  },
  {
    id: 'contact-enterprise',
    category: 'Sales',
    question: 'Do you support multi-location or franchise rollouts?',
    answer:
      'Yes. TENVO supports multi-business and warehouse models. Describe your store count, countries, and integrations in your message so we can recommend a plan tier and onboarding path.',
  },
];

export function getContactWebPageSchema(): JsonLdObject {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact TENVO - sales and support',
    description:
      'Contact TENVO for sales, demos, billing questions, and technical support. Built by Mindscape Analytics LLC (Sheridan, WY, USA).',
    url: `${site}/contact`,
    inLanguage: ['en-PK', 'en-US', 'en'],
    isPartOf: {
      '@type': 'WebSite',
      name: 'TENVO',
      url: site,
    },
    publisher: {
      '@type': 'Organization',
      name: TENVO_PARENT_COMPANY.name,
      url: TENVO_PARENT_COMPANY.website,
    },
  };
}

export function getFAQSchema(faqs: readonly FaqItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function getArticleSchema(article: CaseStudyArticleInput): JsonLdObject {
  const site = getSiteUrl();
  const headline = article.title || article.company || 'TENVO case study';
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description: article.summary,
    image: article.heroImage,
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate || article.publishedDate,
    author: {
      '@type': 'Organization',
      name: 'TENVO',
    },
    publisher: {
      '@type': 'Organization',
      name: 'TENVO',
      logo: {
        '@type': 'ImageObject',
        url: `${site}/tenvo.svg`,
      },
    },
  };
}

export function getProductSchema(pricingTier: {
  name: string;
  features: string[];
  price: { amount?: string | number; currency: string };
  ctaHref?: string;
}): JsonLdObject {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `TENVO ${pricingTier.name} Plan`,
    description: `TENVO ERP ${pricingTier.name} plan with ${pricingTier.features.join(', ')}`,
    brand: {
      '@type': 'Brand',
      name: 'TENVO',
    },
    offers: {
      '@type': 'Offer',
      price: String(pricingTier.price.amount ?? '0'),
      priceCurrency: pricingTier.price.currency,
      availability: 'https://schema.org/InStock',
      url: `${site}${pricingTier.ctaHref || '/pricing'}`,
    },
  };
}

export function getBreadcrumbSchema(breadcrumbs: readonly BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function renderJSONLD(schema: JsonLdObject): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
