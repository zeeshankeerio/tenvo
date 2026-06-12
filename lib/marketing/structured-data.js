/**
 * Structured Data (JSON-LD) for SEO
 * Following 2026 Schema.org best practices
 */

import { getSiteUrl } from '@/lib/marketing/site-url';
import { TENVO_PARENT_COMPANY } from '@/lib/marketing/tenvo-assistant-knowledge';

/** US display phone → ITU-T style for JSON-LD (keep in sync with TENVO_PARENT_COMPANY.phone) */
const parentTelephone = (() => {
  const d = TENVO_PARENT_COMPANY.phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) {
    return `+1-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return TENVO_PARENT_COMPANY.phone.replace(/\s/g, '');
})();

/**
 * Get Organization schema
 * @returns {Object} Organization JSON-LD
 */
export function getOrganizationSchema() {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TENVO',
    url: site,
    logo: `${site}/industrial_hero_image.png`,
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
        url: `${site}/demo`,
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
  };
}

/**
 * Get Software Application schema
 * @returns {Object} SoftwareApplication JSON-LD
 */
export function getSoftwareApplicationSchema() {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TENVO',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
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

/**
 * FAQs for /contact — drives on-page accordion + FAQPage JSON-LD (keep answers factual).
 */
export const CONTACT_PAGE_FAQS = [
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
      'Use this contact form for written questions, custom procurement, or when you need a paper trail. If you want a guided walkthrough of inventory, POS, storefront, and accounting flows in TENVO, book a live demo from the Pricing or Demo page — we will tailor the session to your vertical.',
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

/** JSON-LD WebPage describing the marketing contact route (complements global Organization schema). */
export function getContactWebPageSchema() {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact TENVO — sales and support',
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

/**
 * Get FAQ schema
 * @param {Array} faqs - Array of FAQ objects
 * @returns {Object} FAQPage JSON-LD
 */
export function getFAQSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Get Article schema (for case studies/blog posts)
 * @param {Object} article - Article data
 * @returns {Object} Article JSON-LD
 */
export function getArticleSchema(article) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.summary,
    "image": article.heroImage,
    "datePublished": article.publishedDate,
    "dateModified": article.modifiedDate || article.publishedDate,
    "author": {
      "@type": "Organization",
      "name": "TENVO"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TENVO",
      "logo": {
        "@type": "ImageObject",
        url: `${site}/industrial_hero_image.png`,
      }
    }
  };
}

/**
 * Get Product schema (for pricing pages)
 * @param {Object} pricingTier - Pricing tier data
 * @returns {Object} Product JSON-LD
 */
export function getProductSchema(pricingTier) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `TENVO ${pricingTier.name} Plan`,
    "description": `TENVO ERP ${pricingTier.name} plan with ${pricingTier.features.join(', ')}`,
    "brand": {
      "@type": "Brand",
      "name": "TENVO"
    },
    "offers": {
      "@type": "Offer",
      "price": pricingTier.price.amount || "0",
      "priceCurrency": pricingTier.price.currency,
      "availability": "https://schema.org/InStock",
      url: `${site}${pricingTier.ctaHref || '/pricing'}`,
    }
  };
}

/**
 * Get BreadcrumbList schema
 * @param {Array} breadcrumbs - Array of breadcrumb objects {name, url}
 * @returns {Object} BreadcrumbList JSON-LD
 */
export function getBreadcrumbSchema(breadcrumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
}

/**
 * Render JSON-LD script tag
 * @param {Object} schema - Schema object
 * @returns {string} Script tag HTML
 */
export function renderJSONLD(schema) {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
