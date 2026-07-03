/**
 * Marketing capability catalog - single source of truth for public pages.
 * Status: shipped = in product today; partial = usable with caveats; roadmap = planned / sales-assisted.
 *
 * Keep aligned with PLAN_TIERS (`lib/config/plans.js`) and docs/MARKET_READINESS.md.
 */

export const VERTICAL_COUNT = 62;

/** @typedef {'shipped' | 'partial' | 'roadmap'} CapabilityStatus */

export const CAPABILITY_STATUS_LABEL = {
  shipped: 'Available',
  partial: 'Partial',
  roadmap: 'Roadmap',
};

export const CAPABILITY_STATUS_STYLE = {
  shipped: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  partial: 'bg-amber-50 text-amber-800 border border-amber-200',
  roadmap: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
};

/**
 * Core platform modules - used on Features, nav mega-menu, and homepage sections.
 * @type {Array<{ id: string, title: string, description: string, shortDescription?: string, status: CapabilityStatus, minPlan?: string, href: string }>}
 */
export const PLATFORM_MODULES = [
  {
    id: 'inventory',
    title: 'Inventory Engine',
    shortDescription: 'Stock, warehouses, batch/serial, Excel import.',
    description:
      'Multi-warehouse stock, batch & serial tracking (plan-gated), transfers, adjustments, Excel import, and product images with smart placeholders.',
    status: 'shipped',
    minPlan: 'free',
    href: '/features#inventory',
  },
  {
    id: 'compliance',
    title: 'Tax & compliance (Pakistan-first)',
    shortDescription: 'GST setup, tax summaries, audit-ready ledgers.',
    description:
      'GST/sales tax configuration, Pakistani tax summaries, and audit-ready ledgers. FBR IRIS live transmission is on the roadmap - not live sync today.',
    status: 'partial',
    minPlan: 'starter',
    href: '/features#compliance',
  },
  {
    id: 'accounting',
    title: 'General Ledger',
    shortDescription: 'Journals, COA, fiscal periods on higher tiers.',
    description:
      'Journal entries, chart of accounts, fiscal periods (Professional+), and finance hub posting from sales and POS.',
    status: 'shipped',
    minPlan: 'free',
    href: '/features#accounting',
  },
  {
    id: 'pos',
    title: 'POS Terminal',
    shortDescription: 'Retail checkout, sessions, receipts, product images.',
    description:
      'Retail checkout, sessions, terminals, barcode/SKU lookup, cart with product images, and thermal receipt printing from the browser.',
    status: 'shipped',
    minPlan: 'starter',
    href: '/features#pos-hospitality',
  },
  {
    id: 'storefront',
    title: 'Branded online store',
    shortDescription: 'Public shop, checkout, order hub in one workspace.',
    description:
      'Public catalog, cart, checkout, and order hub tied to your business domain. COD and Stripe Connect when configured.',
    status: 'shipped',
    minPlan: 'free',
    href: '/features#storefront',
  },
  {
    id: 'restaurant',
    title: 'Cafés & restaurants',
    shortDescription: 'Table POS & kitchen display on supported plans.',
    description:
      'Table-service POS, kitchen display (Business+), and restaurant order flows alongside retail inventory.',
    status: 'partial',
    minPlan: 'professional',
    href: '/features#pos-hospitality',
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing & BOM',
    shortDescription: 'BOM & production orders (Business+).',
    description:
      'Bill of materials and production orders with material reservations. Full MES / shop-floor scheduling is roadmap.',
    status: 'partial',
    minPlan: 'business',
    href: '/features#manufacturing',
  },
  {
    id: 'crm',
    title: 'Loyalty & CRM',
    shortDescription: 'Customers, loyalty, promotions tied to sales.',
    description:
      'Customer records, loyalty programs, and promotions wired to POS and invoices - not a disconnected contact list.',
    status: 'shipped',
    minPlan: 'professional',
    href: '/solutions/marketing-crm#crm',
  },
  {
    id: 'membership-management',
    title: 'Membership management',
    shortDescription: 'Plans, enrollments, renewals for gyms and wellness.',
    description:
      'Membership plans synced from inventory SKUs, enrollments via storefront and POS, renewals, member storefront pricing, and hub lifecycle tools for gym, spa, salon, and related verticals (Professional+).',
    status: 'shipped',
    minPlan: 'professional',
    href: '/features#membership-management',
  },
  {
    id: 'campaigns',
    title: 'Campaigns & marketing',
    shortDescription: 'Segments & outreach on real order data.',
    description:
      'Campaign hub for segments and outreach tied to real orders. Full MAP automation (SMS, abandoned cart) varies by plan.',
    status: 'partial',
    minPlan: 'business',
    href: '/solutions/marketing-crm#campaigns',
  },
  {
    id: 'analytics',
    title: 'Analytics & AI',
    shortDescription: 'Dashboards, reports, AI analyst (plan-gated).',
    description:
      'Operational dashboards, report builder, demand forecasting signals, and AI Business Analyst (plan + API keys).',
    status: 'partial',
    minPlan: 'business',
    href: '/features#analytics',
  },
  {
    id: 'sales-pipeline',
    title: 'Quotations & sales pipeline',
    shortDescription: 'B2B quotes & sales orders with stock context.',
    description:
      'B2B quotations, sales orders, and delivery challans with live stock context on Professional+.',
    status: 'shipped',
    minPlan: 'free',
    href: '/solutions/marketing-crm#sales-suite',
  },
];

/**
 * Third-party and payment integrations - honest availability for /integrations.
 */
export const INTEGRATIONS_CATALOG = [
  {
    name: 'Stripe',
    category: 'Payments & billing',
    description:
      'SaaS subscriptions via Stripe Checkout and customer billing portal. Storefront card payments via Stripe Connect when configured.',
    status: 'shipped',
    features: ['Subscription checkout', 'Billing portal', 'Storefront card payments (Connect)'],
  },
  {
    name: 'NOWPayments',
    category: 'Crypto billing',
    description: 'Optional crypto subscription path with webhook reconciliation when env vars are set.',
    status: 'partial',
    features: ['Crypto checkout (optional)', 'Webhook reconciliation'],
  },
  {
    name: 'Resend',
    category: 'Email',
    description: 'Transactional email for OTP, order confirmations, and lead capture when RESEND_API_KEY is configured.',
    status: 'shipped',
    features: ['Auth OTP', 'Order confirmations', 'Contact & demo leads'],
  },
  {
    name: 'Pakistani tax configuration',
    category: 'Compliance',
    description:
      'Sales tax rules, Pakistani tax config UI, and export-oriented summaries. Does not replace FBR IRIS filing - prepare data, export reports.',
    status: 'partial',
    features: ['GST / sales tax setup', 'Tax summaries & exports', 'Audit-friendly transaction logs'],
  },
  {
    name: 'JazzCash & EasyPaisa',
    category: 'Local payments',
    description:
      'Payment method labels and checkout UX for Pakistani wallets. Live wallet capture requires your merchant PSP agreement - not built-in processing.',
    status: 'partial',
    features: ['Checkout method options', 'COD default', 'Stripe for card capture'],
  },
  {
    name: 'WhatsApp',
    category: 'Communication',
    description: 'Click-to-chat wa.me links and notification copy. WhatsApp Business API automation is on the roadmap.',
    status: 'roadmap',
    features: ['wa.me customer links', 'Notification templates (roadmap)', 'PDF invoice delivery (roadmap)'],
  },
  {
    name: 'Shopify',
    category: 'E-commerce',
    description: 'Adapter scaffold exists; bi-directional catalog and order sync is not production-ready. Use TENVO storefront or API for now.',
    status: 'roadmap',
    features: ['Catalog sync (roadmap)', 'Order import (roadmap)', 'Stock mapping (roadmap)'],
  },
  {
    name: 'Daraz',
    category: 'Marketplace',
    description: 'Marketplace order and inventory sync is planned - not available as a live connector today.',
    status: 'roadmap',
    features: ['Inventory sync (roadmap)', 'Order processing (roadmap)'],
  },
  {
    name: 'WooCommerce',
    category: 'E-commerce',
    description: 'WordPress/Woo sync is planned. Prefer TENVO branded storefront or custom API integration on Business+.',
    status: 'roadmap',
    features: ['Catalog sync (roadmap)', 'Variant mapping (roadmap)'],
  },
  {
    name: 'REST API & webhooks',
    category: 'Developer',
    description: 'API access and outbound webhooks are Business+ entitlements. Document routes with sales for your deployment model.',
    status: 'partial',
    features: ['Business+ API access flag', 'Webhook integrations flag', 'Custom integrations via sales'],
  },
  {
    name: 'Bank feeds',
    category: 'Finance',
    description: 'Bank reconciliation UI exists; automated bank statement feeds via API are planned.',
    status: 'roadmap',
    features: ['Manual reconciliation UI', 'Statement parsing (roadmap)', 'Auto-m matching (roadmap)'],
  },
];

/** Short disclaimers reused on homepage simulators and footers */
export const MARKETING_DISCLAIMERS = {
  fbr:
    'TENVO calculates GST/sales tax and produces audit-ready records. Live FBR IRIS / Tier-1 POS transmission is on our roadmap - demo UI may illustrate future flow.',
  stockSync:
    'Storefront, POS, and warehouse share one product catalog. Multi-location businesses should confirm stock rules with your onboarding team.',
  urdu:
    'Urdu language toggle and partial translations are available; full product localization is expanding release by release.',
  hr:
    'Payroll runs on Business+. Attendance and shift scheduling UIs are early - confirm scope on a demo before buying for HR depth.',
};

/** Nav mega-menu columns derived from PLATFORM_MODULES */
export const NAV_SOLUTIONS = {
  enterpriseCore: ['inventory', 'compliance', 'accounting'],
  verticals: ['pos', 'manufacturing', 'sales-pipeline', 'storefront', 'restaurant'],
  growth: ['campaigns', 'crm', 'analytics', 'sales-pipeline'],
};

export function getModuleById(id) {
  return PLATFORM_MODULES.find((m) => m.id === id);
}

export function modulesForNav(columnKey) {
  const ids = NAV_SOLUTIONS[columnKey] || [];
  return ids.map((id) => getModuleById(id)).filter(Boolean);
}
