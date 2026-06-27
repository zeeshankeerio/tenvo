/**
 * FAQ Data - aligned with PLAN_TIERS and lib/marketing/capabilities.js
 */

import { VERTICAL_COUNT } from '@/lib/marketing/capabilities';

export const faqs = [
  {
    id: 'what-is-tenvo',
    question: 'What is TENVO?',
    answer:
      'TENVO is a cloud business workspace for inventory, sales, POS, branded storefront, finance, and growth tools - designed with deep Pakistan fit and a global roadmap. One hub replaces stitched spreadsheets and disconnected apps.',
    category: 'General',
  },
  {
    id: 'fbr-compliance',
    question: 'How does TENVO handle FBR and sales tax?',
    answer:
      'TENVO configures GST/sales tax, calculates tax on invoices and POS sales, and produces audit-friendly summaries and exports for your accountant. Live FBR IRIS / Tier-1 POS transmission is on our roadmap - we do not claim automated filing to FBR servers today.',
    category: 'Compliance',
  },
  {
    id: 'pricing',
    question: 'What are the pricing plans?',
    answer:
      'Five tiers from Free through Enterprise: Free (core invoicing & inventory), Starter (POS + finance basics), Professional (multi-warehouse, CRM, restaurant POS), Business (manufacturing, AI, campaigns, payroll), and Enterprise (custom limits & platform features). See the Pricing page for live limits from PLAN_TIERS.',
    category: 'Pricing',
  },
  {
    id: 'trial',
    question: 'Is there a free trial?',
    answer:
      'Yes. Start on the Free plan with no credit card. Paid tiers can be activated via Stripe Checkout when configured, or through sales-assisted billing and bank transfer.',
    category: 'Pricing',
  },
  {
    id: 'data-security',
    question: 'How secure is my data?',
    answer:
      'Each business is tenant-scoped by business_id with role-based permissions. Data is hosted on secure cloud infrastructure with TLS in transit. Contact us for your region’s data residency and backup questions.',
    category: 'Security',
  },
  {
    id: 'multi-location',
    question: 'Can I manage multiple locations?',
    answer:
      'Yes. Multi-warehouse and branch features unlock on Professional and higher tiers (limits scale by plan). Inter-warehouse transfers and location-aware inventory are supported when your plan includes multi_warehouse.',
    category: 'Features',
  },
  {
    id: 'urdu-support',
    question: 'Does TENVO support Urdu?',
    answer:
      'TENVO includes a language toggle with growing Urdu translations for hub workflows. Full RTL coverage and Urdu invoices across every screen are expanding release by release - not 100% localized today.',
    category: 'Features',
  },
  {
    id: 'migration',
    question: 'Can I migrate from Excel or another system?',
    answer:
      'Yes. Use built-in Excel import for products and masters. Professional+ customers can request guided migration help via demo or contact - scope depends on your plan and data complexity.',
    category: 'Support',
  },
  {
    id: 'mobile-app',
    question: 'Is there a mobile app?',
    answer:
      'TENVO is a responsive web app optimized for phones and tablets - including mobile inventory and POS layouts. Native iOS/Android store apps are not required for day-to-day operations.',
    category: 'Features',
  },
  {
    id: 'integrations',
    question: 'What integrations are available?',
    answer:
      'Stripe (billing & storefront cards), Resend (email), optional NOWPayments (crypto), and Pakistani wallet labels at checkout. Shopify, Daraz, and WooCommerce connectors are roadmap. See /integrations for an honest status map.',
    category: 'Features',
  },
  {
    id: 'industries',
    question: 'How many industries do you support?',
    answer: `${VERTICAL_COUNT} vertical presets configure units, templates, dashboards, and intelligence defaults for your business category - retail, wholesale, pharmacy, hospitality, manufacturing, and more.`,
    category: 'Features',
  },
  {
    id: 'support-hours',
    question: 'How do I get support?',
    answer:
      'Use in-app help, contact form, WhatsApp link, or book a demo. Enterprise customers can agree dedicated support channels in their order.',
    category: 'Support',
  },
];

export function getFAQsByCategory(category) {
  return faqs.filter((faq) => faq.category === category);
}

export function searchFAQs(query) {
  const lowerQuery = query.toLowerCase();
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery)
  );
}

export function getFAQCategories() {
  return [...new Set(faqs.map((faq) => faq.category))];
}
