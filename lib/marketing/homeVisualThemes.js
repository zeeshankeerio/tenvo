/**
 * Homepage section visuals: demo-linked heroes, accents, and Tailwind tokens.
 * Keeps marketing imagery aligned with `demoStoreGalleryMeta.js`.
 */
import { getDemoStoreHeroByDomain, getDemoStoreHref } from './demoStoreGalleryMeta.js';

/** @typedef {{ chip: string; icon: string; ring: string; gradient: string }} HomeAccentTokens */

/** @param {string} domain */
function demo(domain) {
  return {
    heroImage: getDemoStoreHeroByDomain(domain),
    href: getDemoStoreHref(domain),
    domain,
  };
}

/** Industry marquee chips below hero */
export const HOME_TRUST_CHIP_THEMES = {
  Retail: 'border-rose-200/90 bg-rose-50/95 text-rose-900',
  Pharmacy: 'border-emerald-200/90 bg-emerald-50/95 text-emerald-900',
  Restaurant: 'border-violet-200/90 bg-violet-50/95 text-violet-900',
  'Auto parts': 'border-red-200/90 bg-red-50/95 text-red-900',
  Textile: 'border-slate-300/90 bg-slate-100/95 text-slate-800',
  Electronics: 'border-indigo-200/90 bg-indigo-50/95 text-indigo-900',
  FMCG: 'border-lime-200/90 bg-lime-50/95 text-lime-900',
  Hardware: 'border-sky-200/90 bg-sky-50/95 text-sky-900',
  Salon: 'border-fuchsia-200/90 bg-fuchsia-50/95 text-fuchsia-900',
  Furniture: 'border-amber-200/90 bg-amber-50/95 text-amber-900',
  Bakery: 'border-orange-200/90 bg-orange-50/95 text-orange-900',
  Solar: 'border-yellow-200/90 bg-yellow-50/95 text-yellow-900',
};

export const HOME_TRUST_CHIPS = Object.keys(HOME_TRUST_CHIP_THEMES);

/** Product walkthrough spotlight (2x2) */
export const HOME_DEMO_SPOTLIGHT = [
  { ...demo('demo-boutique'), label: 'Boutique' },
  { ...demo('demo-supermarket'), label: 'Supermarket' },
  { ...demo('demo-pharmacy'), label: 'Pharmacy' },
  { ...demo('demo-restaurant'), label: 'Kitchen' },
];

/** Complete toolkit tabs */
export const HOME_TOOLKIT_TABS = [
  {
    id: 'inventory',
    title: 'Easy Inventory Tracking',
    subtitle: 'Track items, expiry dates, and custom bundles.',
    accent: {
      activeTab: 'border-sky-300 bg-sky-50/80 shadow-sm',
      icon: 'bg-sky-600 text-white',
      iconIdle: 'bg-sky-50 text-sky-700',
      eyebrow: 'text-sky-700',
    },
    ...demo('demo-electronics'),
  },
  {
    id: 'warehouse',
    title: 'Manage Multiple Locations',
    subtitle: 'Stock across shops, yards, and warehouses.',
    accent: {
      activeTab: 'border-indigo-300 bg-indigo-50/80 shadow-sm',
      icon: 'bg-indigo-600 text-white',
      iconIdle: 'bg-indigo-50 text-indigo-700',
      eyebrow: 'text-indigo-700',
    },
    ...demo('demo-furniture'),
  },
  {
    id: 'selling',
    title: 'Sell on your branded store',
    subtitle: 'TENVO storefront today; marketplace connectors on the roadmap.',
    accent: {
      activeTab: 'border-violet-300 bg-violet-50/80 shadow-sm',
      icon: 'bg-violet-600 text-white',
      iconIdle: 'bg-violet-50 text-violet-700',
      eyebrow: 'text-violet-700',
    },
    ...demo('demo-boutique'),
  },
  {
    id: 'fulfillment',
    title: 'Simple Shipping & Orders',
    subtitle: 'Storefront orders, packing, and hub fulfilment queue.',
    accent: {
      activeTab: 'border-orange-300 bg-orange-50/80 shadow-sm',
      icon: 'bg-orange-600 text-white',
      iconIdle: 'bg-orange-50 text-orange-700',
      eyebrow: 'text-orange-700',
    },
    ...demo('demo-supermarket'),
  },
  {
    id: 'accounting',
    title: 'Accounting & Tax Filing',
    subtitle: 'GST-aware invoices and audit-ready ledgers.',
    accent: {
      activeTab: 'border-emerald-300 bg-emerald-50/80 shadow-sm',
      icon: 'bg-emerald-600 text-white',
      iconIdle: 'bg-emerald-50 text-emerald-700',
      eyebrow: 'text-emerald-700',
    },
    ...demo('demo-pharmacy'),
  },
];

/** Industry solution cards */
export const HOME_INDUSTRY_SOLUTIONS = [
  {
    id: 'retail',
    title: 'Retail & E-commerce',
    demoLabel: 'Boutique demo',
    accent: { icon: 'bg-rose-100 text-rose-700', check: 'text-rose-600' },
    ...demo('demo-boutique'),
    description:
      'Branded storefront plus POS in one stock picture. Barcodes, checkout, and courier-ready fulfilment without juggling separate apps.',
    bullets: ['Branded web store + hub checkout', 'Barcodes and fast retail POS', 'Courier-ready fulfilment'],
  },
  {
    id: 'wholesale',
    title: 'Wholesale & Distribution',
    demoLabel: 'Supermarket demo',
    accent: { icon: 'bg-emerald-100 text-emerald-700', check: 'text-emerald-600' },
    ...demo('demo-supermarket'),
    description:
      'Trade pricing, credit limits, and multi-location stock for high-volume distributors and grocery operators.',
    bullets: ['Dynamic price lists', 'Customer credit limits', 'Multi-warehouse transfers'],
  },
  {
    id: 'bakery',
    title: 'Bakery & Food retail',
    demoLabel: 'Bakery demo',
    accent: { icon: 'bg-orange-100 text-orange-700', check: 'text-orange-600' },
    ...demo('demo-bakery'),
    description:
      'Fresh goods, celebration orders, and delivery-friendly catalog with expiry-aware inventory for bakeries and confectionery shops.',
    bullets: ['Same-day delivery zones', 'Celebration & custom orders', 'Perishable stock tracking'],
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy & Pharma',
    demoLabel: 'Pharmacy demo',
    accent: { icon: 'bg-teal-100 text-teal-700', check: 'text-teal-600' },
    ...demo('demo-pharmacy'),
    description:
      'Batch and expiry tracking, pharmacist-ready catalog, and regulated product fields for healthcare retail.',
    bullets: ['Batch and expiry tracking', 'Expiry alert workflows', 'Licensed supplier records'],
  },
];

/** Onboarding pathway */
export const HOME_ONBOARDING_PHASES = [
  {
    phase: '01',
    title: 'Pick industry preset',
    accent: 'border-brand-200/80 bg-gradient-to-br from-brand-50 to-white',
    phaseColor: 'text-brand-primary',
    description:
      'Register in minutes. Choose your vertical to pre-load SKU categories, units, tax defaults, and a day-one storefront shell.',
  },
  {
    phase: '02',
    title: 'Excel bulk upload',
    accent: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white',
    phaseColor: 'text-amber-700',
    description:
      'Import catalogs, customers, and vendors from spreadsheets with row-level validation and duplicate SKU detection.',
  },
  {
    phase: '03',
    title: 'Sync warehouses',
    accent: 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-white',
    phaseColor: 'text-sky-700',
    description:
      'Connect warehouses and retail locations, set reorder thresholds, and align stock with your public store.',
  },
  {
    phase: '04',
    title: 'Fulfill and automate',
    accent: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white',
    phaseColor: 'text-emerald-700',
    description:
      'Invite your team, assign roles, print barcodes, and run POS, storefront orders, and finance from one hub.',
  },
];

/** Honest public stats (no unverified user counts) */
export const MARKETING_HONEST_STATS = [
  { value: '62+', label: 'Industry verticals' },
  { value: '14', label: 'Live demo storefronts' },
  { value: '14-day', label: 'Free trial' },
  { value: '1 hub', label: 'Storefront, POS, and finance' },
];

/** Features page advanced cards */
export const FEATURE_PAGE_CARDS = [
  {
    id: 'inventory',
    title: 'Inventory & warehouses',
    description:
      'Core stock control with adjustments, reservations on key flows, and multi-warehouse support on Professional+. Batch and serial tracking when your plan and domain enable them.',
    features: [
      'Product catalog with images & Excel import',
      'Multi-warehouse (plan limits apply)',
      'Inter-warehouse transfers',
      'Batch & serial tracking (Professional+)',
      'Low-stock alerts & smart restock signals',
    ],
    demoLabel: 'Electronics demo',
    accent: {
      card: 'border-sky-200/80 bg-gradient-to-br from-sky-50/60 to-white',
      check: 'text-sky-600',
    },
    ...demo('demo-electronics'),
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing & BOM',
    description:
      'Bill of materials and production orders with material reservations through InventoryService. Advanced shop-floor MES features are on the roadmap.',
    features: [
      'Multi-level BOM (Business+)',
      'Production / work orders',
      'Material reservation on start',
      'Manufacturing cost tracking (basic)',
      'Shop-floor scheduling (roadmap)',
    ],
    demoLabel: 'Furniture demo',
    accent: {
      card: 'border-slate-300/80 bg-gradient-to-br from-slate-100/80 to-white',
      check: 'text-slate-700',
    },
    ...demo('demo-furniture'),
  },
  {
    id: 'accounting',
    title: 'Finance & general ledger',
    description:
      'Journal entries, chart of accounts, and finance hub with posting hooks from invoices and POS. Fiscal periods unlock on Professional+.',
    features: [
      'Double-entry journal entries',
      'Chart of accounts & GL hub',
      'Fiscal periods (Professional+)',
      'Multi-currency manual rates (Business+)',
      'Bank reconciliation UI (manual)',
    ],
    demoLabel: 'Pharmacy demo',
    accent: {
      card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white',
      check: 'text-emerald-600',
    },
    ...demo('demo-pharmacy'),
  },
  {
    id: 'compliance',
    title: 'Pakistan tax & compliance',
    description:
      'Configure GST/sales tax, use Pakistani tax tools, and export audit-friendly summaries. Live FBR IRIS transmission is not yet wired - we prepare accurate records for your filing workflow.',
    features: [
      'GST / sales tax configuration',
      'Provincial rate support in config',
      'Tax summaries & export-oriented reports',
      'Audit trail on financial documents',
      'FBR IRIS live sync (roadmap)',
    ],
    demoLabel: 'Pharmacy demo',
    accent: {
      card: 'border-teal-200/80 bg-gradient-to-br from-teal-50/70 to-white',
      check: 'text-teal-600',
    },
    ...demo('demo-pharmacy'),
  },
  {
    id: 'storefront',
    title: 'Branded storefront & checkout',
    description:
      'Launch a customer-facing shop under your business domain with catalog, cart, checkout, and an order hub in the same workspace as inventory and POS.',
    features: [
      'Public catalog & product pages',
      'Cart & checkout (COD + Stripe when configured)',
      'Storefront order queue in the hub',
      'Shared product catalog with POS',
      'Policies, FAQs, and contact pages',
    ],
    demoLabel: 'Boutique demo',
    accent: {
      card: 'border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white',
      check: 'text-rose-600',
    },
    ...demo('demo-boutique'),
  },
  {
    id: 'pos-hospitality',
    title: 'POS, tables & kitchen coordination',
    description:
      'Retail POS with sessions, terminals, product images, and receipt printing. Restaurant flows and kitchen display on supported plans and domains.',
    features: [
      'Retail POS checkout (Starter+)',
      'Barcode / SKU lookup at counter',
      'Restaurant table-service POS',
      'Kitchen display (Business+, KDS flag)',
      'Browser thermal receipts (not ESC/POS hardware)',
    ],
    demoLabel: 'Restaurant demo',
    accent: {
      card: 'border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white',
      check: 'text-violet-600',
    },
    ...demo('demo-restaurant'),
  },
  {
    id: 'analytics',
    title: 'Analytics & AI',
    description:
      'Operational dashboards, custom report layouts, demand forecasting signals, and AI Business Analyst when your plan and AI keys are enabled.',
    features: [
      'Domain dashboards & KPI portlets',
      'Report builder & standard reports',
      'Demand forecast & smart restock (Business+)',
      'AI Business Analyst chat (env + plan)',
      'Guided automation with human approval (expanding)',
    ],
    demoLabel: 'Electronics demo',
    accent: {
      card: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white',
      check: 'text-indigo-600',
    },
    ...demo('demo-electronics'),
  },
];

/** Industries page benefit grid */
export const INDUSTRY_PAGE_BENEFITS = [
  {
    id: 'defaults',
    title: 'Pre-configured defaults',
    description:
      'Start with vertical-aware units, sample products, and dashboard layouts tuned to your category.',
    icon: 'Settings',
    accent: {
      card: 'border-sky-200/80 bg-gradient-to-br from-sky-50/70 to-white',
      icon: 'bg-sky-100 text-sky-700 border-sky-200/60',
    },
  },
  {
    id: 'compliance',
    title: 'Tax & compliance context',
    description:
      'Pakistan-first tax configuration and regional standards - with honest scope on live FBR filing (roadmap).',
    icon: 'ShieldCheck',
    accent: {
      card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white',
      icon: 'bg-emerald-100 text-emerald-700 border-emerald-200/60',
    },
  },
  {
    id: 'onboarding',
    title: 'Faster onboarding',
    description:
      'Register, import from Excel, and open your hub in days - not a six-month IT project.',
    icon: 'Zap',
    accent: {
      card: 'border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white',
      icon: 'bg-amber-100 text-amber-700 border-amber-200/60',
    },
  },
  {
    id: 'terminology',
    title: 'Industry terminology',
    description:
      'Use the language of your industry. Labels, reports, and workflows use familiar terms.',
    icon: 'MessageSquare',
    accent: {
      card: 'border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white',
      icon: 'bg-violet-100 text-violet-700 border-violet-200/60',
    },
  },
  {
    id: 'reports',
    title: 'Best practice reports',
    description:
      'Industry-standard reports and KPIs are ready to use out of the box.',
    icon: 'BarChart3',
    accent: {
      card: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white',
      icon: 'bg-indigo-100 text-indigo-700 border-indigo-200/60',
    },
  },
  {
    id: 'updates',
    title: 'Continuous updates',
    description:
      'Stay current with industry changes. We update compliance rules and best practices regularly.',
    icon: 'RefreshCw',
    accent: {
      card: 'border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white',
      icon: 'bg-rose-100 text-rose-700 border-rose-200/60',
    },
  },
];

/** Why TENVO compare pillars */
export const WHY_TENVO_COMPARE = [
  {
    id: 'storefront',
    title: 'Versus storefront-only platforms',
    body:
      'Beautiful checkout is table stakes. TENVO adds depth where operators feel pain: stock truth across channels, cost visibility, and local regulatory context - without exporting everything to a consultant.',
    icon: 'Store',
    accent: {
      card: 'border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white',
      icon: 'bg-rose-600 text-white',
      check: 'text-rose-600',
    },
    ...demo('demo-boutique'),
  },
  {
    id: 'bundles',
    title: 'Versus sprawling app bundles',
    body:
      'More icons on a home screen do not equal integration. TENVO focuses on a coherent core - inventory, orders, POS, finance, and compliance - so your team is not the glue between silos.',
    icon: 'Layers',
    accent: {
      card: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white',
      icon: 'bg-indigo-600 text-white',
      check: 'text-indigo-600',
    },
    ...demo('demo-supermarket'),
  },
  {
    id: 'intelligent',
    title: 'What "intelligent" means here',
    body:
      'Automation that respects your policies: smarter replenishment signals, guided data cleanup, and assistants that prepare drafts for humans to approve - never black-box decisions on your revenue.',
    icon: 'Sparkles',
    accent: {
      card: 'border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white',
      icon: 'bg-violet-600 text-white',
      check: 'text-violet-600',
    },
    ...demo('demo-electronics'),
  },
];

/** Marketing CRM solution pillars */
export const MARKETING_CRM_PILLARS = [
  {
    id: 'campaigns',
    title: 'Campaigns & marketing',
    body:
      'Run promotions and customer journeys without exporting lists to a separate email tool. Segments and offers stay tied to real purchase history, storefront activity, and POS.',
    bullets: [
      'Promotion windows and outreach hooks',
      'Business+ when campaigns flag is enabled',
      'Same customer record as invoices & POS',
    ],
    icon: 'Megaphone',
    accent: {
      card: 'border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white',
      icon: 'bg-violet-600 text-white',
      check: 'text-violet-600',
    },
  },
  {
    id: 'crm',
    title: 'Loyalty & CRM',
    body:
      'Reward repeat buyers, track preferences, and give frontline staff context at checkout or on the phone. Designed for retail and hospitality teams who outgrow spreadsheets but do not want yet another disconnected CRM.',
    bullets: [
      'Loyalty alongside POS and web orders',
      'Customer 360 tied to sales history',
      'Works with your existing roles & permissions',
    ],
    icon: 'Heart',
    accent: {
      card: 'border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white',
      icon: 'bg-rose-600 text-white',
      check: 'text-rose-600',
    },
  },
  {
    id: 'analytics',
    title: 'Analytics & AI',
    body:
      'Dashboards and reports draw from one ledger: inventory, orders, payments, and tax. Ask better questions without stitching exports from five silos.',
    bullets: [
      'Operational and financial signals together',
      'Roadmap: guided insights with human approval',
      'Drill from summary to underlying documents',
    ],
    icon: 'Brain',
    accent: {
      card: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-white',
      icon: 'bg-indigo-600 text-white',
      check: 'text-indigo-600',
    },
  },
];

/** Security clusters (honest status labels) */
export const HOME_SECURITY_CLUSTERS = [
  {
    id: 'platform',
    title: 'Platform security',
    accent: 'border-slate-200/90 bg-gradient-to-br from-slate-50 to-white',
    items: [
      { title: 'SSL encryption', desc: 'HTTPS in transit', status: 'shipped' },
      { title: 'Cloud hosting', desc: 'Managed infrastructure', status: 'shipped' },
      { title: 'SOC 2', desc: 'Type II planned', status: 'roadmap' },
    ],
  },
  {
    id: 'compliance',
    title: 'Tax and compliance',
    accent: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-white',
    items: [
      { title: 'GST configuration', desc: 'Sales tax on invoices', status: 'shipped' },
      { title: 'Audit-ready ledgers', desc: 'Journal and GL posting', status: 'shipped' },
      { title: 'FBR IRIS live sync', desc: 'On the roadmap', status: 'roadmap' },
    ],
  },
  {
    id: 'privacy',
    title: 'Payments and privacy',
    accent: 'border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 to-white',
    items: [
      { title: 'Stripe checkout', desc: 'SaaS billing', status: 'shipped' },
      { title: 'PCI scope', desc: 'Via payment partners', status: 'partial' },
      { title: 'GDPR-ready exports', desc: 'Data portability', status: 'partial' },
    ],
  },
];
